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
    usage_calls = []
    monkeypatch.setattr(account_module, "record_usage", lambda *args, **kwargs: usage_calls.append(args))
    monkeypatch.setattr(account_module.supabase_client, "fetch_profile", lambda user_id: None)

    client = TestClient(app)
    resp = client.get("/api/account/profile")
    assert resp.status_code == 404
    assert usage_calls == []


def test_get_profile_success(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-2", claims={}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user
    usage_calls = []
    monkeypatch.setattr(account_module, "record_usage", lambda *args, **kwargs: usage_calls.append(args))
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
    assert usage_calls  # one call recorded


def test_update_profile(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-3", claims={}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user
    updated = {"user_id": "u-3", "email": "new@test.com", "display_name": "New"}
    usage_calls = []
    monkeypatch.setattr(account_module, "record_usage", lambda *args, **kwargs: usage_calls.append(args))
    monkeypatch.setattr(account_module.supabase_client, "upsert_profile", lambda uid, email, display_name: updated)

    client = TestClient(app)
    resp = client.patch("/api/account/profile", json={"email": "new@test.com", "display_name": "New"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "new@test.com"
    assert usage_calls


def test_get_credits(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-4", claims={}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user
    usage_calls = []
    monkeypatch.setattr(account_module, "record_usage", lambda *args, **kwargs: usage_calls.append(args))
    monkeypatch.setattr(account_module.supabase_client, "fetch_credits", lambda user_id: 42)

    client = TestClient(app)
    resp = client.get("/api/account/credits")
    assert resp.status_code == 200
    assert resp.json()["credits_remaining"] == 42
    assert usage_calls
