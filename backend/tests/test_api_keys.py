import pytest
import asyncio

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import api_keys as api_keys_module
from app.api.api_keys import router
from app.services import api_keys as api_keys_service
from app.clients.external import APIKeySummary, CreateAPIKeyResponse, ListAPIKeysResponse
from app.core.auth import AuthContext


def _build_app(client_override, user_override):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[api_keys_module.get_external_api_client] = client_override
    app.dependency_overrides[api_keys_module.get_current_user] = user_override
    return app


def test_resolve_user_api_key_creates_when_missing(monkeypatch):
    recorded = []

    class MasterClient:
        async def create_api_key(self, name: str):
            return CreateAPIKeyResponse(id="kid-123", key="secret-123", name=name)

    monkeypatch.setattr(api_keys_service, "get_cached_key_by_name", lambda user_id, name: None)

    def fake_cache(user_id, key_id, name, key_plain=None, integration=None):
        recorded.append((user_id, key_id, name, key_plain, integration))

    monkeypatch.setattr(api_keys_service, "cache_api_key", fake_cache)

    secret, key_id = asyncio.run(
        api_keys_service.resolve_user_api_key("user-1", "dashboard_api", MasterClient())
    )
    assert secret == "secret-123"
    assert key_id == "kid-123"
    assert recorded == [("user-1", "kid-123", "dashboard_api", "secret-123", None)]


def test_resolve_user_api_key_uses_cached_secret(monkeypatch):
    called = []

    def fake_cached(user_id, name):
        return {"key_id": "kid-999", "name": name, "key_plain": "secret-999"}

    class MasterClient:
        async def create_api_key(self, name: str):
            called.append(name)
            return CreateAPIKeyResponse(id="unexpected", key="unexpected", name=name)

    monkeypatch.setattr(api_keys_service, "get_cached_key_by_name", fake_cached)
    secret, key_id = asyncio.run(
        api_keys_service.resolve_user_api_key("user-2", "dashboard_api", MasterClient())
    )
    assert secret == "secret-999"
    assert key_id == "kid-999"
    assert called == []


def test_list_api_keys_filters_dashboard(monkeypatch):
    for key, value in [
        ("EMAIL_API_BASE_URL", "https://api.test"),
        ("EMAIL_API_KEY", "devkey"),
        ("SUPABASE_URL", "https://sb.test"),
        ("SUPABASE_SERVICE_ROLE_KEY", "srv"),
        ("SUPABASE_JWT_SECRET", "secret"),
        ("SUPABASE_AUTH_COOKIE_NAME", "sb-cookie"),
    ]:
        monkeypatch.setenv(key, value)

    def fake_user():
        return AuthContext(user_id="user-3", claims={}, token="t")

    def fake_cached(user_id):
        return [
            {"key_id": "kid-dashboard", "name": "dashboard_api"},
            {"key_id": "kid-zapier", "name": "Zapier"},
        ]

    class FakeClient:
        async def list_api_keys(self):
            return ListAPIKeysResponse(
                keys=[
                    APIKeySummary(id="kid-dashboard", name="dashboard_api", is_active=True),
                    APIKeySummary(id="kid-zapier", name="Zapier", is_active=True),
                ],
                count=2,
            )

    monkeypatch.setattr(api_keys_module, "list_cached_keys", fake_cached)
    monkeypatch.setattr(api_keys_module, "record_usage", lambda *args, **kwargs: None)
    app = _build_app(lambda: FakeClient(), fake_user)
    client = TestClient(app)
    resp = client.get("/api/api-keys")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 1
    assert data["keys"][0]["id"] == "kid-zapier"
    assert data["keys"][0]["name"] == "Zapier"


def test_create_api_key_caches_secret(monkeypatch):
    for key, value in [
        ("EMAIL_API_BASE_URL", "https://api.test"),
        ("EMAIL_API_KEY", "devkey"),
        ("SUPABASE_URL", "https://sb.test"),
        ("SUPABASE_SERVICE_ROLE_KEY", "srv"),
        ("SUPABASE_JWT_SECRET", "secret"),
        ("SUPABASE_AUTH_COOKIE_NAME", "sb-cookie"),
    ]:
        monkeypatch.setenv(key, value)

    monkeypatch.setattr(api_keys_module, "get_integration_ids", lambda: ["Zapier", "n8n", "google-sheets", "custom"])

    def fake_user():
        return AuthContext(user_id="user-4", claims={}, token="t")

    recorded = []

    class FakeClient:
        async def create_api_key(self, name: str):
            return CreateAPIKeyResponse(id="kid-new", key="plain-secret", name=name)

    def fake_cache(user_id, key_id, name, key_plain=None, integration=None):
        recorded.append((user_id, key_id, name, key_plain, integration))

    monkeypatch.setattr(api_keys_module, "cache_api_key", fake_cache)
    monkeypatch.setattr(api_keys_module, "record_usage", lambda *args, **kwargs: None)
    app = _build_app(lambda: FakeClient(), fake_user)
    client = TestClient(app)
    resp = client.post("/api/api-keys", json={"name": "Zapier", "integration": "Zapier"})
    assert resp.status_code == 200
    assert recorded == [("user-4", "kid-new", "Zapier", "plain-secret", "Zapier")]


def test_create_api_key_rejects_dashboard(monkeypatch):
    for key, value in [
        ("EMAIL_API_BASE_URL", "https://api.test"),
        ("EMAIL_API_KEY", "devkey"),
        ("SUPABASE_URL", "https://sb.test"),
        ("SUPABASE_SERVICE_ROLE_KEY", "srv"),
        ("SUPABASE_JWT_SECRET", "secret"),
        ("SUPABASE_AUTH_COOKIE_NAME", "sb-cookie"),
    ]:
        monkeypatch.setenv(key, value)

    monkeypatch.setattr(api_keys_module, "get_integration_ids", lambda: ["Zapier", "n8n", "google-sheets", "custom"])

    def fake_user():
        return AuthContext(user_id="user-5", claims={}, token="t")

    app = _build_app(lambda: None, fake_user)
    client = TestClient(app)
    resp = client.post("/api/api-keys", json={"name": "dashboard_api"})
    assert resp.status_code == 400


def test_list_api_keys_include_internal(monkeypatch):
    for key, value in [
        ("EMAIL_API_BASE_URL", "https://api.test"),
        ("EMAIL_API_KEY", "devkey"),
        ("SUPABASE_URL", "https://sb.test"),
        ("SUPABASE_SERVICE_ROLE_KEY", "srv"),
        ("SUPABASE_JWT_SECRET", "secret"),
        ("SUPABASE_AUTH_COOKIE_NAME", "sb-cookie"),
    ]:
        monkeypatch.setenv(key, value)

    def fake_user():
        return AuthContext(user_id="user-6", claims={}, token="t")

    def fake_cached(user_id):
        return [
            {"key_id": "kid-dashboard", "name": "dashboard_api"},
            {"key_id": "kid-zapier", "name": "Zapier"},
        ]

    class FakeClient:
        async def list_api_keys(self):
            return ListAPIKeysResponse(
                keys=[
                    APIKeySummary(id="kid-dashboard", name="dashboard_api", is_active=True),
                    APIKeySummary(id="kid-zapier", name="Zapier", is_active=True),
                ],
                count=2,
            )

    monkeypatch.setattr(api_keys_module, "list_cached_keys", fake_cached)
    monkeypatch.setattr(api_keys_module, "record_usage", lambda *args, **kwargs: None)
    app = _build_app(lambda: FakeClient(), fake_user)
    client = TestClient(app)
    resp = client.get("/api/api-keys?include_internal=true")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] == 2
    assert {k["id"] for k in data["keys"]} == {"kid-dashboard", "kid-zapier"}
