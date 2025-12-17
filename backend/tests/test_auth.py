import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
import jwt

from app.core.auth import get_current_user
from app.core.settings import get_settings


def _build_app():
    app = FastAPI()

    @app.get("/me")
    def me(user=Depends(get_current_user)):
        return {"user_id": user.user_id}

    return app


def test_auth_missing_token_returns_401(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("EMAIL_API_KEY", "key")
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
    monkeypatch.setenv("EMAIL_API_KEY", "key")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    token = jwt.encode({"sub": "user-123", "aud": "authenticated"}, "secret", algorithm="HS256")
    app = _build_app()
    client = TestClient(app)
    resp = client.get("/me", cookies={"cookie_name": token})
    assert resp.status_code == 200
    assert resp.json() == {"user_id": "user-123"}
