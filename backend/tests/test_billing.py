import json
from decimal import Decimal
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import billing as billing_module
from app.api.billing import router as billing_router
from app.core.auth import AuthContext
from app.paddle.client import PaddleAPIError
from app.paddle.config import get_paddle_config
from app.services.pricing_v2 import PricingTierV2


@pytest.fixture(autouse=True)
def env(monkeypatch):
    # Minimal env for paddle config
    monkeypatch.setenv("PADDLE_STATUS", "sandbox")
    monkeypatch.setenv("PADDLE_BILLING_CHECKOUT_ENABLED", "true")
    monkeypatch.setenv("PADDLE_CLIENT_SIDE_TOKEN", "test_client_token")
    monkeypatch.setenv("PADDLE_BILLING_SANDBOX_API_URL", "https://sandbox-api.paddle.com")
    monkeypatch.setenv("PADDLE_BILLING_SANDBOX_API_KEY", "pdl_sdbx_apikey_test")
    monkeypatch.setenv("PADDLE_BILLING_SANDBOX_CHECKOUT_SCRIPT", "https://sandbox-cdn.paddle.com/paddle/v2/paddle.js")
    monkeypatch.setenv("PADDLE_BILLING_SANDBOX_WEBHOOK_SECRET", "test_webhook_secret")
    monkeypatch.setenv("PADDLE_WEBHOOK_MAX_VARIANCE_SECONDS", "5")
    monkeypatch.setenv("PADDLE_WEBHOOK_TRUST_PROXY", "false")
    monkeypatch.setenv("PADDLE_ADDRESS_MODE", "checkout")
    monkeypatch.setenv(
        "PADDLE_BILLING_PLAN_DEFINITIONS",
        json.dumps(
            {
                "innovator": {
                    "product_id": "pro_123",
                    "metadata": {"credits": 500},
                    "prices": {
                        "monthly": {"price_id": "pri_monthly", "metadata": {"credits": 500}, "quantity": 1}
                    },
                }
            }
        ),
    )
    get_paddle_config.cache_clear()


@pytest.fixture(autouse=True)
def disable_external_credit_grants(monkeypatch):
    async def fake_grant_external_credits(**_kwargs):
        return None

    monkeypatch.setattr(billing_module, "grant_external_credits", fake_grant_external_credits)


def _build_app(monkeypatch, fake_user, overrides=None):
    app = FastAPI()
    app.include_router(billing_router)
    overrides = overrides or {}
    for dep, impl in overrides.items():
        app.dependency_overrides[dep] = impl
    app.dependency_overrides[billing_module.get_current_user] = fake_user
    return app


def test_create_transaction_creates_customer_checkout_address(monkeypatch):
    created = {}

    class FakeClient:
        async def create_customer(self, payload):
            created["customer"] = payload.model_dump()
            class Obj:
                id = "ctm_test"
            return Obj()

        async def create_address(self, payload):
            created["address"] = payload.model_dump()
            class Obj:
                id = "add_test"
            return Obj()

        async def create_transaction(self, payload):
            created["transaction"] = payload.model_dump()
            class Obj:
                id = "txn_test"
            return Obj()

    def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t")

    monkeypatch.setattr(billing_module, "get_paddle_client", lambda: FakeClient())
    monkeypatch.setattr(billing_module, "get_paddle_ids", lambda user_id: None)
    monkeypatch.setattr(billing_module, "upsert_paddle_ids", lambda user_id, c, a: created.setdefault("upsert", (c, a)))
    monkeypatch.setattr(
        billing_module,
        "get_billing_plan_by_price_id",
        lambda price_id: {"paddle_price_id": price_id, "credits": 500, "status": "active"},
    )
    monkeypatch.setattr(billing_module.supabase_client, "fetch_profile", lambda user_id: {"email": "user@example.com", "display_name": "Test"})

    app = _build_app(monkeypatch, fake_user)
    client = TestClient(app)

    resp = client.post("/api/billing/transactions", json={"price_id": "pri_monthly"})
    assert resp.status_code == 200, resp.text
    assert created["customer"]["email"] == "user@example.com"
    assert created["transaction"]["customer_id"] == "ctm_test"
    assert created["transaction"]["items"][0]["price_id"] == "pri_monthly"
    assert "address" not in created
    assert created["transaction"]["address_id"] is None
    assert created.get("upsert") == ("ctm_test", None)


@pytest.mark.parametrize(
    "customers_payload",
    [
        {"data": [{"id": "ctm_existing", "email": "user@example.com"}]},
        {"customers": [{"id": "ctm_existing", "email": "user@example.com"}]},
    ],
)
def test_create_transaction_reuses_customer_on_conflict(monkeypatch, customers_payload):
    created = {}

    class FakeClient:
        async def create_customer(self, payload):
            raise PaddleAPIError(status_code=409, message="Conflict", details={"error": "conflict"})

        async def list_customers(self, email=None):
            return customers_payload

        async def search_customers(self, search):
            raise AssertionError("search_customers should not be called when email match exists")

        async def create_transaction(self, payload):
            created["transaction"] = payload.model_dump()

            class Obj:
                id = "txn_test"

            return Obj()

    def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t")

    monkeypatch.setattr(billing_module, "get_paddle_client", lambda: FakeClient())
    monkeypatch.setattr(billing_module, "get_paddle_ids", lambda user_id: None)
    monkeypatch.setattr(billing_module, "upsert_paddle_ids", lambda user_id, c, a: created.setdefault("upsert", (c, a)))
    monkeypatch.setattr(
        billing_module,
        "get_billing_plan_by_price_id",
        lambda price_id: {"paddle_price_id": price_id, "credits": 500, "status": "active"},
    )
    monkeypatch.setattr(
        billing_module.supabase_client,
        "fetch_profile",
        lambda user_id: {"email": "user@example.com", "display_name": "Test"},
    )

    app = _build_app(monkeypatch, fake_user)
    client = TestClient(app)

    resp = client.post("/api/billing/transactions", json={"price_id": "pri_monthly"})
    assert resp.status_code == 200, resp.text
    assert created["transaction"]["customer_id"] == "ctm_existing"
    assert created.get("upsert") == ("ctm_existing", None)


def test_create_transaction_rejects_metadata(monkeypatch):
    called = {"resolve": False, "client": False}

    async def fake_resolve(user):
        called["resolve"] = True
        return "ctm_test", None

    class FakeClient:
        async def create_transaction(self, payload):
            called["client"] = True
            class Obj:
                id = "txn_test"
            return Obj()

    def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t")

    monkeypatch.setattr(billing_module, "_resolve_customer_and_address", fake_resolve)
    monkeypatch.setattr(billing_module, "get_paddle_client", lambda: FakeClient())
    monkeypatch.setattr(
        billing_module,
        "get_billing_plan_by_price_id",
        lambda price_id: {"paddle_price_id": price_id, "credits": 500, "status": "active"},
    )

    app = _build_app(monkeypatch, fake_user)
    client = TestClient(app)

    resp = client.post(
        "/api/billing/transactions",
        json={"price_id": "pri_monthly", "metadata": {"test": "value"}},
    )
    assert resp.status_code == 400
    assert called["resolve"] is False
    assert called["client"] is False


def test_webhook_grants_credits(monkeypatch):
    grant_call = {}

    def fake_verify_webhook(raw_body, signature_header, remote_ip, headers=None):
        return True

    def fake_record_event(**kwargs):
        grant_call["record"] = kwargs
        return True

    def fake_upsert_credit_grant(**kwargs):
        grant_call.update(kwargs)
        return True

    monkeypatch.setattr(billing_module, "verify_webhook", fake_verify_webhook)
    monkeypatch.setattr(billing_module, "get_pricing_tiers_by_price_ids_v2", lambda price_ids: {})
    monkeypatch.setattr(billing_module, "record_billing_event", lambda **kwargs: fake_record_event(**kwargs))
    monkeypatch.setattr(billing_module, "upsert_credit_grant", fake_upsert_credit_grant)
    monkeypatch.setattr(
        billing_module,
        "get_billing_plans_by_price_ids",
        lambda price_ids: [{"paddle_price_id": "pri_monthly", "credits": 500}],
    )

    app = _build_app(monkeypatch, lambda: AuthContext(user_id="u", claims={}, token="t"))
    client = TestClient(app)

    payload = {
        "event_id": "evt_1",
        "event_type": "transaction.completed",
        "data": {
            "transaction": {
                "id": "txn_1",
                "items": [{"price_id": "pri_monthly", "quantity": 1}],
                "custom_data": {"supabase_user_id": "user-abc"},
                "currency_code": "USD",
                "invoice_id": "inv_1",
                "invoice_number": "1234",
                "billed_at": "2025-12-21T11:55:34.191306Z",
                "customer": {"email": "buyer@example.com"},
                "details": {"totals": {"total": "2900", "currency_code": "USD"}},
            }
        },
    }
    resp = client.post("/api/billing/webhook", json=payload, headers={"Paddle-Signature": "ts=1;v1=valid"})
    assert resp.status_code == 200
    assert grant_call["credits_granted"] == 500
    assert grant_call["user_id"] == "user-abc"
    assert grant_call["source"] == "purchase"
    assert grant_call["source_id"] == "txn_1"


def test_webhook_grants_v2_annual_multiplier(monkeypatch):
    grant_call = {}

    def fake_verify_webhook(raw_body, signature_header, remote_ip, headers=None):
        return True

    def fake_record_event(**kwargs):
        grant_call["record"] = kwargs
        return True

    def fake_upsert_credit_grant(**kwargs):
        grant_call.update(kwargs)
        return True

    tier = PricingTierV2(
        mode="subscription",
        interval="year",
        min_quantity=10000,
        max_quantity=25000,
        unit_amount=Decimal("0.01"),
        currency="USD",
        credits_per_unit=1000,
        paddle_price_id="pri_annual_base",
        metadata={"increment_price_id": "pri_annual_inc"},
        sort_order=1,
        increment_price_id="pri_annual_inc",
    )

    monkeypatch.setattr(billing_module, "verify_webhook", fake_verify_webhook)
    monkeypatch.setattr(billing_module, "record_billing_event", fake_record_event)
    monkeypatch.setattr(billing_module, "upsert_credit_grant", fake_upsert_credit_grant)
    monkeypatch.setattr(
        billing_module,
        "get_pricing_tiers_by_price_ids_v2",
        lambda price_ids: {"pri_annual_base": tier, "pri_annual_inc": tier},
    )
    monkeypatch.setattr(billing_module, "get_billing_plans_by_price_ids", lambda price_ids: [])

    app = _build_app(monkeypatch, lambda: AuthContext(user_id="u", claims={}, token="t"))
    client = TestClient(app)

    payload = {
        "event_id": "evt_annual",
        "event_type": "transaction.completed",
        "data": {
            "transaction": {
                "id": "txn_annual",
                "items": [
                    {"price_id": "pri_annual_base", "quantity": 1},
                    {"price_id": "pri_annual_inc", "quantity": 2},
                ],
                "custom_data": {"supabase_user_id": "user-annual"},
            }
        },
    }
    resp = client.post("/api/billing/webhook", json=payload, headers={"Paddle-Signature": "ts=1;v1=valid"})
    assert resp.status_code == 200, resp.text
    assert grant_call["credits_granted"] == 144000
    assert grant_call["user_id"] == "user-annual"


def test_webhook_missing_price_mapping_returns_error(monkeypatch):
    called = {"record": False}

    def fake_verify_webhook(raw_body, signature_header, remote_ip, headers=None):
        return True

    def fake_record_event(**_kwargs):
        called["record"] = True
        return True

    monkeypatch.setattr(billing_module, "verify_webhook", fake_verify_webhook)
    monkeypatch.setattr(billing_module, "record_billing_event", fake_record_event)
    monkeypatch.setattr(billing_module, "get_pricing_tiers_by_price_ids_v2", lambda price_ids: {})
    monkeypatch.setattr(billing_module, "get_billing_plans_by_price_ids", lambda price_ids: [])

    app = _build_app(monkeypatch, lambda: AuthContext(user_id="u", claims={}, token="t"))
    client = TestClient(app)

    payload = {
        "event_id": "evt_missing",
        "event_type": "transaction.completed",
        "data": {
            "transaction": {
                "id": "txn_missing",
                "items": [{"price_id": "pri_missing", "quantity": 1}],
                "custom_data": {"supabase_user_id": "user-missing"},
            }
        },
    }
    resp = client.post("/api/billing/webhook", json=payload, headers={"Paddle-Signature": "ts=1;v1=valid"})
    assert resp.status_code == 500
    assert called["record"] is False


def test_webhook_credit_grant_failure_deletes_event(monkeypatch):
    deleted = {}

    def fake_verify_webhook(raw_body, signature_header, remote_ip, headers=None):
        return True

    def fake_record_event(**_kwargs):
        return True

    def fake_upsert_credit_grant(**_kwargs):
        return False

    def fake_delete_event(event_id):
        deleted["event_id"] = event_id
        return True

    monkeypatch.setattr(billing_module, "verify_webhook", fake_verify_webhook)
    monkeypatch.setattr(billing_module, "get_pricing_tiers_by_price_ids_v2", lambda price_ids: {})
    monkeypatch.setattr(billing_module, "record_billing_event", fake_record_event)
    monkeypatch.setattr(billing_module, "upsert_credit_grant", fake_upsert_credit_grant)
    monkeypatch.setattr(billing_module, "delete_billing_event", fake_delete_event)
    monkeypatch.setattr(
        billing_module,
        "get_billing_plans_by_price_ids",
        lambda price_ids: [{"paddle_price_id": "pri_monthly", "credits": 500}],
    )

    app = _build_app(monkeypatch, lambda: AuthContext(user_id="u", claims={}, token="t"))
    client = TestClient(app)

    payload = {
        "event_id": "evt_1",
        "event_type": "transaction.completed",
        "data": {
            "transaction": {
                "id": "txn_1",
                "items": [{"price_id": "pri_monthly", "quantity": 1}],
                "custom_data": {"supabase_user_id": "user-abc"},
            }
        },
    }
    resp = client.post("/api/billing/webhook", json=payload, headers={"Paddle-Signature": "ts=1;v1=valid"})
    assert resp.status_code == 500
    assert deleted["event_id"] == "evt_1"
