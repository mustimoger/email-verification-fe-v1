import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.core.auth import AuthContext
from app.clients.external import TaskListResponse


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
        return AuthContext(user_id="user-key-scope", claims={}, token="t")

    calls = {"external_list": 0}

    class FakeClient:
        async def list_tasks(self, limit: int, offset: int, user_id: str | None = None):
            calls["external_list"] += 1
            return TaskListResponse(count=0, tasks=[])

    monkeypatch.setattr(tasks_module, "record_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        tasks_module,
        "fetch_tasks_with_counts",
        lambda user_id, limit=10, offset=0, api_key_id=None: {"count": 0, "tasks": []},
    )
    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = lambda: FakeClient()
    return app, calls


def test_tasks_list_key_scope_skips_external(monkeypatch):
    app, calls = _build_app(monkeypatch)
    client = TestClient(app)

    resp = client.get("/api/tasks?api_key_id=key-123")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 0
    assert data["tasks"] == []
    assert calls["external_list"] == 0
