import pytest
from fastapi import FastAPI
import httpx

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import (
    ExternalAPIError,
    Task,
    TaskFileMetadata,
    TaskListResponse,
    TaskMetrics,
    UploadStatusResponse,
)
from app.core.auth import AuthContext


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    monkeypatch.setenv("MANUAL_MAX_EMAILS", "10000")
    monkeypatch.setenv("LATEST_UPLOADS_LIMIT", "6")


def _build_app(monkeypatch, external_client):
    app = FastAPI()
    app.include_router(router)

    async def fake_user():
        return AuthContext(user_id="user-latest", claims={}, token="t")

    async def fake_client():
        return external_client

    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = fake_client
    return app


@pytest.mark.anyio
async def test_latest_upload_returns_file_backed_metadata(monkeypatch):
    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            return TaskListResponse(
                count=3,
                limit=limit,
                offset=offset,
                tasks=[
                    Task(
                        id="task-manual",
                        status="completed",
                        created_at="2026-02-03T10:00:00Z",
                    ),
                    Task(
                        id="task-file",
                        status="processing",
                        email_count=13,
                        valid_count=8,
                        invalid_count=3,
                        catchall_count=2,
                        created_at="2026-02-04T10:00:00Z",
                        is_file_backed=True,
                        file=TaskFileMetadata(
                            upload_id="upload-1",
                            filename="from-task.csv",
                            email_count=13,
                            created_at="2026-02-04T10:00:00Z",
                        ),
                        metrics=TaskMetrics(job_status={"pending": 2, "completed": 11}),
                    ),
                ],
            )

        async def get_upload_status(self, upload_id: str):
            assert upload_id == "upload-1"
            return UploadStatusResponse(
                upload_id=upload_id,
                task_id="task-file",
                filename="from-upload.csv",
                email_count=13,
                status="processing",
                created_at="2026-02-04T10:01:00Z",
            )

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks/latest-upload")
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["task_id"] == "task-file"
        assert payload["file_name"] == "from-upload.csv"
        assert payload["status"] == "processing"
        assert payload["email_count"] == 13
        assert payload["created_at"] == "2026-02-04T10:01:00Z"
        assert payload["valid_count"] == 8
        assert payload["invalid_count"] == 3
        assert payload["catchall_count"] == 2
        assert payload["job_status"] == {"pending": 2, "completed": 11}


@pytest.mark.anyio
async def test_latest_upload_falls_back_when_upload_status_unavailable(monkeypatch):
    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            return TaskListResponse(
                count=1,
                limit=limit,
                offset=offset,
                tasks=[
                    Task(
                        id="task-file",
                        status="queued",
                        email_count=9,
                        valid_count=5,
                        invalid_count=2,
                        catchall_count=2,
                        created_at="2026-02-04T10:00:00Z",
                        is_file_backed=True,
                        file=TaskFileMetadata(
                            upload_id="upload-1",
                            filename="from-task.csv",
                            email_count=9,
                            created_at="2026-02-04T10:00:00Z",
                        ),
                    ),
                ],
            )

        async def get_upload_status(self, upload_id: str):
            raise ExternalAPIError(status_code=404, message="not found")

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks/latest-upload")
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["task_id"] == "task-file"
        assert payload["file_name"] == "from-task.csv"
        assert payload["status"] == "queued"
        assert payload["email_count"] == 9


@pytest.mark.anyio
async def test_latest_upload_returns_no_content_when_no_file_backed_rows(monkeypatch):
    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            return TaskListResponse(
                count=2,
                limit=limit,
                offset=offset,
                tasks=[
                    Task(id="task-manual-1", status="completed", created_at="2026-02-04T10:00:00Z"),
                    Task(id="task-manual-2", status="processing", created_at="2026-02-03T10:00:00Z"),
                ],
            )

        async def get_upload_status(self, upload_id: str):
            raise AssertionError("get_upload_status should not be called without upload metadata")

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks/latest-upload")
        assert resp.status_code == 204
        assert resp.text == ""
