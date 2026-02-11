import json
import socketserver
import threading
from contextlib import contextmanager
from email import policy
from email.parser import BytesParser

import pytest
from fastapi import FastAPI
import httpx

from app.api.tasks import router
from app.clients.external import TaskDetailResponse, TaskFileMetadata
from app.core import settings as settings_module
from app.services import upload_notifications


class _CaptureSMTPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self, server_address, handler_class):
        super().__init__(server_address, handler_class)
        self._lock = threading.Lock()
        self.captured_messages: list[bytes] = []

    def add_message(self, message: bytes) -> None:
        with self._lock:
            self.captured_messages.append(message)


class _CaptureSMTPHandler(socketserver.StreamRequestHandler):
    def handle(self) -> None:
        self.wfile.write(b"220 smtp.test.local ESMTP\r\n")
        in_data = False
        auth_step = None
        data_lines: list[bytes] = []

        while True:
            line = self.rfile.readline()
            if not line:
                break

            text = line.rstrip(b"\r\n")
            if in_data:
                if text == b".":
                    raw_message = b"\r\n".join(data_lines) + b"\r\n"
                    self.server.add_message(raw_message)
                    data_lines.clear()
                    in_data = False
                    self.wfile.write(b"250 2.0.0 queued\r\n")
                    continue
                if text.startswith(b".."):
                    text = text[1:]
                data_lines.append(text)
                continue

            if auth_step == "username":
                auth_step = "password"
                self.wfile.write(b"334 UGFzc3dvcmQ6\r\n")
                continue
            if auth_step == "password":
                auth_step = None
                self.wfile.write(b"235 2.7.0 authenticated\r\n")
                continue

            upper = text.upper()
            if upper.startswith(b"EHLO") or upper.startswith(b"HELO"):
                self.wfile.write(b"250-smtp.test.local\r\n")
                self.wfile.write(b"250-AUTH LOGIN PLAIN\r\n")
                self.wfile.write(b"250 HELP\r\n")
                continue
            if upper.startswith(b"AUTH PLAIN"):
                self.wfile.write(b"235 2.7.0 authenticated\r\n")
                continue
            if upper.startswith(b"AUTH LOGIN"):
                parts = text.split()
                if len(parts) >= 3:
                    auth_step = "password"
                    self.wfile.write(b"334 UGFzc3dvcmQ6\r\n")
                else:
                    auth_step = "username"
                    self.wfile.write(b"334 VXNlcm5hbWU6\r\n")
                continue
            if upper.startswith(b"MAIL FROM"):
                self.wfile.write(b"250 2.1.0 ok\r\n")
                continue
            if upper.startswith(b"RCPT TO"):
                self.wfile.write(b"250 2.1.5 ok\r\n")
                continue
            if upper == b"DATA":
                in_data = True
                self.wfile.write(b"354 End data with <CR><LF>.<CR><LF>\r\n")
                continue
            if upper == b"NOOP" or upper == b"RSET":
                self.wfile.write(b"250 2.0.0 ok\r\n")
                continue
            if upper == b"QUIT":
                self.wfile.write(b"221 2.0.0 bye\r\n")
                break
            self.wfile.write(b"502 5.5.1 unsupported\r\n")


@contextmanager
def _run_capture_smtp_server():
    server = _CaptureSMTPServer(("127.0.0.1", 0), _CaptureSMTPHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield server
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


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
async def test_bulk_upload_webhook_completed_sends_email_through_local_smtp(monkeypatch):
    with _run_capture_smtp_server() as smtp_server:
        smtp_host, smtp_port = smtp_server.server_address
        monkeypatch.setenv("SMTP_SERVER", str(smtp_host))
        monkeypatch.setenv("SMTP_PORT", str(smtp_port))
        monkeypatch.setenv("SMTP_USERNAME", "smtp-user")
        monkeypatch.setenv("SMTP_PASSWORD", "smtp-password")
        monkeypatch.setenv("SMTP_STARTTLS_REQUIRED", "false")
        monkeypatch.setenv("SMTP_FROM_EMAIL", "support@example.com")
        monkeypatch.setenv("SMTP_FROM_NAME", "Verifier Bot")
        monkeypatch.setenv("SMTP_REPLY_TO", "support@example.com")
        monkeypatch.setenv("BULK_UPLOAD_EMAIL_SUBJECT_COMPLETED", "Upload done: {file_name}")
        monkeypatch.setenv("BULK_UPLOAD_EMAIL_SUBJECT_FAILED", "Upload failed: {file_name}")
        monkeypatch.setenv("BULK_UPLOAD_EMAIL_BODY_COMPLETED", "Done\\nCount={email_count}")
        monkeypatch.setenv("BULK_UPLOAD_EMAIL_BODY_FAILED", "Failed\\nCount={email_count}")
        settings_module.get_settings.cache_clear()

        class FakeClient:
            async def get_task_detail(self, task_id):
                return TaskDetailResponse(
                    id=task_id,
                    user_id="user-1",
                    is_file_backed=True,
                    file=TaskFileMetadata(
                        filename="leads.csv",
                        email_count=3,
                        status="completed",
                        upload_id="upload-1",
                    ),
                )

        monkeypatch.setattr(upload_notifications, "_build_admin_client", lambda: FakeClient())
        monkeypatch.setattr(
            upload_notifications.supabase_client,
            "fetch_profile",
            lambda user_id: {"email": "notify-user@example.com"},
        )
        monkeypatch.setattr(upload_notifications, "record_billing_event", lambda **kwargs: True)
        monkeypatch.setattr(upload_notifications, "delete_billing_event", lambda event_id: True)

        app = FastAPI()
        app.include_router(router)
        payload = {
            "event_type": "email_verification_completed",
            "task_id": "task-live-1",
            "data": {
                "user_id": "user-1",
                "stats": {"total": 3, "completed": 3, "failed": 0},
                "jobs": [{}, {}, {}],
            },
        }

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/tasks/webhooks/bulk-upload", content=json.dumps(payload))

        assert response.status_code == 200
        assert response.json()["processed"] is True
        assert response.json()["outcome"] == "completed"
        assert len(smtp_server.captured_messages) == 1

        message = BytesParser(policy=policy.default).parsebytes(smtp_server.captured_messages[0])
        assert message["To"] == "notify-user@example.com"
        assert message["Subject"] == "Upload done: leads.csv"
        assert "Count=3" in message.get_content()
