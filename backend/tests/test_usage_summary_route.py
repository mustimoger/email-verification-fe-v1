import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import usage as usage_module
from app.api.usage import router as usage_router
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
    app.include_router(usage_router)

    def fake_user():
        return AuthContext(user_id="user-usage", claims={}, token="t")

    app.dependency_overrides[usage_module.get_current_user] = fake_user
    monkeypatch.setattr(usage_module, "record_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        usage_module,
        "summarize_tasks_usage",
        lambda user_id, api_key_id=None, start=None, end=None: {
            "total": 5,
            "series": [{"date": "2024-02-01", "count": 5}],
        },
    )
    return app


def test_usage_summary_returns_data(monkeypatch):
    app = _build_app(monkeypatch)
    client = TestClient(app)
    resp = client.get("/api/usage/summary?start=2024-02-01T00:00:00Z")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 5
    assert data["series"] == [{"date": "2024-02-01", "count": 5}]


def test_usage_summary_invalid_date(monkeypatch):
    app = _build_app(monkeypatch)
    client = TestClient(app)
    resp = client.get("/api/usage/summary?start=invalid-date")
    assert resp.status_code == 400
