import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
import jwt
from types import SimpleNamespace

from app.services import supabase_client as supabase_client_module

from app.core.auth import get_current_user
from app.core.settings import get_settings


def _build_app():
    app = FastAPI()

    @app.get("/me")
    def me(user=Depends(get_current_user)):
        return {"user_id": user.user_id}

    return app


def _build_app_with_role():
    app = FastAPI()

    @app.get("/role")
    def role(user=Depends(get_current_user)):
        return {"role": user.role}

    return app


def test_auth_missing_token_returns_401(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    app = _build_app()
    client = TestClient(app)
    resp = client.get("/me")
    assert resp.status_code == 401


def test_auth_valid_token_via_cookie(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    token = jwt.encode(
        {"sub": "user-123", "aud": "authenticated", "confirmed_at": "2024-01-01T00:00:00Z"},
        "secret",
        algorithm="HS256",
    )
    app = _build_app()
    client = TestClient(app)
    client.cookies.set("cookie_name", token)
    resp = client.get("/me")
    assert resp.status_code == 200
    assert resp.json() == {"user_id": "user-123"}


def test_auth_admin_role_from_app_metadata(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    token = jwt.encode(
        {
            "sub": "user-123",
            "aud": "authenticated",
            "confirmed_at": "2024-01-01T00:00:00Z",
            "app_metadata": {"role": "admin"},
        },
        "secret",
        algorithm="HS256",
    )
    app = _build_app_with_role()
    client = TestClient(app)
    resp = client.get("/role", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == {"role": "admin"}


def test_auth_admin_role_from_top_level_claim(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    token = jwt.encode(
        {"sub": "user-123", "aud": "authenticated", "confirmed_at": "2024-01-01T00:00:00Z", "role": "admin"},
        "secret",
        algorithm="HS256",
    )
    app = _build_app_with_role()
    client = TestClient(app)
    resp = client.get("/role", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == {"role": "admin"}


def test_auth_admin_role_from_dev_api_key(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    monkeypatch.setenv("DEV_API_KEYS", "devkey")
    token = jwt.encode(
        {"sub": "user-123", "aud": "authenticated", "confirmed_at": "2024-01-01T00:00:00Z"},
        "secret",
        algorithm="HS256",
    )
    app = _build_app_with_role()
    client = TestClient(app)
    resp = client.get("/role", headers={"Authorization": f"Bearer {token}", "X-Dev-Api-Key": "devkey"})
    assert resp.status_code == 200
    assert resp.json() == {"role": "admin"}


def test_auth_confirmed_claim_skips_lookup(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    token = jwt.encode(
        {"sub": "user-123", "aud": "authenticated", "confirmed_at": "2024-01-01T00:00:00Z"},
        "secret",
        algorithm="HS256",
    )
    app = _build_app()
    client = TestClient(app)

    def should_not_run(*_args, **_kwargs):
        raise RuntimeError("fetch_auth_user should not be called when claim is confirmed")

    monkeypatch.setattr(supabase_client_module, "fetch_auth_user", should_not_run)
    resp = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200


def test_auth_confirmed_lookup_allows_access(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    token = jwt.encode({"sub": "user-123", "aud": "authenticated"}, "secret", algorithm="HS256")
    app = _build_app()
    client = TestClient(app)

    def lookup_user(_user_id: str):
        return SimpleNamespace(confirmed_at="2024-01-01T00:00:00Z", email_confirmed_at=None, email="user@test.com")

    monkeypatch.setattr(supabase_client_module, "fetch_auth_user", lookup_user)
    resp = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200


def test_auth_unconfirmed_lookup_denies_access(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    token = jwt.encode({"sub": "user-123", "aud": "authenticated"}, "secret", algorithm="HS256")
    app = _build_app()
    client = TestClient(app)

    def lookup_user(_user_id: str):
        return SimpleNamespace(confirmed_at=None, email_confirmed_at=None, email="user@test.com")

    monkeypatch.setattr(supabase_client_module, "fetch_auth_user", lookup_user)
    resp = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
    assert "confirm your email" in resp.json().get("detail", "").lower()
