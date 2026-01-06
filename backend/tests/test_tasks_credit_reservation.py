from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import TaskDetailResponse, TaskEmailJob, TaskMetrics, TaskResponse
from app.core.auth import AuthContext


def _build_app(monkeypatch, fake_client):
    app = FastAPI()
    app.include_router(router)

    def fake_user():
        return AuthContext(user_id="user-reserve", claims={}, token="t", role="user")

    monkeypatch.setattr(tasks_module, "upsert_tasks_from_list", lambda *args, **kwargs: None)
    monkeypatch.setattr(tasks_module, "record_usage", lambda *args, **kwargs: None)

    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = lambda: fake_client
    return app


def _set_env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


def test_tasks_create_blocks_when_reservation_insufficient(monkeypatch):
    _set_env(monkeypatch)
    called = {"create": False}

    class FakeClient:
        async def create_task(self, emails, webhook_url=None):
            called["create"] = True
            return TaskResponse(id="task-1", email_count=len(emails))

    app = _build_app(monkeypatch, FakeClient())
    client = TestClient(app)

    monkeypatch.setattr(
        tasks_module,
        "apply_credit_debit",
        lambda **_kwargs: {"status": "insufficient", "credits_remaining": 0},
    )

    resp = client.post("/api/tasks", json={"emails": ["a@test.com", "b@test.com"]})
    assert resp.status_code == 402
    assert called["create"] is False


def test_tasks_detail_releases_remainder_for_reservation(monkeypatch):
    _set_env(monkeypatch)
    release_calls = []
    task_id = "11111111-1111-1111-1111-111111111111"

    class FakeClient:
        async def get_task_detail(self, task_id: str):
            return TaskDetailResponse(
                id=task_id,
                finished_at="2024-01-01T00:00:00Z",
                metrics=TaskMetrics(
                    verification_status={"exists": 3},
                    total_email_addresses=3,
                ),
                jobs=[
                    TaskEmailJob(email={"status": "exists"}),
                    TaskEmailJob(email={"status": "exists"}),
                    TaskEmailJob(email={"status": "exists"}),
                ],
            )

    app = _build_app(monkeypatch, FakeClient())
    client = TestClient(app)

    monkeypatch.setattr(
        tasks_module,
        "fetch_task_credit_reservation",
        lambda *_args, **_kwargs: {"credit_reserved_count": 5, "credit_reservation_id": "res-1"},
    )
    monkeypatch.setattr(tasks_module, "upsert_task_from_detail", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        tasks_module,
        "apply_credit_release",
        lambda **kwargs: release_calls.append(kwargs) or {"status": "applied", "credits_remaining": 10},
    )

    def _debit_unexpected(**_kwargs):
        raise AssertionError("apply_credit_debit should not be called for release-only path")

    monkeypatch.setattr(tasks_module, "apply_credit_debit", _debit_unexpected)

    resp = client.get(f"/api/tasks/{task_id}")
    assert resp.status_code == 200
    assert len(release_calls) == 1
    assert release_calls[0]["credits"] == 2


def test_tasks_detail_prefers_metrics_counts(monkeypatch):
    _set_env(monkeypatch)
    debit_calls = []
    task_id = "11111111-1111-1111-1111-111111111111"

    class FakeClient:
        async def get_task_detail(self, task_id: str):
            return TaskDetailResponse(
                id=task_id,
                finished_at="2024-01-01T00:00:00Z",
                metrics=TaskMetrics(
                    verification_status={"exists": 2, "catchall": 1, "not_exists": 3},
                    total_email_addresses=6,
                ),
                jobs=[TaskEmailJob(email={"status": "exists"})],
            )

    app = _build_app(monkeypatch, FakeClient())
    client = TestClient(app)

    monkeypatch.setattr(tasks_module, "fetch_task_credit_reservation", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(tasks_module, "upsert_task_from_detail", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        tasks_module,
        "apply_credit_debit",
        lambda **kwargs: debit_calls.append(kwargs) or {"status": "applied", "credits_remaining": 10},
    )

    resp = client.get(f"/api/tasks/{task_id}")
    assert resp.status_code == 200
    assert len(debit_calls) == 1
    assert debit_calls[0]["credits"] == 6
    meta = debit_calls[0]["meta"]
    assert meta["valid"] == 2
    assert meta["invalid"] == 3
    assert meta["catchall"] == 1
