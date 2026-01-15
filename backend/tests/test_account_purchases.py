from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import account as account_module
from app.api.account import router as account_router
from app.core.auth import AuthContext


def test_account_purchases_returns_items(monkeypatch):
    app = FastAPI()
    app.include_router(account_router)

    def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t")

    purchases = [
        {
            "transaction_id": "txn_1",
            "event_type": "transaction.completed",
            "credits_granted": 1000,
            "amount": 2900,
        }
    ]

    app.dependency_overrides[account_module.get_current_user] = fake_user
    monkeypatch.setattr(account_module, "record_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        account_module,
        "list_credit_grants",
        lambda user_id, source=None, limit=None, offset=None: purchases,
    )

    client = TestClient(app)
    resp = client.get("/api/account/purchases")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"][0]["transaction_id"] == "txn_1"
    assert data["items"][0]["event_type"] == "transaction.completed"
    assert data["items"][0]["credits_granted"] == 1000
    assert data["items"][0]["amount"] == 2900


def test_account_purchases_requires_limit_with_offset(monkeypatch):
    app = FastAPI()
    app.include_router(account_router)

    def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user
    monkeypatch.setattr(account_module, "record_usage", lambda *args, **kwargs: None)

    client = TestClient(app)
    resp = client.get("/api/account/purchases?offset=10")
    assert resp.status_code == 400
