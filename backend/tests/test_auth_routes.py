from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import auth as auth_module
from app.core.auth import AuthContext


def test_auth_confirmed_route_prefix():
    app = FastAPI()
    app.include_router(auth_module.router, prefix="/api")

    def fake_user():
        return AuthContext(
            user_id="user-123",
            claims={"email_confirmed_at": "2024-01-01T00:00:00Z"},
            token="token",
            role="user",
        )

    app.dependency_overrides[auth_module.get_current_user_allow_unconfirmed] = fake_user

    client = TestClient(app)
    resp = client.get("/api/auth/confirmed")

    assert resp.status_code == 200
    assert resp.json() == {"confirmed": True}
