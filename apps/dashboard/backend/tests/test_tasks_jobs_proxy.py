import pytest
from fastapi import FastAPI
import httpx

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import ExternalAPIError, TaskEmailJob, TaskJobsResponse
from app.core.auth import AuthContext


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


def _build_app(monkeypatch, client):
    app = FastAPI()
    app.include_router(router)

    async def fake_user():
        return AuthContext(user_id="user-jobs", claims={}, token="t")

    async def fake_client():
        return client

    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = fake_client
    return app


@pytest.mark.anyio
async def test_tasks_jobs_proxy_returns_payload(monkeypatch):
    class FakeClient:
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

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks/11111111-1111-1111-1111-111111111111/jobs?limit=5&offset=0")
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 1
        assert data["jobs"][0]["email_address"] == "alpha@example.com"
        assert data["jobs"][0]["status"] == "completed"


@pytest.mark.anyio
async def test_tasks_jobs_proxy_handles_external_error(monkeypatch):
    class FakeClient:
        async def list_task_jobs(self, task_id: str, limit: int, offset: int):
            raise ExternalAPIError(status_code=403, message="forbidden")

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks/11111111-1111-1111-1111-111111111111/jobs")
        assert resp.status_code == 403


@pytest.mark.anyio
async def test_tasks_jobs_proxy_rejects_invalid_limit(monkeypatch):
    class FakeClient:
        async def list_task_jobs(self, task_id: str, limit: int, offset: int):
            return TaskJobsResponse(count=0, limit=limit, offset=offset, jobs=[])

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks/11111111-1111-1111-1111-111111111111/jobs?limit=0")
        assert resp.status_code == 400
