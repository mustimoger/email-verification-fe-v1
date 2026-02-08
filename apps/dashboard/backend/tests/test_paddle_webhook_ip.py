import pytest
from fastapi import HTTPException

from app.paddle.config import get_paddle_config
from app.paddle.webhook import verify_ip_allowlist, _resolve_client_ip


def _load_config(
    monkeypatch,
    *,
    trust_proxy: bool,
    header_name: str | None = None,
    header_format: str | None = None,
    hops: int | None = None,
    allowlist: str | None = None,
):
    monkeypatch.setenv("PADDLE_STATUS", "sandbox")
    monkeypatch.setenv("PADDLE_BILLING_SANDBOX_API_URL", "https://sandbox-api.paddle.com")
    monkeypatch.setenv("PADDLE_BILLING_SANDBOX_API_KEY", "pdl_sdbx_apikey_test")
    monkeypatch.setenv("PADDLE_BILLING_SANDBOX_WEBHOOK_SECRET", "test_webhook_secret")
    monkeypatch.setenv("PADDLE_WEBHOOK_MAX_VARIANCE_SECONDS", "5")
    monkeypatch.setenv("PADDLE_WEBHOOK_TRUST_PROXY", "true" if trust_proxy else "false")
    monkeypatch.setenv("PADDLE_ADDRESS_MODE", "checkout")
    if allowlist is not None:
        monkeypatch.setenv("PADDLE_SANDBOX_IPS", allowlist)
    if trust_proxy:
        if header_name is not None:
            monkeypatch.setenv("PADDLE_WEBHOOK_FORWARDED_HEADER", header_name)
        if header_format is not None:
            monkeypatch.setenv("PADDLE_WEBHOOK_FORWARDED_FORMAT", header_format)
        if hops is not None:
            monkeypatch.setenv("PADDLE_WEBHOOK_PROXY_HOPS", str(hops))
    get_paddle_config.cache_clear()
    return get_paddle_config()


def test_resolve_client_ip_direct(monkeypatch):
    config = _load_config(monkeypatch, trust_proxy=False)
    resolved = _resolve_client_ip(config, "203.0.113.10", None)
    assert resolved == "203.0.113.10"


def test_resolve_client_ip_xff(monkeypatch):
    config = _load_config(
        monkeypatch,
        trust_proxy=True,
        header_name="X-Forwarded-For",
        header_format="x_forwarded_for",
        hops=1,
    )
    headers = {"X-Forwarded-For": "203.0.113.5, 10.0.0.1"}
    resolved = _resolve_client_ip(config, "10.0.0.1", headers)
    assert resolved == "203.0.113.5"


def test_resolve_client_ip_forwarded(monkeypatch):
    config = _load_config(
        monkeypatch,
        trust_proxy=True,
        header_name="Forwarded",
        header_format="forwarded",
        hops=1,
    )
    headers = {"Forwarded": "for=203.0.113.7;proto=https, for=10.0.0.1"}
    resolved = _resolve_client_ip(config, "10.0.0.1", headers)
    assert resolved == "203.0.113.7"


def test_allowlist_blocks_unknown_ip(monkeypatch):
    config = _load_config(monkeypatch, trust_proxy=False, allowlist="203.0.113.10")
    with pytest.raises(HTTPException) as exc:
        verify_ip_allowlist(config, "203.0.113.11")
    assert exc.value.status_code == 403


def test_allowlist_allows_cidr(monkeypatch):
    config = _load_config(monkeypatch, trust_proxy=False, allowlist="203.0.113.0/24")
    verify_ip_allowlist(config, "203.0.113.11")


def test_allowlist_blocks_outside_cidr(monkeypatch):
    config = _load_config(monkeypatch, trust_proxy=False, allowlist="203.0.113.0/24")
    with pytest.raises(HTTPException) as exc:
        verify_ip_allowlist(config, "203.0.114.1")
    assert exc.value.status_code == 403


def test_allowlist_skips_invalid_entries(monkeypatch):
    config = _load_config(monkeypatch, trust_proxy=False, allowlist="203.0.113.0/24,not-an-ip")
    verify_ip_allowlist(config, "203.0.113.11")


def test_allowlist_invalid_only_raises(monkeypatch):
    config = _load_config(monkeypatch, trust_proxy=False, allowlist="not-an-ip")
    with pytest.raises(HTTPException) as exc:
        verify_ip_allowlist(config, "203.0.113.11")
    assert exc.value.status_code == 500
