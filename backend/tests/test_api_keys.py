import pytest

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import api_keys as api_keys_module
from app.api.api_keys import router
from app.config.integrations import IntegrationDefinition
from app.clients.external import APIKeySummary, CreateAPIKeyResponse, ListAPIKeysResponse
from app.core.auth import AuthContext


def _build_app(client_override, user_override):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[api_keys_module.get_user_external_client] = client_override
    app.dependency_overrides[api_keys_module.get_current_user] = user_override
    return app


def test_list_api_keys_filters_dashboard(monkeypatch):
    for key, value in [
        ("EMAIL_API_BASE_URL", "https://api.test"),
        ("SUPABASE_URL", "https://sb.test"),
        ("SUPABASE_SERVICE_ROLE_KEY", "srv"),
        ("SUPABASE_JWT_SECRET", "secret"),
        ("SUPABASE_AUTH_COOKIE_NAME", "sb-cookie"),
    ]:
        monkeypatch.setenv(key, value)

    def fake_user():
        return AuthContext(user_id="user-3", claims={}, token="t")

    class FakeClient:
        async def list_api_keys(self, user_id=None, start=None, end=None):
            return ListAPIKeysResponse(
                keys=[
                    APIKeySummary(id="kid-dashboard", name="dashboard_api", is_active=True, purpose="custom"),
                    APIKeySummary(id="kid-zapier", name="Zapier", is_active=True, purpose="zapier"),
                ],
                count=2,
            )

    monkeypatch.setattr(api_keys_module, "record_usage", lambda *args, **kwargs: None)
    app = _build_app(lambda: FakeClient(), fake_user)
    client = TestClient(app)
    resp = client.get("/api/api-keys")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 1
    assert data["keys"][0]["id"] == "kid-zapier"
    assert data["keys"][0]["name"] == "Zapier"
    assert data["keys"][0]["integration"] == "zapier"


def test_list_api_keys_maps_google_sheets_purpose(monkeypatch):
    for key, value in [
        ("EMAIL_API_BASE_URL", "https://api.test"),
        ("SUPABASE_URL", "https://sb.test"),
        ("SUPABASE_SERVICE_ROLE_KEY", "srv"),
        ("SUPABASE_JWT_SECRET", "secret"),
        ("SUPABASE_AUTH_COOKIE_NAME", "sb-cookie"),
    ]:
        monkeypatch.setenv(key, value)

    def fake_user():
        return AuthContext(user_id="user-3b", claims={}, token="t")

    class FakeClient:
        async def list_api_keys(self, user_id=None, start=None, end=None):
            return ListAPIKeysResponse(
                keys=[
                    APIKeySummary(id="kid-sheets", name="Sheets", is_active=True, purpose="google sheets"),
                ],
                count=1,
            )

    monkeypatch.setattr(api_keys_module, "record_usage", lambda *args, **kwargs: None)
    app = _build_app(lambda: FakeClient(), fake_user)
    client = TestClient(app)
    resp = client.get("/api/api-keys")
    assert resp.status_code == 200
    data = resp.json()
    assert data["keys"][0]["integration"] == "google-sheets"


def test_list_api_keys_passes_date_range(monkeypatch):
    for key, value in [
        ("EMAIL_API_BASE_URL", "https://api.test"),
        ("SUPABASE_URL", "https://sb.test"),
        ("SUPABASE_SERVICE_ROLE_KEY", "srv"),
        ("SUPABASE_JWT_SECRET", "secret"),
        ("SUPABASE_AUTH_COOKIE_NAME", "sb-cookie"),
    ]:
        monkeypatch.setenv(key, value)

    def fake_user():
        return AuthContext(user_id="user-3", claims={}, token="t")

    received = {}

    class FakeClient:
        async def list_api_keys(self, user_id=None, start=None, end=None):
            received["user_id"] = user_id
            received["start"] = start
            received["end"] = end
            return ListAPIKeysResponse(keys=[], count=0)

    monkeypatch.setattr(api_keys_module, "record_usage", lambda *args, **kwargs: None)
    app = _build_app(lambda: FakeClient(), fake_user)
    client = TestClient(app)
    resp = client.get("/api/api-keys?from=2024-02-01T00:00:00Z&to=2024-02-02T00:00:00Z")
    assert resp.status_code == 200
    assert received["user_id"] is None
    assert received["start"] == "2024-02-01T00:00:00+00:00"
    assert received["end"] == "2024-02-02T00:00:00+00:00"


def test_create_api_key_sets_integration(monkeypatch):
    for key, value in [
        ("EMAIL_API_BASE_URL", "https://api.test"),
        ("SUPABASE_URL", "https://sb.test"),
        ("SUPABASE_SERVICE_ROLE_KEY", "srv"),
        ("SUPABASE_JWT_SECRET", "secret"),
        ("SUPABASE_AUTH_COOKIE_NAME", "sb-cookie"),
    ]:
        monkeypatch.setenv(key, value)

    monkeypatch.setattr(api_keys_module, "get_integration_ids", lambda: ["zapier", "n8n", "google-sheets"])
    monkeypatch.setattr(
        api_keys_module,
        "get_integration_by_id",
        lambda integration_id: IntegrationDefinition(
            id=integration_id,
            label=integration_id,
            description="",
            external_purpose="zapier",
        ),
    )

    def fake_user():
        return AuthContext(user_id="user-4", claims={}, token="t")

    recorded = []

    class FakeClient:
        async def create_api_key(self, name: str, purpose: str, user_id: str | None = None):
            recorded.append(purpose)
            return CreateAPIKeyResponse(id="kid-new", key="plain-secret", name=name)
    monkeypatch.setattr(api_keys_module, "record_usage", lambda *args, **kwargs: None)
    app = _build_app(lambda: FakeClient(), fake_user)
    client = TestClient(app)
    resp = client.post("/api/api-keys", json={"name": "Zapier", "integration": "zapier"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["key"] == "plain-secret"
    assert data["integration"] == "zapier"
    assert recorded == ["zapier"]


def test_create_api_key_rejects_dashboard(monkeypatch):
    for key, value in [
        ("EMAIL_API_BASE_URL", "https://api.test"),
        ("SUPABASE_URL", "https://sb.test"),
        ("SUPABASE_SERVICE_ROLE_KEY", "srv"),
        ("SUPABASE_JWT_SECRET", "secret"),
        ("SUPABASE_AUTH_COOKIE_NAME", "sb-cookie"),
    ]:
        monkeypatch.setenv(key, value)

    monkeypatch.setattr(api_keys_module, "get_integration_ids", lambda: ["zapier", "n8n", "google-sheets"])

    def fake_user():
        return AuthContext(user_id="user-5", claims={}, token="t")

    app = _build_app(lambda: None, fake_user)
    client = TestClient(app)
    resp = client.post("/api/api-keys", json={"name": "dashboard_api", "integration": "zapier"})
    assert resp.status_code == 400


def test_list_api_keys_include_internal(monkeypatch):
    for key, value in [
        ("EMAIL_API_BASE_URL", "https://api.test"),
        ("SUPABASE_URL", "https://sb.test"),
        ("SUPABASE_SERVICE_ROLE_KEY", "srv"),
        ("SUPABASE_JWT_SECRET", "secret"),
        ("SUPABASE_AUTH_COOKIE_NAME", "sb-cookie"),
    ]:
        monkeypatch.setenv(key, value)

    def fake_user():
        return AuthContext(user_id="user-6", claims={}, token="t")

    class FakeClient:
        async def list_api_keys(self, user_id=None, start=None, end=None):
            return ListAPIKeysResponse(
                keys=[
                    APIKeySummary(id="kid-dashboard", name="dashboard_api", is_active=True),
                    APIKeySummary(id="kid-zapier", name="Zapier", is_active=True),
                ],
                count=2,
            )

    monkeypatch.setattr(api_keys_module, "record_usage", lambda *args, **kwargs: None)
    app = _build_app(lambda: FakeClient(), fake_user)
    client = TestClient(app)
    resp = client.get("/api/api-keys?include_internal=true")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 2
    assert {k["id"] for k in data["keys"]} == {"kid-dashboard", "kid-zapier"}


def test_list_api_keys_forbids_user_id_for_non_admin(monkeypatch):
    for key, value in [
        ("EMAIL_API_BASE_URL", "https://api.test"),
        ("SUPABASE_URL", "https://sb.test"),
        ("SUPABASE_SERVICE_ROLE_KEY", "srv"),
        ("SUPABASE_JWT_SECRET", "secret"),
        ("SUPABASE_AUTH_COOKIE_NAME", "sb-cookie"),
    ]:
        monkeypatch.setenv(key, value)

    def fake_user():
        return AuthContext(user_id="user-7", claims={}, token="t", role="user")

    app = _build_app(lambda: None, fake_user)
    client = TestClient(app)
    resp = client.get("/api/api-keys?user_id=target-user")
    assert resp.status_code == 403


def test_list_api_keys_allows_user_id_for_admin(monkeypatch):
    for key, value in [
        ("EMAIL_API_BASE_URL", "https://api.test"),
        ("SUPABASE_URL", "https://sb.test"),
        ("SUPABASE_SERVICE_ROLE_KEY", "srv"),
        ("SUPABASE_JWT_SECRET", "secret"),
        ("SUPABASE_AUTH_COOKIE_NAME", "sb-cookie"),
    ]:
        monkeypatch.setenv(key, value)

    def fake_user():
        return AuthContext(
            user_id="admin-1",
            claims={"app_metadata": {"role": "admin"}},
            token="t",
            role="admin",
        )

    captured = []

    class FakeClient:
        async def list_api_keys(self, user_id=None, start=None, end=None):
            captured.append(user_id)
            return ListAPIKeysResponse(keys=[], count=0)

    monkeypatch.setattr(api_keys_module, "record_usage", lambda *args, **kwargs: None)
    app = _build_app(lambda: FakeClient(), fake_user)
    client = TestClient(app)
    resp = client.get("/api/api-keys?user_id=target-user")
    assert resp.status_code == 200
    assert captured == ["target-user"]
