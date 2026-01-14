import pytest
from fastapi import FastAPI
import httpx

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.core.auth import AuthContext


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    monkeypatch.setenv("MANUAL_MAX_EMAILS", "25")
    monkeypatch.setenv("LATEST_UPLOADS_LIMIT", "6")


def _build_app(monkeypatch):
    app = FastAPI()
    app.include_router(router)

    async def fake_user():
        return AuthContext(user_id="user-latest", claims={}, token="t")

    monkeypatch.setattr(tasks_module, "record_usage", lambda *args, **kwargs: None)
    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    return app


@pytest.mark.anyio
async def test_latest_uploads_returns_no_content(monkeypatch):
    app = _build_app(monkeypatch)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks/latest-uploads")
        assert resp.status_code == 204
        assert resp.text == ""
