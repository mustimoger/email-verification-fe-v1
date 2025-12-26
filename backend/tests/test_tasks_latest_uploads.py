import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

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


def _build_app(monkeypatch, latest_tasks):
    app = FastAPI()
    app.include_router(router)

    def fake_user():
        return AuthContext(user_id="user-latest", claims={}, token="t")

    monkeypatch.setattr(tasks_module, "fetch_latest_file_tasks", lambda user_id, limit: latest_tasks)
    monkeypatch.setattr(tasks_module, "record_usage", lambda *args, **kwargs: None)
    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    return app


def test_latest_uploads_returns_list(monkeypatch):
    latest_tasks = [
        {
            "task_id": "task-1",
            "file_name": "upload-1.csv",
            "created_at": "2024-02-02T00:00:00Z",
            "status": "processing",
            "email_count": 10,
        },
        {
            "task_id": "task-2",
            "file_name": "upload-2.csv",
            "created_at": "2024-02-01T00:00:00Z",
            "status": "completed",
            "email_count": 12,
            "valid_count": 6,
            "invalid_count": 4,
            "catchall_count": 2,
        },
    ]
    app = _build_app(monkeypatch, latest_tasks)
    client = TestClient(app)

    resp = client.get("/api/tasks/latest-uploads")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["task_id"] == "task-1"
    assert data[1]["file_name"] == "upload-2.csv"


def test_latest_uploads_returns_no_content(monkeypatch):
    app = _build_app(monkeypatch, [])
    client = TestClient(app)

    resp = client.get("/api/tasks/latest-uploads")
    assert resp.status_code == 204
    assert resp.text == ""
