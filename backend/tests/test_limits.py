from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import limits as limits_module
from app.api.limits import router
from app.core.auth import AuthContext


def _build_app():
    app = FastAPI()
    app.include_router(router)
    return app


def test_limits_returns_runtime_values(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    monkeypatch.setenv("MANUAL_MAX_EMAILS", "25")
    monkeypatch.setenv("UPLOAD_MAX_MB", "10")

    app = _build_app()

    def fake_user():
        return AuthContext(user_id="user-limits", claims={}, token="t")

    app.dependency_overrides[limits_module.get_current_user] = fake_user

    client = TestClient(app)
    resp = client.get("/api/limits")
    assert resp.status_code == 200
    data = resp.json()
    assert data["manual_max_emails"] == 25
    assert data["upload_max_mb"] == 10
