import json

import pytest
from fastapi import FastAPI
import httpx

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import BatchFileUploadResponse
from app.core.auth import AuthContext


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


def _build_app(monkeypatch, fake_client):
    app = FastAPI()
    app.include_router(router)

    async def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t", role="user")

    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = lambda: fake_client
    return app


def _upload_payload():
    return {
        "file_metadata": json.dumps(
            [
                {
                    "file_name": "emails.csv",
                    "email_column": "A",
                    "first_row_has_labels": True,
                    "remove_duplicates": False,
                }
            ]
        )
    }


@pytest.mark.anyio
async def test_upload_uses_email_count_for_usage(monkeypatch):
    class FakeClient:
        async def upload_batch_file(self, filename, content, webhook_url=None, email_column=None):
            return BatchFileUploadResponse(
                status="ok",
                upload_id="u1",
                task_id="task-1",
                filename=filename,
                email_count=2,
            )

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/tasks/upload",
            files=[("files", ("emails.csv", b"email@example.com", "text/csv"))],
            data=_upload_payload(),
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["email_count"] == 2


@pytest.mark.anyio
async def test_upload_missing_email_count_returns_502(monkeypatch):
    class FakeClient:
        async def upload_batch_file(self, filename, content, webhook_url=None, email_column=None):
            return BatchFileUploadResponse(
                status="ok",
                upload_id="u1",
                task_id="task-1",
                filename=filename,
            )

    app = _build_app(monkeypatch, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/tasks/upload",
            files=[("files", ("emails.csv", b"email@example.com", "text/csv"))],
            data=_upload_payload(),
        )

    assert resp.status_code == 502
