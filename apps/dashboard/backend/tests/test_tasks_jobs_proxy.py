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
async def test_tasks_jobs_proxy_preserves_updated_email_status_payloads(monkeypatch):
    task_id = "11111111-1111-1111-1111-111111111111"

    class FakeClient:
        async def list_task_jobs(self, task_id: str, limit: int, offset: int):
            return TaskJobsResponse(
                count=6,
                limit=limit,
                offset=offset,
                jobs=[
                    TaskEmailJob(
                        id="job-valid",
                        task_id=task_id,
                        email_address="valid@example.com",
                        status="completed",
                        email={
                            "email_address": "valid@example.com",
                            "status": "valid",
                            "is_role_based": False,
                            "is_disposable": False,
                        },
                    ),
                    TaskEmailJob(
                        id="job-invalid",
                        task_id=task_id,
                        email_address="invalid@example.com",
                        status="completed",
                        email={
                            "email_address": "invalid@example.com",
                            "status": "invalid",
                            "is_role_based": False,
                            "is_disposable": False,
                        },
                    ),
                    TaskEmailJob(
                        id="job-catchall",
                        task_id=task_id,
                        email_address="catchall@example.com",
                        status="completed",
                        email={
                            "email_address": "catchall@example.com",
                            "status": "catchall",
                            "is_role_based": False,
                            "is_disposable": False,
                        },
                    ),
                    TaskEmailJob(
                        id="job-disposable",
                        task_id=task_id,
                        email_address="disposable@example.com",
                        status="completed",
                        email={
                            "email_address": "disposable@example.com",
                            "status": "disposable_domain",
                            "is_role_based": False,
                            "is_disposable": True,
                        },
                    ),
                    TaskEmailJob(
                        id="job-role",
                        task_id=task_id,
                        email_address="role@example.com",
                        status="completed",
                        email={
                            "email_address": "role@example.com",
                            "status": "role_based",
                            "is_role_based": True,
                            "is_disposable": False,
                        },
                    ),
                    TaskEmailJob(
                        id="job-unknown",
                        task_id=task_id,
                        email_address="unknown@example.com",
                        status="completed",
                        email={
                            "email_address": "unknown@example.com",
                            "status": "unknown",
                            "is_role_based": False,
                            "is_disposable": False,
                        },
                    ),
                ],
            )

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks/11111111-1111-1111-1111-111111111111/jobs?limit=10&offset=0")
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 6
        statuses = [job.get("email", {}).get("status") for job in data["jobs"]]
        assert statuses == [
            "valid",
            "invalid",
            "catchall",
            "disposable_domain",
            "role_based",
            "unknown",
        ]
        disposable_job = data["jobs"][3]
        assert disposable_job["email"]["is_disposable"] is True
        role_based_job = data["jobs"][4]
        assert role_based_job["email"]["is_role_based"] is True


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


@pytest.mark.anyio
async def test_tasks_jobs_proxy_rejects_invalid_offset(monkeypatch):
    class FakeClient:
        async def list_task_jobs(self, task_id: str, limit: int, offset: int):
            return TaskJobsResponse(count=0, limit=limit, offset=offset, jobs=[])

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks/11111111-1111-1111-1111-111111111111/jobs?offset=-1")
        assert resp.status_code == 400
