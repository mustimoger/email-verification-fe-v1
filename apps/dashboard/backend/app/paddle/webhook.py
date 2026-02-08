"""
Paddle Billing webhook verification helpers.

Validates IP allowlist and signature (HMAC-SHA256) using the active environment
webhook secret. Header format uses Paddle's official `Paddle-Signature` scheme:
"ts=<timestamp>;h1=<signature>[;h1=<signature>]".
String-to-sign: "{ts}:{raw_body}".
"""

import hmac
import ipaddress
import logging
from hashlib import sha256
from time import time
from typing import List, Mapping, Optional, Tuple

from fastapi import HTTPException, status

from .config import PaddleConfig, get_paddle_config

logger = logging.getLogger(__name__)


def _parse_signature_header(header_value: str) -> Tuple[int, List[str]]:
    timestamp = None
    signatures: List[str] = []
    for segment in header_value.split(";"):
        if "=" not in segment:
            continue
        key, value = segment.split("=", 1)
        key = key.strip()
        value = value.strip()
        if key == "ts":
            timestamp = value
        elif key == "h1":
            if value:
                signatures.append(value)
        else:
            raise ValueError("Unrecognized Paddle-Signature key")
    if not timestamp or not signatures:
        raise ValueError("Missing Paddle-Signature components")
    try:
        return int(timestamp), signatures
    except ValueError as exc:
        raise ValueError("Invalid Paddle-Signature timestamp") from exc


def _parse_forwarded_entries(header_value: str) -> List[str]:
    entries = []
    for entry in header_value.split(","):
        entry = entry.strip()
        if not entry:
            continue
        entries.append(entry)
    return entries


def _extract_forwarded_for(entry: str) -> Optional[str]:
    for param in entry.split(";"):
        if "=" not in param:
            continue
        key, value = param.split("=", 1)
        if key.strip().lower() == "for":
            return value.strip()
    return None


def _strip_port(value: str) -> str:
    candidate = value.strip().strip('"')
    if candidate.startswith("["):
        end = candidate.find("]")
        if end > 0:
            return candidate[1:end]
    try:
        ipaddress.ip_address(candidate)
        return candidate
    except ValueError:
        if ":" in candidate:
            host, _, _ = candidate.rpartition(":")
            return host
    return candidate


def _extract_client_ip_from_forwarded(header_value: str) -> List[str]:
    ips: List[str] = []
    for entry in _parse_forwarded_entries(header_value):
        forwarded_for = _extract_forwarded_for(entry)
        if forwarded_for:
            ips.append(_strip_port(forwarded_for))
    return ips


def _extract_client_ip_from_xff(header_value: str) -> List[str]:
    return [part.strip() for part in header_value.split(",") if part.strip()]


def _resolve_client_ip(
    config: PaddleConfig,
    remote_ip: Optional[str],
    headers: Optional[Mapping[str, str]],
) -> str:
    if not config.webhook_trust_proxy:
        if not remote_ip:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing remote IP")
        return remote_ip
    if headers is None:
        logger.error("paddle.webhook.headers_missing", extra={"env": config.status})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook headers missing")
    header_name = config.webhook_forwarded_header
    if not header_name:
        logger.error("paddle.webhook.forwarded_header_not_configured", extra={"env": config.status})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Forwarded header not configured")
    header_value = headers.get(header_name)
    if not header_value:
        logger.warning("paddle.webhook.forwarded_header_missing", extra={"header": header_name})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Forwarded header missing")
    if config.webhook_forwarded_format == "forwarded":
        forwarded_ips = _extract_client_ip_from_forwarded(header_value)
    else:
        forwarded_ips = _extract_client_ip_from_xff(header_value)
    if not forwarded_ips:
        logger.warning("paddle.webhook.forwarded_header_invalid", extra={"header": header_name})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Forwarded header invalid")
    hops = config.webhook_proxy_hops
    if not hops or hops < 1:
        logger.error("paddle.webhook.proxy_hops_invalid", extra={"value": hops})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Proxy hops not configured")
    index = len(forwarded_ips) - (hops + 1)
    if index < 0:
        logger.warning(
            "paddle.webhook.forwarded_hops_mismatch",
            extra={"hops": hops, "header": header_name, "count": len(forwarded_ips)},
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Forwarded header hops mismatch")
    client_ip = forwarded_ips[index]
    try:
        ipaddress.ip_address(client_ip)
    except ValueError as exc:
        logger.warning("paddle.webhook.forwarded_ip_invalid", extra={"ip": client_ip})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Forwarded IP invalid") from exc
    logger.info(
        "paddle.webhook.client_ip_resolved",
        extra={"ip": client_ip, "header": header_name, "hops": hops},
    )
    return client_ip


def verify_ip_allowlist(config: PaddleConfig, remote_ip: str):
    allowed = (
        config.production_ip_allowlist
        if config.status == "production"
        else config.sandbox_ip_allowlist
    )
    if not allowed:
        return
    parsed_allowlist: List[ipaddress.IPv4Network | ipaddress.IPv6Network] = []
    invalid_entries: List[str] = []
    for entry in allowed:
        try:
            parsed_allowlist.append(ipaddress.ip_network(entry, strict=False))
        except ValueError:
            invalid_entries.append(entry)
    if invalid_entries:
        logger.warning(
            "paddle.webhook.allowlist_invalid_entries",
            extra={"entries": invalid_entries, "env": config.status},
        )
    if not parsed_allowlist:
        logger.error("paddle.webhook.allowlist_empty", extra={"env": config.status})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="IP allowlist invalid")
    try:
        remote_address = ipaddress.ip_address(remote_ip)
    except ValueError as exc:
        logger.warning("paddle.webhook.remote_ip_invalid", extra={"ip": remote_ip})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Remote IP invalid") from exc
    for network in parsed_allowlist:
        if remote_address in network:
            return
    logger.warning("paddle.webhook.ip_blocked", extra={"ip": remote_ip, "env": config.status})
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="IP not allowed")


def verify_signature(config: PaddleConfig, raw_body: bytes, signature_header: Optional[str]):
    if not signature_header:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Paddle-Signature header")
    try:
        timestamp, signatures = _parse_signature_header(signature_header)
    except ValueError as exc:
        logger.warning("paddle.webhook.signature_header_invalid", extra={"error": str(exc)})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Paddle-Signature header") from exc
    secret = config.active_environment.webhook_secret
    if not secret:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook secret not configured")
    max_variance = config.webhook_max_variance_seconds
    if max_variance is None:
        logger.error("paddle.webhook.max_variance_missing")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook max variance not configured",
        )
    if max_variance > 0:
        now = int(time())
        delta_seconds = now - int(timestamp)
        if abs(delta_seconds) > max_variance:
            if delta_seconds < 0:
                logger.warning(
                    "paddle.webhook.signature_timestamp_future",
                    extra={"ts": timestamp, "max_variance_seconds": max_variance, "delta_seconds": delta_seconds},
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Signature timestamp in future",
                )
            logger.warning(
                "paddle.webhook.signature_timestamp_expired",
                extra={"ts": timestamp, "max_variance_seconds": max_variance, "delta_seconds": delta_seconds},
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Signature timestamp expired")
    try:
        raw_body_str = raw_body.decode("utf-8")
    except UnicodeDecodeError as exc:
        logger.warning("paddle.webhook.body_decode_failed", extra={"error": str(exc)})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook body encoding") from exc
    message = f"{timestamp}:{raw_body_str}".encode("utf-8")
    computed = hmac.new(secret.encode("utf-8"), message, sha256).hexdigest()
    for signature in signatures:
        if hmac.compare_digest(computed, signature):
            return
    logger.warning("paddle.webhook.signature_mismatch", extra={"ts": timestamp})
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")


def verify_webhook(
    raw_body: bytes,
    signature_header: Optional[str],
    remote_ip: Optional[str],
    headers: Optional[Mapping[str, str]] = None,
):
    config = get_paddle_config()
    resolved_ip = _resolve_client_ip(config, remote_ip, headers)
    verify_ip_allowlist(config, resolved_ip)
    verify_signature(config, raw_body, signature_header)
