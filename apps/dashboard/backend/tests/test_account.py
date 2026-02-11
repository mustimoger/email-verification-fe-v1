from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import account as account_module
from app.api.account import router as account_router
from app.core.auth import AuthContext


def _build_app():
    app = FastAPI()
    app.include_router(account_router)
    return app


def test_get_profile_not_found(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-1", claims={}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user
    monkeypatch.setattr(account_module.supabase_client, "fetch_profile", lambda user_id: None)

    client = TestClient(app)
    resp = client.get("/api/account/profile")
    assert resp.status_code == 404


def test_get_profile_success(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-2", claims={}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user
    monkeypatch.setattr(
        account_module.supabase_client,
        "fetch_profile",
        lambda user_id: {"user_id": user_id, "email": "x@test.com", "display_name": "X"},
    )

    client = TestClient(app)
    resp = client.get("/api/account/profile")
    assert resp.status_code == 200
    data = resp.json()
    assert data["user_id"] == "u-2"
    assert data["email"] == "x@test.com"


def test_update_profile(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-3", claims={"email": "new@test.com"}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user
    updated = {"user_id": "u-3", "email": "new@test.com", "display_name": "New"}
    monkeypatch.setattr(
        account_module.supabase_client,
        "upsert_profile",
        lambda uid, email, display_name, avatar_url=None: updated,
    )

    client = TestClient(app)
    resp = client.patch("/api/account/profile", json={"email": "new@test.com", "display_name": "New"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "new@test.com"


def test_update_profile_email_mismatch(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-5", claims={"email": "old@test.com"}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user
    monkeypatch.setattr(
        account_module.supabase_client,
        "upsert_profile",
        lambda uid, email, display_name, avatar_url=None: {"user_id": uid, "email": email, "display_name": display_name},
    )

    client = TestClient(app)
    resp = client.patch("/api/account/profile", json={"email": "new@test.com"})
    assert resp.status_code == 403


def test_update_profile_email_match(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-6", claims={"email": "same@test.com"}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user
    updated = {"user_id": "u-6", "email": "same@test.com", "display_name": "Same"}
    monkeypatch.setattr(
        account_module.supabase_client,
        "upsert_profile",
        lambda uid, email, display_name, avatar_url=None: updated,
    )

    client = TestClient(app)
    resp = client.patch("/api/account/profile", json={"email": "same@test.com", "display_name": "Same"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "same@test.com"


def test_get_credits(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-4", claims={}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user
    app.dependency_overrides[account_module.get_user_external_client] = lambda: _FakeCreditsClient(credits=250)

    client = TestClient(app)
    resp = client.get("/api/account/credits")
    assert resp.status_code == 200
    assert resp.json()["credits_remaining"] == 250


def test_get_credits_handles_external_error(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-7", claims={}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user
    app.dependency_overrides[account_module.get_user_external_client] = _fake_credits_client_error

    client = TestClient(app)
    resp = client.get("/api/account/credits")
    assert resp.status_code == 200
    assert resp.json()["credits_remaining"] is None


def test_get_profile_retries_transient_failure(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-8", claims={}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user
    attempts = {"count": 0}

    def fake_fetch_profile(user_id):
        attempts["count"] += 1
        if attempts["count"] == 1:
            raise RuntimeError("temporary profile read error")
        return {"user_id": user_id, "email": "retry@test.com", "display_name": "Retry"}

    monkeypatch.setattr(account_module.supabase_client, "fetch_profile", fake_fetch_profile)

    client = TestClient(app)
    resp = client.get("/api/account/profile")
    assert resp.status_code == 200
    assert resp.json()["email"] == "retry@test.com"
    assert attempts["count"] == 2


def test_get_profile_retry_exhausted_returns_502(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-9", claims={}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user

    def always_fail(_user_id):
        raise RuntimeError("profile backend down")

    monkeypatch.setattr(account_module.supabase_client, "fetch_profile", always_fail)

    client = TestClient(app)
    resp = client.get("/api/account/profile")
    assert resp.status_code == 502
    assert resp.json()["detail"] == "Profile service unavailable"


def test_get_purchases_retries_transient_failure(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-10", claims={}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user
    attempts = {"count": 0}

    def fake_list_credit_grants(*, user_id, source, limit, offset):
        attempts["count"] += 1
        if attempts["count"] == 1:
            raise RuntimeError("temporary purchase read error")
        return [
            {
                "transaction_id": "txn-1",
                "event_type": "transaction.completed",
                "credits_granted": 250,
                "price_ids": ["pri_123"],
            }
        ]

    monkeypatch.setattr(account_module, "list_credit_grants", fake_list_credit_grants)

    client = TestClient(app)
    resp = client.get("/api/account/purchases")
    assert resp.status_code == 200
    assert resp.json()["items"][0]["transaction_id"] == "txn-1"
    assert attempts["count"] == 2


def test_get_purchases_retry_exhausted_returns_502(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-11", claims={}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user

    def always_fail(*, user_id, source, limit, offset):
        raise RuntimeError("purchase backend down")

    monkeypatch.setattr(account_module, "list_credit_grants", always_fail)

    client = TestClient(app)
    resp = client.get("/api/account/purchases")
    assert resp.status_code == 502
    assert resp.json()["detail"] == "Purchase history unavailable"


class _FakeBalance:
    def __init__(self, balance: int):
        self.balance = balance


class _FakeCreditsClient:
    def __init__(self, credits: int):
        self._credits = credits

    async def get_credit_balance(self):
        return _FakeBalance(self._credits)


def _fake_credits_client_error():
    class _ErrorClient:
        async def get_credit_balance(self):
            raise account_module.ExternalAPIError(status_code=503, message="down", details="unavailable")

    return _ErrorClient()
