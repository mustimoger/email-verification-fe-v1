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
