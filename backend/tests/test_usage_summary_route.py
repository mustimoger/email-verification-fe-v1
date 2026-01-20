import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import usage as usage_module
from app.api.usage import router as usage_router
from app.clients.external import (
    APIKeyUsageResponse,
    APIKeyUsageSeriesPoint,
    VerificationMetricsResponse,
    VerificationMetricsSeriesPoint,
)
from app.core.auth import AuthContext


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


def _build_app(monkeypatch, fake_client):
    app = FastAPI()
    app.include_router(usage_router)

    def fake_user():
        return AuthContext(user_id="user-usage", claims={}, token="t")

    app.dependency_overrides[usage_module.get_current_user] = fake_user
    app.dependency_overrides[usage_module.get_user_external_client] = lambda: fake_client
    return app


def test_usage_summary_returns_data(monkeypatch):
    class FakeClient:
        async def get_verification_metrics(self, user_id=None, start=None, end=None):
            return VerificationMetricsResponse(
                user_id="user-usage",
                total_verifications=5,
                series=[VerificationMetricsSeriesPoint(date="2024-02-01", total_verifications=5)],
            )

    app = _build_app(monkeypatch, FakeClient())
    client = TestClient(app)
    resp = client.get("/api/usage/summary?start=2024-02-01T00:00:00Z")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 5
    assert data["series"] == [{"date": "2024-02-01", "count": 5}]


def test_usage_summary_invalid_date(monkeypatch):
    class FakeClient:
        async def get_verification_metrics(self, user_id=None, start=None, end=None):
            return VerificationMetricsResponse(user_id="user-usage", total_verifications=5)

    app = _build_app(monkeypatch, FakeClient())
    client = TestClient(app)
    resp = client.get("/api/usage/summary?start=invalid-date")
    assert resp.status_code == 400


def test_usage_summary_api_key_usage(monkeypatch):
    class FakeClient:
        async def get_api_key_usage(self, api_key_id, start=None, end=None):
            return APIKeyUsageResponse(
                id=api_key_id,
                user_id="user-usage",
                usage_count=12,
                series=[APIKeyUsageSeriesPoint(date="2024-02-01", usage_count=4)],
            )

    app = _build_app(monkeypatch, FakeClient())
    client = TestClient(app)
    resp = client.get("/api/usage/summary?api_key_id=key-1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 12
    assert data["series"] == [{"date": "2024-02-01", "count": 4}]
