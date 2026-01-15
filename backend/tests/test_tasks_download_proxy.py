import pytest
from fastapi import FastAPI
import httpx

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import DownloadedFile
from app.core.auth import AuthContext

TASK_ID = "11111111-1111-1111-1111-111111111111"


def _build_app(fake_user, fake_client):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = lambda: fake_client
    return app


@pytest.mark.anyio
async def test_tasks_download_proxies_file(monkeypatch):
    async def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t", role="user")

    class FakeClient:
        async def download_task_results(self, task_id: str, file_format: str | None = None):
            assert task_id == TASK_ID
            assert file_format == "csv"
            return DownloadedFile(
                content=b"email,status\nfoo@example.com,exists\n",
                content_type="text/csv",
                content_disposition=f'attachment; filename="{TASK_ID}.csv"',
            )

    app = _build_app(fake_user, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/tasks/{TASK_ID}/download?format=csv")

    assert resp.status_code == 200
    assert resp.content == b"email,status\nfoo@example.com,exists\n"
    assert resp.headers["content-disposition"] == f'attachment; filename="{TASK_ID}.csv"'
    assert resp.headers["content-type"].startswith("text/csv")


@pytest.mark.anyio
async def test_tasks_download_requires_content_type(monkeypatch):
    async def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t", role="user")

    class FakeClient:
        async def download_task_results(self, task_id: str, file_format: str | None = None):
            return DownloadedFile(content=b"data", content_type=None, content_disposition=None)

    app = _build_app(fake_user, FakeClient())
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/tasks/{TASK_ID}/download")

    assert resp.status_code == 502
