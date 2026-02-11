import pytest
from fastapi import FastAPI
import httpx

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import Task, TaskFileMetadata, TaskListResponse, UploadStatusResponse
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
async def test_latest_uploads_returns_file_backed_rows(monkeypatch):
    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            return TaskListResponse(
                count=4,
                limit=limit,
                offset=offset,
                tasks=[
                    Task(id="task-manual", status="completed", created_at="2026-02-05T10:00:00Z"),
                    Task(
                        id="task-old",
                        status="processing",
                        email_count=7,
                        valid_count=4,
                        invalid_count=2,
                        catchall_count=1,
                        created_at="2026-02-03T09:00:00Z",
                        is_file_backed=True,
                        file=TaskFileMetadata(
                            upload_id="upload-old",
                            filename="old.csv",
                            email_count=7,
                            created_at="2026-02-03T09:00:00Z",
                        ),
                    ),
                    Task(
                        id="task-new",
                        status="processing",
                        email_count=12,
                        valid_count=10,
                        invalid_count=1,
                        catchall_count=1,
                        created_at="2026-02-04T09:00:00Z",
                        is_file_backed=True,
                        file=TaskFileMetadata(
                            upload_id="upload-new",
                            filename="new.csv",
                            email_count=12,
                            created_at="2026-02-04T09:00:00Z",
                        ),
                    ),
                ],
            )

        async def get_upload_status(self, upload_id: str):
            if upload_id == "upload-old":
                return UploadStatusResponse(
                    upload_id=upload_id,
                    task_id="task-old",
                    filename="old-from-upload.csv",
                    email_count=7,
                    status="completed",
                    created_at="2026-02-03T09:00:00Z",
                )
            if upload_id == "upload-new":
                return UploadStatusResponse(
                    upload_id=upload_id,
                    task_id="task-new",
                    filename="new-from-upload.csv",
                    email_count=12,
                    status="processing",
                    created_at="2026-02-04T09:30:00Z",
                )
            raise AssertionError(f"unexpected upload id: {upload_id}")

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks/latest-uploads?limit=2")
        assert resp.status_code == 200
        payload = resp.json()
        assert len(payload) == 2
        assert payload[0]["task_id"] == "task-new"
        assert payload[0]["file_name"] == "new-from-upload.csv"
        assert payload[0]["status"] == "processing"
        assert payload[0]["email_count"] == 12
        assert payload[1]["task_id"] == "task-old"
        assert payload[1]["file_name"] == "old-from-upload.csv"
        assert payload[1]["status"] == "completed"
        assert payload[1]["email_count"] == 7


@pytest.mark.anyio
async def test_latest_uploads_uses_default_limit_when_query_missing(monkeypatch):
    captured_limits: list[int] = []

    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            captured_limits.append(limit)
            return TaskListResponse(
                count=1,
                limit=limit,
                offset=offset,
                tasks=[
                    Task(
                        id="task-new",
                        status="processing",
                        email_count=4,
                        valid_count=3,
                        invalid_count=1,
                        catchall_count=0,
                        created_at="2026-02-04T09:00:00Z",
                        is_file_backed=True,
                        file=TaskFileMetadata(
                            upload_id="upload-new",
                            filename="new.csv",
                            email_count=4,
                            created_at="2026-02-04T09:00:00Z",
                        ),
                    ),
                ],
            )

        async def get_upload_status(self, upload_id: str):
            return UploadStatusResponse(
                upload_id=upload_id,
                task_id="task-new",
                filename="new.csv",
                email_count=4,
                status="processing",
                created_at="2026-02-04T09:00:00Z",
            )

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks/latest-uploads")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
    assert captured_limits and captured_limits[0] == 6


@pytest.mark.anyio
async def test_latest_uploads_rejects_invalid_limit(monkeypatch):
    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            return TaskListResponse(count=0, limit=limit, offset=offset, tasks=[])

        async def get_upload_status(self, upload_id: str):
            raise AssertionError("should not call")

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks/latest-uploads?limit=0")
        assert resp.status_code == 400
        assert resp.json()["detail"] == "limit must be greater than zero"


@pytest.mark.anyio
async def test_latest_uploads_returns_no_content_when_no_file_backed_rows(monkeypatch):
    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            return TaskListResponse(
                count=2,
                limit=limit,
                offset=offset,
                tasks=[
                    Task(id="task-manual-1", status="completed", created_at="2026-02-05T10:00:00Z"),
                    Task(id="task-manual-2", status="processing", created_at="2026-02-03T10:00:00Z"),
                ],
            )

        async def get_upload_status(self, upload_id: str):
            raise AssertionError("get_upload_status should not be called without upload metadata")

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tasks/latest-uploads")
        assert resp.status_code == 204
        assert resp.text == ""
