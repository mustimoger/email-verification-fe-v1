from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import TaskResponse
from app.core.auth import AuthContext


def _build_app(monkeypatch, fake_user, fake_client):
    app = FastAPI()
    app.include_router(router)

    monkeypatch.setattr(tasks_module, "record_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(tasks_module, "upsert_tasks_from_list", lambda *args, **kwargs: None)

    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = lambda: fake_client
    return app


def test_manual_limit_blocks_large_payload(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    monkeypatch.setenv("UPLOAD_MAX_EMAILS_PER_TASK", "10000")
    monkeypatch.setenv("MANUAL_MAX_EMAILS", "2")

    def fake_user():
        return AuthContext(user_id="user-basic", claims={}, token="t", role="user")

    called = {"create": False}

    class FakeClient:
        async def create_task(self, emails, user_id=None, webhook_url=None):
            called["create"] = True
            return TaskResponse(id="task-1", email_count=len(emails))

    app = _build_app(monkeypatch, fake_user, FakeClient())
    client = TestClient(app)
    resp = client.post("/api/tasks", json={"emails": ["a@test.com", "b@test.com", "c@test.com"]})
    assert resp.status_code == 400
    assert called["create"] is False
    assert "Manual verification limit" in resp.text
