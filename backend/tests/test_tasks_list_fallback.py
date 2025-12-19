import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import TaskListResponse
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

    def fake_user():
        return AuthContext(user_id="user-fallback", claims={}, token="t")

    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            return TaskListResponse(count=0, tasks=[])

    async def fake_resolved():
        return FakeClient()

    monkeypatch.setattr(tasks_module, "record_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        tasks_module,
        "fetch_tasks_with_counts",
        lambda user_id, limit=10, offset=0, api_key_id=None: {
            "count": 2,
            "tasks": [
                {
                    "task_id": "t1",
                    "user_id": user_id,
                    "status": "completed",
                    "email_count": 10,
                    "valid_count": 8,
                    "invalid_count": 2,
                    "catchall_count": 0,
                    "created_at": "2024-01-01T00:00:00Z",
                },
                {
                    "task_id": "t2",
                    "user_id": user_id,
                    "status": "processing",
                    "email_count": 5,
                    "valid_count": 2,
                    "invalid_count": 1,
                    "catchall_count": 2,
                    "created_at": "2024-01-02T00:00:00Z",
                },
            ],
        },
    )
    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = fake_resolved
    return app


def test_tasks_list_fallback_returns_supabase_rows(monkeypatch):
    app = _build_app(monkeypatch)
    client = TestClient(app)

    resp = client.get("/api/tasks")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 2
    assert len(data["tasks"]) == 2
    assert data["tasks"][0]["id"] == "t1"
    assert data["tasks"][0]["valid_count"] == 8
    assert data["tasks"][1]["status"] == "processing"
