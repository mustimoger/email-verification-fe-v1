import json
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import billing as billing_module
from app.api.billing import router as billing_router
from app.core.auth import AuthContext
from app.paddle.config import get_paddle_config


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
    granted = {}

    def fake_verify_webhook(raw_body, signature_header, remote_ip, headers=None):
        return True

    def fake_record_event(**kwargs):
        granted["record"] = kwargs
        return True

    def fake_grant_credits(user_id, credits):
        granted["credits"] = credits
        granted["user_id"] = user_id
        return {"user_id": user_id, "credits_remaining": credits}

    monkeypatch.setattr(billing_module, "verify_webhook", fake_verify_webhook)
    monkeypatch.setattr(billing_module, "record_billing_event", lambda **kwargs: fake_record_event(**kwargs))
    monkeypatch.setattr(billing_module, "grant_credits", fake_grant_credits)
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
    assert resp.status_code == 200
    assert granted["credits"] == 500
    assert granted["user_id"] == "user-abc"
