import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import api_keys as api_keys_module
from app.api.api_keys import BootstrapKeyResponse, router
from app.clients.external import ExternalAPIClient
from app.core.auth import AuthContext


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("EMAIL_API_KEY", "key")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


def _build_app(monkeypatch, *, cached_key_plain: bool):
    app = FastAPI()
    app.include_router(router)

    def fake_user():
        return AuthContext(user_id="user-bootstrap", claims={}, token="t")

    class FakeClient(ExternalAPIClient):  # type: ignore[misc]
        def __init__(self):
            # ExternalAPIClient requires base_url/api_key but we bypass network calls; provide dummies.
            super().__init__(base_url="https://api.test", api_key="key")

        async def create_api_key(self, name: str):
            class Resp:
                id = "new-key-id"
                key = "secret-value"
            return Resp()

    def fake_get_cached_key_by_name(user_id, name):
        if cached_key_plain:
            return {"key_id": "existing-id", "key_plain": "existing-secret"}
        return None

    async def fake_resolve_user_api_key(user_id: str, desired_name: str, master_client):
        return "secret-value", "new-key-id"

    monkeypatch.setattr(api_keys_module, "get_cached_key_by_name", fake_get_cached_key_by_name)
    monkeypatch.setattr(api_keys_module, "resolve_user_api_key", fake_resolve_user_api_key)
    monkeypatch.setattr(api_keys_module, "record_usage", lambda *args, **kwargs: None)
    app.dependency_overrides[api_keys_module.get_current_user] = fake_user
    app.dependency_overrides[api_keys_module.get_external_api_client] = lambda: FakeClient()
    return app


@pytest.mark.parametrize("cached_key_plain", [True, False])
def test_bootstrap_dashboard_key(monkeypatch, cached_key_plain):
    app = _build_app(monkeypatch, cached_key_plain=cached_key_plain)
    client = TestClient(app)

    resp = client.post("/api/api-keys/bootstrap")
    assert resp.status_code == 200
    data = resp.json()
    parsed = BootstrapKeyResponse(**data)
    if cached_key_plain:
        assert parsed.key_id == "existing-id"
    else:
        assert parsed.key_id == "new-key-id"
    assert parsed.name == api_keys_module.INTERNAL_DASHBOARD_KEY_NAME
    if cached_key_plain:
        assert parsed.created is False
    else:
        assert parsed.created is True
