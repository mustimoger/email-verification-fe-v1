from fastapi import FastAPI
from fastapi.testclient import TestClient
from types import SimpleNamespace

from app.api.account import router as account_router
from app.api import account as account_module
from app.core.auth import AuthContext


def _build_app():
    app = FastAPI()
    app.include_router(account_router)
    return app


def test_avatar_upload_reads_bytes_and_sets_profile(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="u-5", claims={}, token="t")

    app.dependency_overrides[account_module.get_current_user] = fake_user

    uploaded = {}

    class FakeBucket:
        def list(self):
            return []

        def upload(self, path, content, options):
            uploaded["path"] = path
            uploaded["content"] = content
            uploaded["options"] = options
            return {}

        def get_public_url(self, path):
            return f"https://example.com/{path}"

    class FakeStorage:
        def from_(self, bucket):
            assert bucket == "avatars"
            return FakeBucket()

    monkeypatch.setattr(account_module, "get_storage", lambda: FakeStorage())
    profile_updates = []
    monkeypatch.setattr(
        account_module.supabase_client,
        "upsert_profile",
        lambda user_id, email, display_name, avatar_url=None: profile_updates.append(
            {"user_id": user_id, "avatar_url": avatar_url}
        )
        or {"user_id": user_id, "avatar_url": avatar_url},
    )
    monkeypatch.setattr(
        account_module,
        "get_settings",
        lambda: SimpleNamespace(
            supabase_url="http://example.com",
            supabase_service_role_key="service",
            supabase_jwt_secret="secret",
            email_api_base_url="http://example.com",
            email_api_key="key",
            supabase_auth_cookie_name="sb",
        ),
    )
    usage_calls = []
    monkeypatch.setattr(account_module, "record_usage", lambda *args, **kwargs: usage_calls.append(args))

    client = TestClient(app)
    resp = client.post(
        "/api/account/avatar",
        files={"file": ("avatar.png", b"abc123", "image/png")},
    )

    assert resp.status_code == 200
    assert uploaded["path"].endswith("avatar.png")
    assert uploaded["content"] == b"abc123"
    assert uploaded["options"]["content-type"] == "image/png"
    assert profile_updates and profile_updates[0]["avatar_url"].startswith("https://example.com/")
    assert usage_calls
