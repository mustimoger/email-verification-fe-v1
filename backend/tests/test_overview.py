import asyncio

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import overview as overview_module
from app.api.overview import router
from app.clients.external import (
    ExternalAPIError,
    Task,
    TaskListResponse,
    TaskMetrics,
    VerificationMetricsResponse,
    VerificationMetricsSeriesPoint,
)
from app.core.auth import AuthContext


def _build_app():
    app = FastAPI()
    app.include_router(router)
    return app


class _Settings:
    def __init__(self, timeout_seconds: float = 1.0):
        self.overview_metrics_timeout_seconds = timeout_seconds


def test_overview_success(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="user-ov", claims={}, token="t")

    app.dependency_overrides[overview_module.get_current_user] = fake_user

    monkeypatch.setattr(overview_module.supabase_client, "fetch_profile", lambda user_id: {"user_id": user_id, "email": "x@test.com"})
    monkeypatch.setattr(overview_module, "get_settings", lambda: _Settings(timeout_seconds=1.0))
    task_metrics = TaskMetrics(
        total_email_addresses=10,
        job_status={"completed": 10},
        verification_status={"exists": 8, "not_exists": 2},
    )
    task_list = TaskListResponse(
        tasks=[Task(id="task-1", created_at="2024-01-02T00:00:00Z", integration="dashboard", metrics=task_metrics)],
        count=1,
        limit=5,
        offset=0,
    )
    monkeypatch.setattr(
        overview_module,
        "list_billing_purchases",
        lambda user_id, limit=None, offset=None: [
            {
                "transaction_id": "txn-1",
                "price_ids": ["price-1", "price-2"],
                "credits_granted": 1000,
                "purchased_at": "2024-01-03T00:00:00Z",
            }
        ],
    )
    monkeypatch.setattr(
        overview_module,
        "get_billing_plans_by_price_ids",
        lambda price_ids: [
            {"paddle_price_id": "price-1", "plan_name": "Starter"},
            {"paddle_price_id": "price-2", "plan_name": "Pro"},
        ],
    )

    class FakeClient:
        async def get_verification_metrics(self):
            return VerificationMetricsResponse(
                verification_status={"exists": 6, "not_exists": 4},
                total_verifications=12,
                total_catchall=2,
                series=[
                    VerificationMetricsSeriesPoint(date="2024-01-01", total_verifications=5),
                    VerificationMetricsSeriesPoint(date="2024-01-02", total_verifications=7),
                ],
            )

        async def list_tasks(self, limit=10, offset=0, user_id=None):
            return task_list

    client = TestClient(app)
    app.dependency_overrides[overview_module.get_user_external_client] = lambda: FakeClient()
    resp = client.get("/api/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["profile"]["user_id"] == "user-ov"
    assert data["credits_remaining"] is None
    assert data["usage_total"] == 12
    assert len(data["usage_series"]) == 2
    assert data["task_counts"]["completed"] == 1
    assert len(data["recent_tasks"]) == 1
    assert data["recent_tasks"][0]["email_count"] == 10
    assert data["recent_tasks"][0]["valid_count"] == 8
    assert data["recent_tasks"][0]["invalid_count"] == 2
    assert data["recent_tasks"][0]["catchall_count"] == 0
    assert data["recent_tasks"][0]["status"] == "completed"
    assert data["verification_totals"]["total"] == 12
    assert data["verification_totals"]["valid"] == 6
    assert data["verification_totals"]["invalid"] == 4
    assert data["verification_totals"]["catchall"] == 2
    assert data["current_plan"]["label"] == "Multiple items"
    assert data["current_plan"]["plan_names"] == ["Starter", "Pro"]
    assert data["current_plan"]["price_ids"] == ["price-1", "price-2"]
    assert data["current_plan"]["purchased_at"] == "2024-01-03T00:00:00Z"


def test_overview_metrics_timeout_fallback(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="user-ov", claims={}, token="t")

    app.dependency_overrides[overview_module.get_current_user] = fake_user

    monkeypatch.setattr(overview_module, "get_settings", lambda: _Settings(timeout_seconds=0.01))
    monkeypatch.setattr(overview_module.supabase_client, "fetch_profile", lambda user_id: {"user_id": user_id})
    monkeypatch.setattr(overview_module, "list_billing_purchases", lambda user_id, limit=None, offset=None: [])

    class FakeClient:
        async def get_verification_metrics(self):
            await asyncio.sleep(0.05)
            return VerificationMetricsResponse(total_verifications=12)

        async def list_tasks(self, limit=10, offset=0, user_id=None):
            return TaskListResponse(tasks=[], count=0, limit=limit, offset=offset)

    client = TestClient(app)
    app.dependency_overrides[overview_module.get_user_external_client] = lambda: FakeClient()
    resp = client.get("/api/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["verification_totals"] is None
    assert data["usage_total"] is None
    assert data["usage_series"] == []


def test_overview_metrics_error_fallback(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="user-ov", claims={}, token="t")

    app.dependency_overrides[overview_module.get_current_user] = fake_user

    monkeypatch.setattr(overview_module, "get_settings", lambda: _Settings(timeout_seconds=1.0))
    monkeypatch.setattr(overview_module.supabase_client, "fetch_profile", lambda user_id: {"user_id": user_id})
    monkeypatch.setattr(overview_module, "list_billing_purchases", lambda user_id, limit=None, offset=None: [])

    class FakeClient:
        async def get_verification_metrics(self):
            raise ExternalAPIError(status_code=503, message="down", details={"error": "down"})

        async def list_tasks(self, limit=10, offset=0, user_id=None):
            return TaskListResponse(tasks=[], count=0, limit=limit, offset=offset)

    client = TestClient(app)
    app.dependency_overrides[overview_module.get_user_external_client] = lambda: FakeClient()
    resp = client.get("/api/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["verification_totals"] is None
    assert data["usage_total"] is None
    assert data["usage_series"] == []


def test_overview_supabase_unavailable(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="user-ov", claims={}, token="t")

    app.dependency_overrides[overview_module.get_current_user] = fake_user

    def fail_fetch_profile(user_id):
        raise RuntimeError("supabase down")

    monkeypatch.setattr(overview_module.supabase_client, "fetch_profile", fail_fetch_profile)

    client = TestClient(app)
    app.dependency_overrides[overview_module.get_user_external_client] = lambda: None
    resp = client.get("/api/overview")
    assert resp.status_code == 503
    assert resp.json()["detail"] == "Supabase temporarily unavailable"
