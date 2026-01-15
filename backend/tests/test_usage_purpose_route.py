import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import usage as usage_module
from app.api.usage import router as usage_router
from app.clients.external import APIUsageMetricsResponse, APIUsageMetricsSeriesPoint
from app.core.auth import AuthContext


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


def _build_app(monkeypatch, role="user"):
    app = FastAPI()
    app.include_router(usage_router)

    def fake_user():
        return AuthContext(user_id="user-usage", claims={}, token="t", role=role)

    captured = {}

    class FakeClient:
        async def get_api_usage_metrics(self, user_id=None, start=None, end=None):
            captured["user_id"] = user_id
            captured["start"] = start
            captured["end"] = end
            return APIUsageMetricsResponse(
                user_id=user_id or "user-usage",
                total_requests=12,
                total_api_keys=2,
                requests_by_purpose={"zapier": 7, "n8n": 5},
                api_keys_by_purpose={"zapier": 1, "n8n": 1},
                series=[
                    APIUsageMetricsSeriesPoint(
                        date="2024-02-01",
                        total_requests=5,
                        total_api_keys=2,
                        requests_by_purpose={"zapier": 3, "n8n": 2},
                        api_keys_by_purpose={"zapier": 1, "n8n": 1},
                    )
                ],
                last_used_at="2024-02-02T00:00:00Z",
            )

    app.dependency_overrides[usage_module.get_current_user] = fake_user
    app.dependency_overrides[usage_module.get_user_external_client] = lambda: FakeClient()
    return app, captured


def test_usage_purpose_returns_data(monkeypatch):
    app, captured = _build_app(monkeypatch)
    client = TestClient(app)
    resp = client.get("/api/usage/purpose?from=2024-02-01T00:00:00Z&to=2024-02-02T00:00:00Z")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_requests"] == 12
    assert data["requests_by_purpose"] == {"zapier": 7, "n8n": 5}
    assert data["series"] == [
        {
            "api_keys_by_purpose": {"zapier": 1, "n8n": 1},
            "date": "2024-02-01",
            "requests_by_purpose": {"zapier": 3, "n8n": 2},
            "total_api_keys": 2,
            "total_requests": 5,
        }
    ]
    assert captured["user_id"] is None
    assert captured["start"] == "2024-02-01T00:00:00+00:00"
    assert captured["end"] == "2024-02-02T00:00:00+00:00"


def test_usage_purpose_invalid_date(monkeypatch):
    app, _ = _build_app(monkeypatch)
    client = TestClient(app)
    resp = client.get("/api/usage/purpose?from=invalid-date")
    assert resp.status_code == 400


def test_usage_purpose_forbids_user_id_for_non_admin(monkeypatch):
    app, _ = _build_app(monkeypatch, role="user")
    client = TestClient(app)
    resp = client.get("/api/usage/purpose?user_id=target-user")
    assert resp.status_code == 403
