import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import api_keys as api_keys_module
from app.api.api_keys import router
from app.clients.external import ExternalAPIClient, ExternalAPIError
from app.core.auth import AuthContext


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


def _build_app(monkeypatch):
    app = FastAPI()
    app.include_router(router)

    def fake_user():
        return AuthContext(user_id="user-cache", claims={}, token="t")

    class FakeClient(ExternalAPIClient):  # type: ignore[misc]
        def __init__(self):
            super().__init__(base_url="https://api.test", bearer_token="key")

        async def list_api_keys(self, user_id=None, start=None, end=None):
            raise ExternalAPIError(
                status_code=503,
                message="auth unavailable",
                details={"error": "Authentication service unavailable"},
            )
    app.dependency_overrides[api_keys_module.get_current_user] = fake_user
    app.dependency_overrides[api_keys_module.get_user_external_client] = lambda: FakeClient()
    return app


def test_list_api_keys_propagates_external_error(monkeypatch):
    app = _build_app(monkeypatch)
    client = TestClient(app)

    resp = client.get("/api/api-keys")
    assert resp.status_code == 503
