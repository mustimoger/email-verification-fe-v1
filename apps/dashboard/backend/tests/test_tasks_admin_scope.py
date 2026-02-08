import pytest
from fastapi import FastAPI
import httpx

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import BatchFileUploadResponse, TaskListResponse, TaskResponse
from app.core.auth import AuthContext


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


def _build_app(monkeypatch, fake_user, fake_client):
    app = FastAPI()
    app.include_router(router)

    async def fake_client_override():
        return fake_client

    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = fake_client_override
    return app


@pytest.mark.anyio
async def test_tasks_list_forbids_user_id_for_non_admin(monkeypatch):
    async def fake_user():
        return AuthContext(user_id="user-basic", claims={}, token="t", role="user")

    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            return TaskListResponse(count=0, tasks=[])

    app = _build_app(monkeypatch, fake_user, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks?user_id=target-user")
        assert resp.status_code == 403


@pytest.mark.anyio
async def test_tasks_list_allows_user_id_for_admin(monkeypatch):
    async def fake_user():
        return AuthContext(user_id="admin-1", claims={}, token="t", role="admin")

    captured = []

    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            captured.append(user_id)
            return TaskListResponse(count=0, tasks=[])

    app = _build_app(monkeypatch, fake_user, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks?user_id=target-user")
        assert resp.status_code == 200
        assert captured == ["target-user"]


@pytest.mark.anyio
async def test_tasks_create_forbids_user_id_for_non_admin(monkeypatch):
    async def fake_user():
        return AuthContext(user_id="user-basic", claims={}, token="t", role="user")

    class FakeClient:
        async def create_task(self, emails, webhook_url=None):
            return TaskResponse(id="task-1", email_count=len(emails))

    app = _build_app(monkeypatch, fake_user, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/tasks?user_id=target-user", json={"emails": ["a@test.com"]})
        assert resp.status_code == 400


@pytest.mark.anyio
async def test_tasks_create_rejects_user_id_for_admin(monkeypatch):
    async def fake_user():
        return AuthContext(user_id="admin-1", claims={}, token="t", role="admin")

    class FakeClient:
        async def create_task(self, emails, webhook_url=None):
            return TaskResponse(id="task-2", email_count=len(emails))

    app = _build_app(monkeypatch, fake_user, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/tasks?user_id=target-user", json={"emails": ["a@test.com"]})
        assert resp.status_code == 400


@pytest.mark.anyio
async def test_tasks_upload_forbids_user_id_for_non_admin(monkeypatch):
    async def fake_user():
        return AuthContext(user_id="user-basic", claims={}, token="t", role="user")

    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            return TaskListResponse(count=0, tasks=[])

        async def upload_batch_file(self, filename, content, webhook_url=None, email_column=None):
            return BatchFileUploadResponse(status="ok", upload_id="u1", task_id="task-1")

    app = _build_app(monkeypatch, fake_user, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/tasks/upload?user_id=target-user",
            files=[("files", ("emails.csv", b"email@example.com", "text/csv"))],
            data={
                "file_metadata": '[{"file_name":"emails.csv","email_column":"A","first_row_has_labels":true,"remove_duplicates":true}]'
            },
        )
        assert resp.status_code == 400


@pytest.mark.anyio
async def test_tasks_upload_rejects_user_id_for_admin(monkeypatch):
    async def fake_user():
        return AuthContext(user_id="admin-1", claims={}, token="t", role="admin")

    captured = {"list_user_id": None, "email_column": None}

    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            captured["list_user_id"] = user_id
            return TaskListResponse(count=0, tasks=[])

        async def upload_batch_file(self, filename, content, webhook_url=None, email_column=None):
            captured["email_column"] = email_column
            return BatchFileUploadResponse(status="ok", upload_id="u1", task_id="task-1")

    app = _build_app(monkeypatch, fake_user, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/tasks/upload?user_id=target-user",
            files=[("files", ("emails.csv", b"email@example.com", "text/csv"))],
            data={
                "file_metadata": '[{"file_name":"emails.csv","email_column":"A","first_row_has_labels":true,"remove_duplicates":true}]'
            },
        )
        assert resp.status_code == 400
        assert captured["email_column"] is None
