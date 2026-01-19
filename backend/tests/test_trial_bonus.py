from datetime import datetime, timezone

import httpx
import pytest
from fastapi import FastAPI

from app.api import credits as credits_module
from app.api.credits import router
from app.core.auth import AuthContext
from app.services.pricing_v2 import PricingConfigV2


def _build_app(monkeypatch, auth_user, grants, inserted, config):
    app = FastAPI()
    app.include_router(router)

    async def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t", role="user")

    monkeypatch.setattr(credits_module, "get_pricing_config_v2", lambda: config)
    monkeypatch.setattr(credits_module.supabase_client, "fetch_auth_user", lambda _user_id: auth_user)
    monkeypatch.setattr(credits_module, "list_credit_grants", lambda **_kwargs: grants)
    monkeypatch.setattr(credits_module, "upsert_credit_grant", lambda **_kwargs: inserted)

    app.dependency_overrides[credits_module.get_current_user_allow_unconfirmed] = fake_user
    return app


def _config(credits):
    return PricingConfigV2(
        currency="USD",
        min_volume=2000,
        max_volume=10000000,
        step_size=1000,
        free_trial_credits=credits,
        rounding_rule="half_up",
        metadata={},
    )


@pytest.mark.anyio
async def test_trial_bonus_applies_for_confirmed_user(monkeypatch):
    now = datetime.now(timezone.utc)

    class FakeAuthUser:
        email_confirmed_at = now.isoformat()

    app = _build_app(monkeypatch, FakeAuthUser(), grants=[], inserted=True, config=_config(120))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/credits/trial-bonus")

    assert resp.status_code == 200
    assert resp.json()["status"] == "applied"
    assert resp.json()["credits_granted"] == 120


@pytest.mark.anyio
async def test_trial_bonus_returns_duplicate(monkeypatch):
    now = datetime.now(timezone.utc)

    class FakeAuthUser:
        email_confirmed_at = now.isoformat()

    app = _build_app(
        monkeypatch,
        FakeAuthUser(),
        grants=[{"credits_granted": 120}],
        inserted=True,
        config=_config(120),
    )
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/credits/trial-bonus")

    assert resp.status_code == 200
    assert resp.json()["status"] == "duplicate"
    assert resp.json()["credits_granted"] == 120


@pytest.mark.anyio
async def test_trial_bonus_blocks_when_unconfirmed(monkeypatch):
    class FakeAuthUser:
        email_confirmed_at = None

    app = _build_app(monkeypatch, FakeAuthUser(), grants=[], inserted=True, config=_config(120))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/credits/trial-bonus")

    assert resp.status_code == 403


@pytest.mark.anyio
async def test_trial_bonus_requires_config(monkeypatch):
    now = datetime.now(timezone.utc)

    class FakeAuthUser:
        email_confirmed_at = now.isoformat()

    app = _build_app(monkeypatch, FakeAuthUser(), grants=[], inserted=True, config=_config(None))
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/credits/trial-bonus")

    assert resp.status_code == 503
