import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import api_keys as api_keys_module
from app.api.api_keys import BootstrapKeyResponse, router
from app.core.auth import AuthContext


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


def _build_app(monkeypatch, cached_row=None):
    app = FastAPI()
    app.include_router(router)

    def fake_user():
        return AuthContext(user_id="user-bootstrap", claims={}, token="t")

    monkeypatch.setattr(api_keys_module, "get_cached_key_by_name", lambda user_id, name: cached_row)
    monkeypatch.setattr(api_keys_module, "record_usage", lambda *args, **kwargs: None)
    app.dependency_overrides[api_keys_module.get_current_user] = fake_user
    return app


def test_bootstrap_returns_cached_when_present(monkeypatch):
    app = _build_app(monkeypatch, cached_row={"key_id": "existing-id", "key_plain": None})
    client = TestClient(app)

    resp = client.post("/api/api-keys/bootstrap")
    assert resp.status_code == 200
    data = resp.json()
    parsed = BootstrapKeyResponse(**data)
    assert parsed.key_id == "existing-id"
    assert parsed.name == api_keys_module.INTERNAL_DASHBOARD_KEY_NAME
    assert parsed.created is False
    assert parsed.skipped is True
    assert parsed.error


def test_bootstrap_without_cache(monkeypatch):
    app = _build_app(monkeypatch, cached_row=None)
    client = TestClient(app)

    resp = client.post("/api/api-keys/bootstrap")
    assert resp.status_code == 200
    data = resp.json()
    parsed = BootstrapKeyResponse(**data)
    assert parsed.key_id is None
    assert parsed.created is False
    assert parsed.skipped is True
    assert parsed.error
