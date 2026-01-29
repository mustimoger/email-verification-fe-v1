from decimal import Decimal

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import billing_v2 as billing_v2_module
from app.api.billing_v2 import router as billing_v2_router
from app.core.auth import AuthContext
from app.core.settings import get_settings
from app.services.pricing_v2 import PricingConfigV2, PricingTierV2, compute_pricing_totals_v2


def _build_app(fake_user=None):
    class StubSettings:
        supabase_auth_cookie_name = "sb-access-token"
        supabase_url = "https://example.supabase.co"
        supabase_jwt_secret = "test-secret"
        dev_api_keys = []

    app = FastAPI()
    app.include_router(billing_v2_router)
    app.dependency_overrides[get_settings] = lambda: StubSettings()
    if fake_user is not None:
        app.dependency_overrides[billing_v2_module.get_current_user] = fake_user
        app.dependency_overrides[billing_v2_module.get_current_user_optional] = fake_user
    return app


@pytest.fixture()
def pricing_config():
    return PricingConfigV2(
        currency="USD",
        min_volume=2000,
        max_volume=10000000,
        step_size=1000,
        free_trial_credits=None,
        rounding_rule="floor_whole_dollar",
        metadata={
            "anchors": {
                "monthly": {
                    "10000": 37,
                    "25000": 56,
                }
            }
        },
    )


@pytest.fixture()
def pricing_tier():
    return PricingTierV2(
        mode="subscription",
        interval="month",
        min_quantity=10000,
        max_quantity=25000,
        unit_amount=Decimal("1.2667"),
        currency="USD",
        credits_per_unit=1000,
        paddle_price_id="pri_test",
        metadata={
            "paddle_custom_data": {"unit_amount_cents": 3700},
            "increment_price_id": "pri_inc",
            "increment_unit_amount_cents": 127,
        },
        sort_order=1,
        increment_price_id="pri_inc",
    )


def test_compute_pricing_totals_rounding(pricing_tier, pricing_config):
    totals = compute_pricing_totals_v2(18000, pricing_tier, pricing_config)
    assert totals.base_units == 1
    assert totals.increment_units == 8
    assert totals.units == 18
    assert totals.raw_total == Decimal("47.1333")
    assert totals.rounded_total == Decimal("47")
    assert totals.paddle_total == Decimal("47.16")
    assert totals.rounding_adjustment == Decimal("-0.16")
    assert totals.rounding_adjustment_cents == -16


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
    assert data["rounded_total"] == "37"
    assert data["rounding_adjustment_cents"] == 0
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

        async def get_price(self, price_id):
            class Obj:
                product_id = "pro_test"

            return Obj()

        async def list_discounts(self, code=None, status=None, mode=None):
            return {"data": []}

        async def create_discount(self, payload):
            return {"data": {"id": "dsc_test"}}

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
        json={"quantity": 20000, "mode": "subscription", "interval": "month"},
    )
    assert resp.status_code == 200, resp.text
    payload = captured["payload"]
    assert payload["items"][0]["price_id"] == "pri_test"
    assert payload["items"][0]["quantity"] == 1
    assert payload["items"][1]["price_id"] == "pri_inc"
    assert payload["items"][1]["quantity"] == 10
    assert payload["custom_data"]["supabase_user_id"] == "user-1"


def test_transaction_applies_negative_adjustment_with_discount(monkeypatch, pricing_config, pricing_tier):
    captured = {}

    class FakeClient:
        async def create_transaction(self, payload):
            captured["payload"] = payload.model_dump()

            class Obj:
                id = "txn_test"
                status = "ready"

            return Obj()

        async def list_discounts(self, code=None, status=None, mode=None):
            return {"data": []}

        async def create_discount(self, payload):
            return {"data": {"id": "dsc_test"}}

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
        json={"quantity": 18000, "mode": "subscription", "interval": "month"},
    )
    assert resp.status_code == 200, resp.text
    payload = captured["payload"]
    assert len(payload["items"]) == 2
    assert payload["items"][0]["price_id"] == "pri_test"
    assert payload["items"][0]["quantity"] == 1
    assert payload["items"][1]["price_id"] == "pri_inc"
    assert payload["items"][1]["quantity"] == 8
    assert payload["discount_id"] == "dsc_test"


def test_transaction_adds_fee_item_for_positive_adjustment(monkeypatch, pricing_config):
    captured = {}
    fee_tier = PricingTierV2(
        mode="subscription",
        interval="month",
        min_quantity=10000,
        max_quantity=25000,
        unit_amount=Decimal("1.2667"),
        currency="USD",
        credits_per_unit=1000,
        paddle_price_id="pri_test",
        metadata={
            "paddle_custom_data": {"unit_amount_cents": 2600},
            "increment_price_id": "pri_inc",
            "increment_unit_amount_cents": 0,
        },
        sort_order=1,
        increment_price_id="pri_inc",
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
    assert fee_item["price"]["unit_price"]["amount"] == "1100"


def test_config_endpoint_returns_checkout_metadata(monkeypatch, pricing_config):
    class StubEnv:
        checkout_script = "https://example.com/checkout.js"

    class StubConfig:
        status = "sandbox"
        checkout_enabled = True
        client_side_token = "token_123"
        seller_id = "seller_123"
        active_environment = StubEnv()

    def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t")

    monkeypatch.setattr(billing_v2_module, "get_pricing_config_v2", lambda: pricing_config)
    monkeypatch.setattr(billing_v2_module, "get_paddle_config", lambda: StubConfig())

    app = _build_app(fake_user)
    client = TestClient(app)

    resp = client.get("/api/billing/v2/config")
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["status"] == "sandbox"
    assert payload["checkout_enabled"] is True
    assert payload["checkout_script"] == "https://example.com/checkout.js"
    assert payload["client_side_token"] == "token_123"
    assert payload["pricing"]["min_volume"] == pricing_config.min_volume


def test_config_endpoint_allows_unauthenticated(monkeypatch, pricing_config):
    class StubEnv:
        checkout_script = "https://example.com/checkout.js"

    class StubConfig:
        status = "sandbox"
        checkout_enabled = True
        client_side_token = "token_123"
        seller_id = "seller_123"
        active_environment = StubEnv()

    monkeypatch.setattr(billing_v2_module, "get_pricing_config_v2", lambda: pricing_config)
    monkeypatch.setattr(billing_v2_module, "get_paddle_config", lambda: StubConfig())

    app = _build_app()
    client = TestClient(app)

    resp = client.get("/api/billing/v2/config")
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["pricing"]["min_volume"] == pricing_config.min_volume
