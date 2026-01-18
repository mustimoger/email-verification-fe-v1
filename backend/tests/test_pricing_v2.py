from decimal import Decimal

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import billing_v2 as billing_v2_module
from app.api.billing_v2 import router as billing_v2_router
from app.core.auth import AuthContext
from app.services.pricing_v2 import PricingConfigV2, PricingTierV2, compute_pricing_totals_v2


def _build_app(fake_user=None):
    app = FastAPI()
    app.include_router(billing_v2_router)
    if fake_user is not None:
        app.dependency_overrides[billing_v2_module.get_current_user] = fake_user
    return app


@pytest.fixture()
def pricing_config():
    return PricingConfigV2(
        currency="USD",
        min_volume=2000,
        max_volume=10000000,
        step_size=1000,
        rounding_rule="half_up",
        metadata={},
    )


@pytest.fixture()
def pricing_tier():
    return PricingTierV2(
        mode="subscription",
        interval="month",
        min_quantity=2000,
        max_quantity=10000,
        unit_amount=Decimal("3.145"),
        currency="USD",
        credits_per_unit=1000,
        paddle_price_id="pri_test",
        metadata={"paddle_custom_data": {"unit_amount_cents": 315}},
        sort_order=1,
    )


def test_compute_pricing_totals_rounding(pricing_tier):
    totals = compute_pricing_totals_v2(10000, pricing_tier)
    assert totals.units == 10
    assert totals.raw_total == Decimal("31.4500")
    assert totals.rounded_total == Decimal("31")
    assert totals.paddle_total == Decimal("31.50")
    assert totals.rounding_adjustment == Decimal("-0.50")
    assert totals.rounding_adjustment_cents == -50


def test_quote_rejects_invalid_step(monkeypatch, pricing_config, pricing_tier):
    monkeypatch.setattr(billing_v2_module, "get_pricing_config_v2", lambda: pricing_config)
    monkeypatch.setattr(billing_v2_module, "select_pricing_tier_v2", lambda *args, **kwargs: pricing_tier)
    app = _build_app()
    client = TestClient(app)

    resp = client.post("/api/billing/v2/quote", json={"quantity": 2500, "mode": "subscription", "interval": "month"})
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "invalid_step"


def test_quote_returns_totals(monkeypatch, pricing_config, pricing_tier):
    monkeypatch.setattr(billing_v2_module, "get_pricing_config_v2", lambda: pricing_config)
    monkeypatch.setattr(billing_v2_module, "select_pricing_tier_v2", lambda *args, **kwargs: pricing_tier)
    app = _build_app()
    client = TestClient(app)

    resp = client.post("/api/billing/v2/quote", json={"quantity": 10000, "mode": "subscription", "interval": "month"})
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["rounded_total"] == "31"
    assert data["rounding_adjustment_cents"] == -50
    assert data["tier"]["paddle_price_id"] == "pri_test"


def test_transaction_builds_items(monkeypatch, pricing_config, pricing_tier):
    captured = {}

    class FakeClient:
        async def create_transaction(self, payload):
            captured["payload"] = payload.model_dump()

            class Obj:
                id = "txn_test"
                status = "ready"

            return Obj()

    def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t")

    async def fake_resolve(user):
        return "ctm_test", None

    monkeypatch.setattr(billing_v2_module, "get_pricing_config_v2", lambda: pricing_config)
    monkeypatch.setattr(billing_v2_module, "select_pricing_tier_v2", lambda *args, **kwargs: pricing_tier)
    monkeypatch.setattr(billing_v2_module, "_resolve_customer_and_address", fake_resolve)
    monkeypatch.setattr(billing_v2_module, "get_paddle_client", lambda: FakeClient())

    app = _build_app(fake_user)
    client = TestClient(app)

    resp = client.post(
        "/api/billing/v2/transactions",
        json={"quantity": 2000, "mode": "subscription", "interval": "month"},
    )
    assert resp.status_code == 200, resp.text
    payload = captured["payload"]
    assert payload["items"][0]["price_id"] == "pri_test"
    assert payload["items"][0]["quantity"] == 2
    assert payload["custom_data"]["supabase_user_id"] == "user-1"


def test_transaction_adds_discount_for_negative_adjustment(monkeypatch, pricing_config, pricing_tier):
    captured = {}

    class FakeClient:
        async def create_transaction(self, payload):
            captured["payload"] = payload.model_dump()

            class Obj:
                id = "txn_test"
                status = "ready"

            return Obj()

    def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t")

    async def fake_resolve(user):
        return "ctm_test", None

    monkeypatch.setattr(billing_v2_module, "get_pricing_config_v2", lambda: pricing_config)
    monkeypatch.setattr(billing_v2_module, "select_pricing_tier_v2", lambda *args, **kwargs: pricing_tier)
    monkeypatch.setattr(billing_v2_module, "_resolve_customer_and_address", fake_resolve)
    monkeypatch.setattr(billing_v2_module, "get_paddle_client", lambda: FakeClient())

    app = _build_app(fake_user)
    client = TestClient(app)

    resp = client.post(
        "/api/billing/v2/transactions",
        json={"quantity": 10000, "mode": "subscription", "interval": "month"},
    )
    assert resp.status_code == 200, resp.text
    payload = captured["payload"]
    assert payload["discount"]["amount"] == "50"
    assert payload["discount"]["type"] == "flat"


def test_transaction_adds_fee_item_for_positive_adjustment(monkeypatch, pricing_config):
    captured = {}
    fee_tier = PricingTierV2(
        mode="subscription",
        interval="month",
        min_quantity=2000,
        max_quantity=10000,
        unit_amount=Decimal("0.262"),
        currency="USD",
        credits_per_unit=1000,
        paddle_price_id="pri_test",
        metadata={"paddle_custom_data": {"unit_amount_cents": 26}},
        sort_order=1,
    )

    class FakeClient:
        async def create_transaction(self, payload):
            captured["payload"] = payload.model_dump()

            class Obj:
                id = "txn_test"
                status = "ready"

            return Obj()

        async def get_price(self, price_id):
            class Obj:
                product_id = "pro_test"

            return Obj()

    def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t")

    async def fake_resolve(user):
        return "ctm_test", None

    monkeypatch.setattr(billing_v2_module, "get_pricing_config_v2", lambda: pricing_config)
    monkeypatch.setattr(billing_v2_module, "select_pricing_tier_v2", lambda *args, **kwargs: fee_tier)
    monkeypatch.setattr(billing_v2_module, "_resolve_customer_and_address", fake_resolve)
    monkeypatch.setattr(billing_v2_module, "get_paddle_client", lambda: FakeClient())

    app = _build_app(fake_user)
    client = TestClient(app)

    resp = client.post(
        "/api/billing/v2/transactions",
        json={"quantity": 10000, "mode": "subscription", "interval": "month"},
    )
    assert resp.status_code == 200, resp.text
    payload = captured["payload"]
    assert len(payload["items"]) == 2
    fee_item = payload["items"][1]
    assert fee_item["price"]["product_id"] == "pro_test"
    assert fee_item["price"]["unit_price"]["amount"] == "40"
