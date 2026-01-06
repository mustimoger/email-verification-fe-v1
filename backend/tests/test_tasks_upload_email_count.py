import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

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

    def fake_user():
        return AuthContext(user_id="user-1", claims={}, token="t", role="user")

    captured = {"credit_calls": 0, "usage_calls": 0}

    def fake_credit_debit(*, user_id, credits, source, source_id, meta):
        captured["credit_calls"] += 1
        captured["credit_credits"] = credits
        captured["credit_source_id"] = source_id
        return {"status": "applied"}

    def fake_credit_release(*args, **kwargs):
        captured["release_calls"] = captured.get("release_calls", 0) + 1
        return {"status": "released"}

    def fake_update_reservation(user_id, task_id, reserved_count, reservation_id):
        captured["reserved_count"] = reserved_count
        captured["reservation_id"] = reservation_id

    def fake_record_usage(*args, **kwargs):
        captured["usage_calls"] += 1
        if "count" in kwargs:
            captured["usage_count"] = kwargs["count"]
        elif len(args) >= 3:
            captured["usage_count"] = args[2]

    monkeypatch.setattr(tasks_module, "apply_credit_debit", fake_credit_debit)
    monkeypatch.setattr(tasks_module, "apply_credit_release", fake_credit_release)
    monkeypatch.setattr(tasks_module, "update_task_reservation", fake_update_reservation)
    monkeypatch.setattr(tasks_module, "upsert_tasks_from_list", lambda *args, **kwargs: None)
    monkeypatch.setattr(tasks_module, "upsert_task_file", lambda *args, **kwargs: "file-1")
    monkeypatch.setattr(tasks_module, "record_usage", fake_record_usage)
    monkeypatch.setattr(tasks_module, "get_cached_key_by_name", lambda *args, **kwargs: None)

    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = lambda: fake_client
    return app, captured


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


def test_upload_uses_email_count_for_reservation(monkeypatch):
    class FakeClient:
        async def upload_batch_file(self, filename, content, webhook_url=None, email_column=None):
            return BatchFileUploadResponse(
                status="ok",
                upload_id="u1",
                task_id="task-1",
                filename=filename,
                email_count=2,
            )

    app, captured = _build_app(monkeypatch, FakeClient())
    client = TestClient(app)

    resp = client.post(
        "/api/tasks/upload",
        files=[("files", ("emails.csv", b"email@example.com", "text/csv"))],
        data=_upload_payload(),
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["email_count"] == 2
    assert captured["credit_calls"] == 1
    assert captured["credit_credits"] == 2
    assert captured["reserved_count"] == 2
    assert captured["usage_calls"] == 1
    assert captured["usage_count"] == 2


def test_upload_missing_email_count_returns_502(monkeypatch):
    class FakeClient:
        async def upload_batch_file(self, filename, content, webhook_url=None, email_column=None):
            return BatchFileUploadResponse(
                status="ok",
                upload_id="u1",
                task_id="task-1",
                filename=filename,
            )

    app, captured = _build_app(monkeypatch, FakeClient())
    client = TestClient(app)

    resp = client.post(
        "/api/tasks/upload",
        files=[("files", ("emails.csv", b"email@example.com", "text/csv"))],
        data=_upload_payload(),
    )

    assert resp.status_code == 502
    assert captured["credit_calls"] == 0
