"""
Paddle Billing webhook verification helpers.

Validates IP allowlist and signature (HMAC-SHA256) using the active environment
webhook secret. Assumes header format like: "ts=<timestamp>;v1=<signature>".
String-to-sign: "{ts}:{raw_body}".
"""

import hmac
import logging
from hashlib import sha256
from typing import Dict, Optional

from fastapi import HTTPException, status

from .config import PaddleConfig, get_paddle_config

logger = logging.getLogger(__name__)


def _parse_signature_header(header_value: str) -> Dict[str, str]:
    parts = {}
    for segment in header_value.split(";"):
        if "=" in segment:
            k, v = segment.split("=", 1)
            parts[k.strip()] = v.strip()
    return parts


def verify_ip_allowlist(config: PaddleConfig, remote_ip: Optional[str]):
    if not remote_ip:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing remote IP")
    allowed = (
        config.production_ip_allowlist
        if config.status == "production"
        else config.sandbox_ip_allowlist
    )
    if allowed and remote_ip not in allowed:
        logger.warning("paddle.webhook.ip_blocked", extra={"ip": remote_ip, "env": config.status})
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="IP not allowed")


def verify_signature(config: PaddleConfig, raw_body: bytes, signature_header: Optional[str]):
    if not signature_header:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Paddle-Signature header")
    parts = _parse_signature_header(signature_header)
    ts = parts.get("ts")
    signature = parts.get("v1") or parts.get("h1") or parts.get("sig")
    if not ts or not signature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Paddle-Signature header")
    secret = config.active_environment.webhook_secret
    if not secret:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook secret not configured")
    message = f"{ts}:{raw_body.decode('utf-8')}".encode("utf-8")
    computed = hmac.new(secret.encode("utf-8"), message, sha256).hexdigest()
    if not hmac.compare_digest(computed, signature):
        logger.warning("paddle.webhook.signature_mismatch", extra={"ts": ts})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")


def verify_webhook(raw_body: bytes, signature_header: Optional[str], remote_ip: Optional[str]):
    config = get_paddle_config()
    verify_ip_allowlist(config, remote_ip)
    verify_signature(config, raw_body, signature_header)
