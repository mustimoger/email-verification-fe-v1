from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
import httpx

from app.api import credits as credits_module
from app.api.credits import router
from app.core.auth import AuthContext


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("MANUAL_MAX_EMAILS", "10000")
    monkeypatch.setenv("LATEST_UPLOADS_LIMIT", "5")
    monkeypatch.setenv("SIGNUP_BONUS_CREDITS", "100")
    monkeypatch.setenv("SIGNUP_BONUS_MAX_ACCOUNT_AGE_SECONDS", "3600")
    monkeypatch.setenv("SIGNUP_BONUS_REQUIRE_EMAIL_CONFIRMED", "true")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


def _build_app(monkeypatch, auth_user, grants, inserted):
    app = FastAPI()
    app.include_router(router)

    async def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t", role="user")

    monkeypatch.setattr(credits_module.supabase_client, "fetch_auth_user", lambda _user_id: auth_user)
    monkeypatch.setattr(credits_module, "list_credit_grants", lambda **_kwargs: grants)
    monkeypatch.setattr(credits_module, "upsert_credit_grant", lambda **_kwargs: inserted)

    app.dependency_overrides[credits_module.get_current_user_allow_unconfirmed] = fake_user
    return app


@pytest.mark.anyio
async def test_signup_bonus_applies_for_new_confirmed_user(monkeypatch):
    now = datetime.now(timezone.utc)

    class FakeAuthUser:
        created_at = (now - timedelta(minutes=5)).isoformat()
        email_confirmed_at = now.isoformat()

    app = _build_app(monkeypatch, FakeAuthUser(), grants=[], inserted=True)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/credits/signup-bonus")

    assert resp.status_code == 200
    assert resp.json()["status"] == "applied"
    assert resp.json()["credits_granted"] == 100


@pytest.mark.anyio
async def test_signup_bonus_blocks_when_account_too_old(monkeypatch):
    now = datetime.now(timezone.utc)

    class FakeAuthUser:
        created_at = (now - timedelta(hours=2)).isoformat()
        email_confirmed_at = now.isoformat()

    app = _build_app(monkeypatch, FakeAuthUser(), grants=[], inserted=True)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/credits/signup-bonus")

    assert resp.status_code == 409


@pytest.mark.anyio
async def test_signup_bonus_blocks_when_email_unconfirmed(monkeypatch):
    now = datetime.now(timezone.utc)

    class FakeAuthUser:
        created_at = (now - timedelta(minutes=10)).isoformat()
        email_confirmed_at = None

    app = _build_app(monkeypatch, FakeAuthUser(), grants=[], inserted=True)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/credits/signup-bonus")

    assert resp.status_code == 403


@pytest.mark.anyio
async def test_signup_bonus_returns_duplicate_when_already_granted(monkeypatch):
    now = datetime.now(timezone.utc)

    class FakeAuthUser:
        created_at = (now - timedelta(minutes=10)).isoformat()
        email_confirmed_at = now.isoformat()

    app = _build_app(
        monkeypatch,
        FakeAuthUser(),
        grants=[{"credits_granted": 100}],
        inserted=True,
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/credits/signup-bonus")

    assert resp.status_code == 200
    assert resp.json()["status"] == "duplicate"
