from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import DownloadedFile, TaskDetailResponse, TaskEmailJob, TaskMetrics
from app.core.auth import AuthContext

TASK_ID = "11111111-1111-1111-1111-111111111111"


def _build_app(monkeypatch, fake_user, fake_client, task_file):
    app = FastAPI()
    app.include_router(router)
    monkeypatch.setattr(tasks_module, "fetch_task_file", lambda user_id, task_id: task_file)
    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = lambda: fake_client
    return app


def test_tasks_download_proxies_file(monkeypatch):
    def fake_user():
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

    app = _build_app(monkeypatch, fake_user, FakeClient(), {"task_id": TASK_ID})
    client = TestClient(app)
    resp = client.get(f"/api/tasks/{TASK_ID}/download?format=csv")
    assert resp.status_code == 200
    assert resp.content == b"email,status\nfoo@example.com,exists\n"
    assert resp.headers["content-disposition"] == f'attachment; filename="{TASK_ID}.csv"'
    assert resp.headers["content-type"].startswith("text/csv")


def test_tasks_download_requires_content_type(monkeypatch):
    def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t", role="user")

    class FakeClient:
        async def download_task_results(self, task_id: str, file_format: str | None = None):
            return DownloadedFile(content=b"data", content_type=None, content_disposition=None)

    app = _build_app(monkeypatch, fake_user, FakeClient(), {"task_id": TASK_ID})
    client = TestClient(app)
    resp = client.get(f"/api/tasks/{TASK_ID}/download")
    assert resp.status_code == 502


def test_tasks_download_requires_task_file(monkeypatch):
    def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t", role="user")

    class FakeClient:
        async def download_task_results(self, task_id: str, file_format: str | None = None):
            raise AssertionError("download should not be called when task file is missing")

    app = _build_app(monkeypatch, fake_user, FakeClient(), None)
    client = TestClient(app)
    resp = client.get(f"/api/tasks/{TASK_ID}/download")
    assert resp.status_code == 404


def test_tasks_download_prefers_metrics_counts(monkeypatch):
    debit_calls = []

    def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t", role="user")

    class FakeClient:
        async def get_task_detail(self, task_id: str):
            return TaskDetailResponse(
                id=task_id,
                finished_at="2024-01-01T00:00:00Z",
                metrics=TaskMetrics(
                    verification_status={"exists": 2, "catchall": 1, "not_exists": 3},
                    total_email_addresses=6,
                ),
                jobs=[TaskEmailJob(email={"status": "exists"})],
            )

        async def download_task_results(self, task_id: str, file_format: str | None = None):
            return DownloadedFile(
                content=b"data",
                content_type="text/csv",
                content_disposition=f'attachment; filename="{TASK_ID}.csv"',
            )

    monkeypatch.setattr(tasks_module, "fetch_task_credit_reservation", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(tasks_module, "upsert_task_from_detail", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        tasks_module,
        "apply_credit_debit",
        lambda **kwargs: debit_calls.append(kwargs) or {"status": "applied", "credits_remaining": 10},
    )

    app = _build_app(monkeypatch, fake_user, FakeClient(), {"task_id": TASK_ID})
    client = TestClient(app)
    resp = client.get(f"/api/tasks/{TASK_ID}/download")
    assert resp.status_code == 200
    assert len(debit_calls) == 1
    assert debit_calls[0]["credits"] == 6
    meta = debit_calls[0]["meta"]
    assert meta["valid"] == 2
    assert meta["invalid"] == 3
    assert meta["catchall"] == 1
