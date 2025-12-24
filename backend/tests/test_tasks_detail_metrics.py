from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import TaskDetailResponse, TaskMetrics
from app.core.auth import AuthContext


def _set_env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


def _build_app(monkeypatch, fake_client):
    app = FastAPI()
    app.include_router(router)

    def fake_user():
        return AuthContext(user_id="user-metrics", claims={}, token="t", role="user")

    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = lambda: fake_client

    monkeypatch.setattr(tasks_module, "record_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(tasks_module, "resolve_task_api_key_id", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(tasks_module, "fetch_task_credit_reservation", lambda *_args, **_kwargs: None)
    return app


def test_task_detail_uses_metrics_for_counts(monkeypatch):
    _set_env(monkeypatch)
    captured = {}

    class FakeClient:
        async def get_task_detail(self, task_id: str):
            return TaskDetailResponse(
                id=task_id,
                finished_at="2024-01-01T00:00:00Z",
                metrics=TaskMetrics(
                    total_email_addresses=996,
                    verification_status={
                        "exists": 700,
                        "not_exists": 200,
                        "catchall": 96,
                    },
                ),
            )

    app = _build_app(monkeypatch, FakeClient())
    client = TestClient(app)

    monkeypatch.setattr(tasks_module, "apply_credit_debit", lambda **_kwargs: {"status": "applied"})

    def capture_upsert(*_args, **kwargs):
        captured["counts"] = kwargs.get("counts")

    monkeypatch.setattr(tasks_module, "upsert_task_from_detail", capture_upsert)

    resp = client.get("/api/tasks/task-metrics")
    assert resp.status_code == 200
    assert captured["counts"] == {"valid": 700, "invalid": 200, "catchall": 96}
