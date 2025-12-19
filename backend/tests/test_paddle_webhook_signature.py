import hmac
import time
from hashlib import sha256

import pytest
from fastapi import HTTPException

from app.paddle.config import get_paddle_config
from app.paddle.webhook import verify_signature


def _load_config(monkeypatch, max_variance_seconds: int):
    monkeypatch.setenv("PADDLE_STATUS", "sandbox")
    monkeypatch.setenv("PADDLE_BILLING_SANDBOX_API_URL", "https://sandbox-api.paddle.com")
    monkeypatch.setenv("PADDLE_BILLING_SANDBOX_API_KEY", "pdl_sdbx_apikey_test")
    monkeypatch.setenv("PADDLE_BILLING_SANDBOX_WEBHOOK_SECRET", "test_webhook_secret")
    monkeypatch.setenv("PADDLE_WEBHOOK_MAX_VARIANCE_SECONDS", str(max_variance_seconds))
    monkeypatch.setenv("PADDLE_WEBHOOK_TRUST_PROXY", "false")
    get_paddle_config.cache_clear()
    return get_paddle_config()


def _sign_payload(secret: str, timestamp: int, raw_body: str) -> str:
    message = f"{timestamp}:{raw_body}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), message, sha256).hexdigest()


def test_verify_signature_accepts_valid_signature(monkeypatch):
    config = _load_config(monkeypatch, max_variance_seconds=60)
    raw_body = '{"event":"test"}'
    timestamp = int(time.time())
    signature = _sign_payload("test_webhook_secret", timestamp, raw_body)
    header = f"ts={timestamp};h1={signature}"

    verify_signature(config, raw_body.encode("utf-8"), header)


def test_verify_signature_rejects_invalid_signature(monkeypatch):
    config = _load_config(monkeypatch, max_variance_seconds=60)
    raw_body = '{"event":"test"}'
    timestamp = int(time.time())
    header = f"ts={timestamp};h1=invalid"

    with pytest.raises(HTTPException) as exc:
        verify_signature(config, raw_body.encode("utf-8"), header)
    assert exc.value.status_code == 400


def test_verify_signature_accepts_any_matching_signature(monkeypatch):
    config = _load_config(monkeypatch, max_variance_seconds=60)
    raw_body = '{"event":"test"}'
    timestamp = int(time.time())
    signature = _sign_payload("test_webhook_secret", timestamp, raw_body)
    header = f"ts={timestamp};h1=invalid;h1={signature}"

    verify_signature(config, raw_body.encode("utf-8"), header)


def test_verify_signature_rejects_expired_timestamp(monkeypatch):
    config = _load_config(monkeypatch, max_variance_seconds=1)
    raw_body = '{"event":"test"}'
    timestamp = int(time.time()) - 10
    signature = _sign_payload("test_webhook_secret", timestamp, raw_body)
    header = f"ts={timestamp};h1={signature}"

    with pytest.raises(HTTPException) as exc:
        verify_signature(config, raw_body.encode("utf-8"), header)
    assert exc.value.status_code == 400
