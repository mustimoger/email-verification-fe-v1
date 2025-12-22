import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients import external as external_module
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
        return AuthContext(user_id="user-credits", claims={}, token="t")

    class FakeClient:
        async def verify_email(self, email: str):
            return external_module.VerifyEmailResponse(email=email, status="ok", validated_at="2024-01-01T00:00:00Z")

        async def get_task_detail(self, task_id: str):
            return external_module.TaskDetailResponse(
                id=task_id,
                finished_at="2024-01-01T00:00:00Z",
                jobs=[
                    external_module.TaskEmailJob(email={"status": "exists"}),
                    external_module.TaskEmailJob(email={"status": "not_exists"}),
                ],
            )

    async def fake_client():
        return FakeClient()

    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = fake_client
    monkeypatch.setattr("app.api.tasks.upsert_task_from_detail", lambda *args, **kwargs: None)
    monkeypatch.setattr("app.api.tasks.record_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr("app.api.tasks.resolve_task_api_key_id", lambda *_args, **_kwargs: None)
    return app


def test_verify_returns_402_on_insufficient_credits(monkeypatch):
    app = _build_app(monkeypatch)
    client = TestClient(app)

    monkeypatch.setattr(
        "app.api.tasks.apply_credit_debit",
        lambda *args, **kwargs: {"status": "insufficient", "credits_remaining": 0},
    )

    resp = client.post("/api/verify", json={"email": "alpha@example.com"})
    assert resp.status_code == 402
    assert resp.json()["detail"] == "Insufficient credits"


def test_task_detail_returns_402_on_insufficient_credits(monkeypatch):
    app = _build_app(monkeypatch)
    client = TestClient(app)

    monkeypatch.setattr(
        "app.api.tasks.apply_credit_debit",
        lambda *args, **kwargs: {"status": "insufficient", "credits_remaining": 0},
    )

    resp = client.get("/api/tasks/task-1")
    assert resp.status_code == 402
    assert resp.json()["detail"] == "Insufficient credits"
