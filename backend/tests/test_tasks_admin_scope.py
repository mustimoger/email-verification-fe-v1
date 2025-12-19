from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

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


def _build_app(monkeypatch, fake_user, fake_client, *, use_supabase: bool = False):
    app = FastAPI()
    app.include_router(router)

    async def fake_poll(*args, **kwargs):
        return None

    async def fake_persist(upload, user_id, max_bytes):
        return Path("fake"), b"data"

    monkeypatch.setattr(tasks_module, "record_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(tasks_module, "upsert_tasks_from_list", lambda *args, **kwargs: None)
    monkeypatch.setattr(tasks_module, "poll_tasks_after_upload", fake_poll)
    monkeypatch.setattr(tasks_module, "persist_upload_file", fake_persist)
    if use_supabase:
        monkeypatch.setattr(
            tasks_module,
            "fetch_tasks_with_counts",
            lambda user_id, limit=10, offset=0: {
                "count": 1,
                "tasks": [
                    {
                        "task_id": "supabase-task",
                        "user_id": user_id,
                        "status": "completed",
                        "email_count": 1,
                        "valid_count": 1,
                        "invalid_count": 0,
                        "catchall_count": 0,
                        "created_at": "2024-01-01T00:00:00Z",
                    }
                ],
            },
        )
    else:
        monkeypatch.setattr(tasks_module, "fetch_tasks_with_counts", lambda *args, **kwargs: {"count": 0, "tasks": []})

    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = lambda: fake_client
    return app


def test_tasks_list_forbids_user_id_for_non_admin(monkeypatch):
    def fake_user():
        return AuthContext(user_id="user-basic", claims={}, token="t", role="user")

    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            return TaskListResponse(count=0, tasks=[])

    app = _build_app(monkeypatch, fake_user, FakeClient())
    client = TestClient(app)
    resp = client.get("/api/tasks?user_id=target-user")
    assert resp.status_code == 403


def test_tasks_list_allows_user_id_for_admin(monkeypatch):
    def fake_user():
        return AuthContext(user_id="admin-1", claims={}, token="t", role="admin")

    captured = []

    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            captured.append(user_id)
            return TaskListResponse(count=0, tasks=[])

    app = _build_app(monkeypatch, fake_user, FakeClient())
    client = TestClient(app)
    resp = client.get("/api/tasks?user_id=target-user")
    assert resp.status_code == 200
    assert captured == ["target-user"]


def test_tasks_create_forbids_user_id_for_non_admin(monkeypatch):
    def fake_user():
        return AuthContext(user_id="user-basic", claims={}, token="t", role="user")

    class FakeClient:
        async def create_task(self, emails, user_id=None, webhook_url=None):
            return TaskResponse(id="task-1", email_count=len(emails))

    app = _build_app(monkeypatch, fake_user, FakeClient())
    client = TestClient(app)
    resp = client.post("/api/tasks?user_id=target-user", json={"emails": ["a@test.com"]})
    assert resp.status_code == 403


def test_tasks_create_allows_user_id_for_admin(monkeypatch):
    def fake_user():
        return AuthContext(user_id="admin-1", claims={}, token="t", role="admin")

    captured = []

    class FakeClient:
        async def create_task(self, emails, user_id=None, webhook_url=None):
            captured.append(user_id)
            return TaskResponse(id="task-2", email_count=len(emails))

    app = _build_app(monkeypatch, fake_user, FakeClient())
    client = TestClient(app)
    resp = client.post("/api/tasks?user_id=target-user", json={"emails": ["a@test.com"]})
    assert resp.status_code == 200
    assert resp.json()["id"] == "task-2"
    assert captured == ["target-user"]


def test_tasks_upload_forbids_user_id_for_non_admin(monkeypatch):
    def fake_user():
        return AuthContext(user_id="user-basic", claims={}, token="t", role="user")

    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            return TaskListResponse(count=0, tasks=[])

        async def upload_batch_file(self, filename, content, user_id=None, webhook_url=None):
            return BatchFileUploadResponse(status="ok", upload_id="u1")

    app = _build_app(monkeypatch, fake_user, FakeClient())
    client = TestClient(app)
    resp = client.post(
        "/api/tasks/upload?user_id=target-user",
        files=[("files", ("emails.csv", b"email@example.com", "text/csv"))],
    )
    assert resp.status_code == 403


def test_tasks_upload_allows_user_id_for_admin(monkeypatch):
    def fake_user():
        return AuthContext(user_id="admin-1", claims={}, token="t", role="admin")

    captured = {"list_user_id": None, "upload_user_id": None, "persist_user_id": None}

    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            captured["list_user_id"] = user_id
            return TaskListResponse(count=0, tasks=[])

        async def upload_batch_file(self, filename, content, user_id=None, webhook_url=None):
            captured["upload_user_id"] = user_id
            return BatchFileUploadResponse(status="ok", upload_id="u1")

    async def fake_persist(upload, user_id, max_bytes):
        captured["persist_user_id"] = user_id
        return Path("fake"), b"data"

    app = _build_app(monkeypatch, fake_user, FakeClient())
    monkeypatch.setattr(tasks_module, "persist_upload_file", fake_persist)
    client = TestClient(app)
    resp = client.post(
        "/api/tasks/upload?user_id=target-user",
        files=[("files", ("emails.csv", b"email@example.com", "text/csv"))],
    )
    assert resp.status_code == 200
    assert captured["list_user_id"] == "target-user"
    assert captured["persist_user_id"] == "target-user"
    assert captured["upload_user_id"] == "target-user"
