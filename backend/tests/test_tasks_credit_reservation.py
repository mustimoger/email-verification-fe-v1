import pytest
from fastapi import FastAPI
import httpx

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import TaskDetailResponse, TaskResponse
from app.core.auth import AuthContext


def _build_app(monkeypatch, fake_client, usage_calls):
    app = FastAPI()
    app.include_router(router)

    async def fake_user():
        return AuthContext(user_id="user-reserve", claims={}, token="t", role="user")

    async def fake_client_override():
        return fake_client

    def _record_usage(user_id, path, count, api_key_id=None):
        usage_calls.append({"user_id": user_id, "path": path, "count": count, "api_key_id": api_key_id})

    monkeypatch.setattr(tasks_module, "record_usage", _record_usage)

    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = fake_client_override
    return app


def _set_env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


@pytest.mark.anyio
async def test_tasks_create_calls_external_client(monkeypatch):
    _set_env(monkeypatch)
    called = {"create": False}
    usage_calls = []

    class FakeClient:
        async def create_task(self, emails, webhook_url=None):
            called["create"] = True
            return TaskResponse(id="task-1", email_count=len(emails))

    app = _build_app(monkeypatch, FakeClient(), usage_calls)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/tasks", json={"emails": ["a@test.com", "b@test.com"]})
        assert resp.status_code == 200
        assert called["create"] is True

    assert {"path": "/tasks", "count": 2, "api_key_id": None, "user_id": "user-reserve"} in usage_calls


@pytest.mark.anyio
async def test_tasks_detail_returns_external_payload(monkeypatch):
    _set_env(monkeypatch)
    task_id = "11111111-1111-1111-1111-111111111111"
    usage_calls = []

    class FakeClient:
        async def get_task_detail(self, task_id: str):
            return TaskDetailResponse(id=task_id)

    app = _build_app(monkeypatch, FakeClient(), usage_calls)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/tasks/{task_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == task_id

    assert {"path": "/tasks/{id}", "count": 1, "api_key_id": None, "user_id": "user-reserve"} in usage_calls
