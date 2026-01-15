import pytest
from fastapi import FastAPI
import httpx

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients import external as external_module
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

    async def fake_user():
        return AuthContext(user_id="user-credits", claims={}, token="t")

    class FakeClient:
        async def verify_email(self, email: str):
            return external_module.VerifyEmailResponse(email=email, status="ok", validated_at="2024-01-01T00:00:00Z")

        async def get_task_detail(self, task_id: str):
            return external_module.TaskDetailResponse(id=task_id)

    async def fake_client():
        return FakeClient()

    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = fake_client
    return app


@pytest.mark.anyio
async def test_verify_succeeds_without_local_credit_enforcement(monkeypatch):
    app = _build_app(monkeypatch)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/verify", json={"email": "alpha@example.com"})
        assert resp.status_code == 200
        assert resp.json()["email"] == "alpha@example.com"


@pytest.mark.anyio
async def test_task_detail_succeeds_without_local_credit_enforcement(monkeypatch):
    app = _build_app(monkeypatch)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        task_id = "11111111-1111-1111-1111-111111111111"
        resp = await client.get(f"/api/tasks/{task_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == task_id
