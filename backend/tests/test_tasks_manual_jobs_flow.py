import pytest
from fastapi import FastAPI
import httpx

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import TaskEmailJob, TaskJobsResponse, TaskResponse
from app.core.auth import AuthContext


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


def _build_app(monkeypatch, fake_client, usage_calls):
    app = FastAPI()
    app.include_router(router)

    async def fake_user():
        return AuthContext(user_id="user-manual", claims={}, token="t", role="user")

    async def fake_client_override():
        return fake_client

    def _record_usage(user_id, path, count, api_key_id=None):
        usage_calls.append({"user_id": user_id, "path": path, "count": count, "api_key_id": api_key_id})

    monkeypatch.setattr(tasks_module, "record_usage", _record_usage)

    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = fake_client_override
    return app


@pytest.mark.anyio
async def test_manual_task_create_and_jobs_poll(monkeypatch):
    task_id = "11111111-1111-1111-1111-111111111111"
    emails = ["alpha@example.com", "beta@example.com"]

    class FakeClient:
        async def create_task(self, emails, webhook_url=None):
            return TaskResponse(id=task_id, email_count=len(emails))

        async def list_task_jobs(self, task_id: str, limit: int, offset: int):
            return TaskJobsResponse(
                count=1,
                limit=limit,
                offset=offset,
                jobs=[
                    TaskEmailJob(
                        id="job-1",
                        task_id=task_id,
                        email_address="alpha@example.com",
                        status="completed",
                    )
                ],
            )

    usage_calls = []
    app = _build_app(monkeypatch, FakeClient(), usage_calls)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        create_resp = await client.post("/api/tasks", json={"emails": emails})
        assert create_resp.status_code == 200
        data = create_resp.json()
        assert data["id"] == task_id

        jobs_resp = await client.get(f"/api/tasks/{task_id}/jobs")
        assert jobs_resp.status_code == 200
        jobs_data = jobs_resp.json()
        assert jobs_data["jobs"][0]["task_id"] == task_id
        assert jobs_data["jobs"][0]["email_address"] == "alpha@example.com"

    assert {"path": "/tasks", "count": len(emails), "api_key_id": None, "user_id": "user-manual"} in usage_calls
    assert {"path": "/tasks/{id}/jobs", "count": 1, "api_key_id": None, "user_id": "user-manual"} in usage_calls
