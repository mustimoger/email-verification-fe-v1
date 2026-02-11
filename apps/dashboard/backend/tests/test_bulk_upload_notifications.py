from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
import httpx

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.clients.external import TaskDetailResponse, TaskFileMetadata
from app.core import settings as settings_module
from app.services import upload_notifications
from app.services.smtp_mailer import SMTPDeliveryError


@pytest.fixture(autouse=True)
def base_env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")
    settings_module.get_settings.cache_clear()
    yield
    settings_module.get_settings.cache_clear()


@pytest.mark.anyio
async def test_process_bulk_upload_webhook_ignores_non_task_completion(monkeypatch):
    payload = {
        "event_type": "email_verification_completed",
        "task_id": "task-1",
        "data": {"job": {"email_address": "user@example.com"}},
    }

    result = await upload_notifications.process_bulk_upload_webhook(payload=payload, raw_body=b"{}", headers={})

    assert result["received"] is True
    assert result["processed"] is False
    assert result["reason"] == "not_task_completion"


@pytest.mark.anyio
async def test_process_bulk_upload_webhook_sends_completed_email(monkeypatch):
    class FakeClient:
        async def get_task_detail(self, task_id):
            return TaskDetailResponse(
                id=task_id,
                user_id="user-1",
                is_file_backed=True,
                file=TaskFileMetadata(filename="emails.csv", email_count=4, status="completed"),
            )

    sent = {}

    monkeypatch.setattr(upload_notifications, "_build_admin_client", lambda: FakeClient())
    monkeypatch.setattr(upload_notifications.supabase_client, "fetch_profile", lambda user_id: {"email": "user@example.com"})
    monkeypatch.setattr(upload_notifications.supabase_client, "fetch_auth_user", lambda user_id: None)
    monkeypatch.setattr(upload_notifications, "record_billing_event", lambda **kwargs: True)
    monkeypatch.setattr(upload_notifications, "delete_billing_event", lambda _event_id: True)

    def fake_send(**kwargs):
        sent.update(kwargs)

    monkeypatch.setattr(upload_notifications, "send_bulk_upload_notification_email", fake_send)

    payload = {
        "event_type": "email_verification_completed",
        "task_id": "task-1",
        "data": {
            "user_id": "user-1",
            "stats": {"total": 4, "completed": 4, "failed": 0},
            "jobs": [{}, {}, {}, {}],
        },
    }

    result = await upload_notifications.process_bulk_upload_webhook(payload=payload, raw_body=b"{}", headers={})

    assert result["processed"] is True
    assert result["outcome"] == "completed"
    assert sent == {
        "recipient_email": "user@example.com",
        "outcome": "completed",
        "file_name": "emails.csv",
        "email_count": 4,
    }


@pytest.mark.anyio
async def test_process_bulk_upload_webhook_sends_failed_email(monkeypatch):
    class FakeClient:
        async def get_task_detail(self, task_id):
            return TaskDetailResponse(
                id=task_id,
                user_id="user-1",
                is_file_backed=True,
                file=TaskFileMetadata(filename="emails.csv", email_count=4, status="failed"),
            )

    sent = {}

    monkeypatch.setattr(upload_notifications, "_build_admin_client", lambda: FakeClient())
    monkeypatch.setattr(upload_notifications.supabase_client, "fetch_profile", lambda user_id: None)
    monkeypatch.setattr(
        upload_notifications.supabase_client,
        "fetch_auth_user",
        lambda user_id: SimpleNamespace(email="auth@example.com"),
    )
    monkeypatch.setattr(upload_notifications, "record_billing_event", lambda **kwargs: True)

    def fake_send(**kwargs):
        sent.update(kwargs)

    monkeypatch.setattr(upload_notifications, "send_bulk_upload_notification_email", fake_send)

    payload = {
        "event_type": "email_verification_completed",
        "task_id": "task-2",
        "data": {
            "user_id": "user-1",
            "stats": {"total": 4, "completed": 2, "failed": 2},
            "jobs": [{}, {}, {}, {}],
        },
    }

    result = await upload_notifications.process_bulk_upload_webhook(payload=payload, raw_body=b"{}", headers={})

    assert result["processed"] is True
    assert result["outcome"] == "failed"
    assert sent["recipient_email"] == "auth@example.com"
    assert sent["outcome"] == "failed"


@pytest.mark.anyio
async def test_process_bulk_upload_webhook_duplicate_skips_send(monkeypatch):
    class FakeClient:
        async def get_task_detail(self, task_id):
            return TaskDetailResponse(
                id=task_id,
                user_id="user-1",
                is_file_backed=True,
                file=TaskFileMetadata(filename="emails.csv", email_count=2, status="completed"),
            )

    called = {"send": False}
    monkeypatch.setattr(upload_notifications, "_build_admin_client", lambda: FakeClient())
    monkeypatch.setattr(upload_notifications.supabase_client, "fetch_profile", lambda user_id: {"email": "user@example.com"})
    monkeypatch.setattr(upload_notifications, "record_billing_event", lambda **kwargs: False)

    def fake_send(**kwargs):
        called["send"] = True

    monkeypatch.setattr(upload_notifications, "send_bulk_upload_notification_email", fake_send)

    payload = {
        "event_type": "email_verification_completed",
        "task_id": "task-3",
        "data": {
            "user_id": "user-1",
            "stats": {"total": 2, "completed": 2, "failed": 0},
            "jobs": [{}, {}],
        },
    }

    result = await upload_notifications.process_bulk_upload_webhook(payload=payload, raw_body=b"{}", headers={})

    assert result["processed"] is False
    assert result["reason"] == "duplicate_or_not_recorded"
    assert called["send"] is False


@pytest.mark.anyio
async def test_process_bulk_upload_webhook_delivery_failure_raises_503(monkeypatch):
    class FakeClient:
        async def get_task_detail(self, task_id):
            return TaskDetailResponse(
                id=task_id,
                user_id="user-1",
                is_file_backed=True,
                file=TaskFileMetadata(filename="emails.csv", email_count=2, status="completed"),
            )

    deleted = {"event": None}
    monkeypatch.setattr(upload_notifications, "_build_admin_client", lambda: FakeClient())
    monkeypatch.setattr(upload_notifications.supabase_client, "fetch_profile", lambda user_id: {"email": "user@example.com"})
    monkeypatch.setattr(upload_notifications, "record_billing_event", lambda **kwargs: True)
    monkeypatch.setattr(upload_notifications, "delete_billing_event", lambda event_id: deleted.update({"event": event_id}) or True)

    def fail_send(**kwargs):
        raise SMTPDeliveryError("failed")

    monkeypatch.setattr(upload_notifications, "send_bulk_upload_notification_email", fail_send)

    payload = {
        "event_type": "email_verification_completed",
        "task_id": "task-4",
        "data": {
            "user_id": "user-1",
            "stats": {"total": 2, "completed": 2, "failed": 0},
            "jobs": [{}, {}],
        },
    }

    with pytest.raises(HTTPException) as exc:
        await upload_notifications.process_bulk_upload_webhook(payload=payload, raw_body=b"{}", headers={})

    assert exc.value.status_code == 503
    assert deleted["event"] == "bulk_upload_notification:task-4:completed"


@pytest.mark.anyio
async def test_process_bulk_upload_webhook_signature_validation(monkeypatch):
    secret = "secret123"
    monkeypatch.setenv("WEBHOOK_SECRET_KEY", secret)
    settings_module.get_settings.cache_clear()

    payload = {
        "event_type": "email_verification_completed",
        "task_id": "task-5",
        "data": {"stats": {"total": 1, "completed": 1, "failed": 0}, "jobs": [{}]},
    }

    with pytest.raises(HTTPException) as exc:
        await upload_notifications.process_bulk_upload_webhook(
            payload=payload,
            raw_body=b'{"event_type":"email_verification_completed"}',
            headers={"X-Webhook-Signature": "sha256=bad"},
        )

    assert exc.value.status_code == 401


@pytest.mark.anyio
async def test_bulk_upload_webhook_route_invalid_json(monkeypatch):
    app = FastAPI()
    app.include_router(router)
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/tasks/webhooks/bulk-upload", content=b"{")

    assert resp.status_code == 400


@pytest.mark.anyio
async def test_bulk_upload_webhook_route_success(monkeypatch):
    app = FastAPI()
    app.include_router(router)

    async def fake_process(payload, raw_body, headers):
        return {"received": True, "processed": True, "task_id": payload.get("task_id")}

    monkeypatch.setattr(tasks_module, "process_bulk_upload_webhook", fake_process)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/tasks/webhooks/bulk-upload",
            json={"event_type": "email_verification_completed", "task_id": "task-6", "data": {"stats": {}, "jobs": []}},
        )

    assert resp.status_code == 200
    assert resp.json() == {"received": True, "processed": True, "task_id": "task-6"}
