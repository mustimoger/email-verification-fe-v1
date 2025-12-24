import asyncio

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import overview as overview_module
from app.api.overview import router
from app.clients.external import ExternalAPIError, VerificationMetricsResponse
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
    monkeypatch.setattr(overview_module.supabase_client, "fetch_credits", lambda user_id: 1000)
    monkeypatch.setattr(overview_module, "get_settings", lambda: _Settings(timeout_seconds=1.0))
    monkeypatch.setattr(
        overview_module,
        "summarize_tasks_usage",
        lambda user_id: {
            "total": 12,
            "series": [
                {"date": "2024-01-01", "count": 5},
                {"date": "2024-01-02", "count": 7},
            ],
        },
    )
    monkeypatch.setattr(
        overview_module,
        "fetch_task_summary",
        lambda user_id, limit=5: {
            "counts": [{"status": "completed", "count": 2}, {"status": "processing", "count": 1}],
            "recent": [
                {
                    "task_id": "task-1",
                    "status": "completed",
                    "email_count": 10,
                    "valid_count": 8,
                    "invalid_count": 2,
                    "catchall_count": 0,
                    "integration": "dashboard",
                    "created_at": "2024-01-02T00:00:00Z",
                }
            ],
        },
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
            )

    usage_calls = []
    monkeypatch.setattr(overview_module, "record_usage", lambda *args, **kwargs: usage_calls.append(args))

    client = TestClient(app)
    app.dependency_overrides[overview_module.get_user_external_client] = lambda: FakeClient()
    resp = client.get("/api/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["profile"]["user_id"] == "user-ov"
    assert data["credits_remaining"] == 1000
    assert data["usage_total"] == 12
    assert len(data["usage_series"]) == 2
    assert data["task_counts"]["completed"] == 2
    assert len(data["recent_tasks"]) == 1
    assert data["verification_totals"]["total"] == 12
    assert data["verification_totals"]["valid"] == 6
    assert data["verification_totals"]["invalid"] == 4
    assert data["verification_totals"]["catchall"] == 2
    assert data["current_plan"]["label"] == "Multiple items"
    assert data["current_plan"]["plan_names"] == ["Starter", "Pro"]
    assert data["current_plan"]["price_ids"] == ["price-1", "price-2"]
    assert data["current_plan"]["purchased_at"] == "2024-01-03T00:00:00Z"
    assert usage_calls


def test_overview_metrics_timeout_fallback(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="user-ov", claims={}, token="t")

    app.dependency_overrides[overview_module.get_current_user] = fake_user

    monkeypatch.setattr(overview_module, "get_settings", lambda: _Settings(timeout_seconds=0.01))
    monkeypatch.setattr(overview_module.supabase_client, "fetch_profile", lambda user_id: {"user_id": user_id})
    monkeypatch.setattr(overview_module.supabase_client, "fetch_credits", lambda user_id: 0)
    monkeypatch.setattr(overview_module, "summarize_tasks_usage", lambda user_id: {"total": 0, "series": []})
    monkeypatch.setattr(overview_module, "fetch_task_summary", lambda user_id, limit=5: {"counts": [], "recent": []})
    monkeypatch.setattr(overview_module, "list_billing_purchases", lambda user_id, limit=None, offset=None: [])
    monkeypatch.setattr(overview_module, "summarize_task_validation_totals", lambda user_id: {"valid": 2, "invalid": 1, "catchall": 3})

    class FakeClient:
        async def get_verification_metrics(self):
            await asyncio.sleep(0.05)
            return VerificationMetricsResponse(total_verifications=12)

    monkeypatch.setattr(overview_module, "record_usage", lambda *args, **kwargs: None)

    client = TestClient(app)
    app.dependency_overrides[overview_module.get_user_external_client] = lambda: FakeClient()
    resp = client.get("/api/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["verification_totals"]["total"] == 6
    assert data["verification_totals"]["valid"] == 2
    assert data["verification_totals"]["invalid"] == 1
    assert data["verification_totals"]["catchall"] == 3


def test_overview_metrics_error_fallback(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="user-ov", claims={}, token="t")

    app.dependency_overrides[overview_module.get_current_user] = fake_user

    monkeypatch.setattr(overview_module, "get_settings", lambda: _Settings(timeout_seconds=1.0))
    monkeypatch.setattr(overview_module.supabase_client, "fetch_profile", lambda user_id: {"user_id": user_id})
    monkeypatch.setattr(overview_module.supabase_client, "fetch_credits", lambda user_id: 0)
    monkeypatch.setattr(overview_module, "summarize_tasks_usage", lambda user_id: {"total": 0, "series": []})
    monkeypatch.setattr(overview_module, "fetch_task_summary", lambda user_id, limit=5: {"counts": [], "recent": []})
    monkeypatch.setattr(overview_module, "list_billing_purchases", lambda user_id, limit=None, offset=None: [])
    monkeypatch.setattr(overview_module, "summarize_task_validation_totals", lambda user_id: {"valid": 4, "invalid": 2, "catchall": 0})

    class FakeClient:
        async def get_verification_metrics(self):
            raise ExternalAPIError(status_code=503, message="down", details={"error": "down"})

    monkeypatch.setattr(overview_module, "record_usage", lambda *args, **kwargs: None)

    client = TestClient(app)
    app.dependency_overrides[overview_module.get_user_external_client] = lambda: FakeClient()
    resp = client.get("/api/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["verification_totals"]["total"] == 6
    assert data["verification_totals"]["valid"] == 4
    assert data["verification_totals"]["invalid"] == 2
    assert data["verification_totals"]["catchall"] == 0
