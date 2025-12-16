from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import overview as overview_module
from app.api.overview import router
from app.core.auth import AuthContext


def _build_app():
    app = FastAPI()
    app.include_router(router)
    return app


def test_overview_success(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="user-ov", claims={}, token="t")

    app.dependency_overrides[overview_module.get_current_user] = fake_user

    monkeypatch.setattr(overview_module.supabase_client, "fetch_profile", lambda user_id: {"user_id": user_id, "email": "x@test.com"})
    monkeypatch.setattr(overview_module.supabase_client, "fetch_credits", lambda user_id: 1000)
    monkeypatch.setattr(
        overview_module.supabase_client,
        "fetch_usage",
        lambda user_id: [
            {"count": 2, "period_start": "2024-01-01T00:00:00Z"},
            {"count": 3, "period_start": "2024-01-02T00:00:00Z"},
        ],
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
    usage_calls = []
    monkeypatch.setattr(overview_module, "record_usage", lambda *args, **kwargs: usage_calls.append(args))

    client = TestClient(app)
    resp = client.get("/api/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["profile"]["user_id"] == "user-ov"
    assert data["credits_remaining"] == 1000
    assert data["usage_total"] == 5
    assert len(data["usage_series"]) == 2
    assert data["task_counts"]["completed"] == 2
    assert len(data["recent_tasks"]) == 1
    assert usage_calls
