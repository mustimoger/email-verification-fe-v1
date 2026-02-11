from email.message import EmailMessage

import pytest

from app.core import settings as settings_module
from app.services import smtp_mailer


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


def _set_smtp_env(monkeypatch):
    monkeypatch.setenv("SMTP_SERVER", "smtp.test")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USERNAME", "user@test")
    monkeypatch.setenv("SMTP_PASSWORD", "pass")
    monkeypatch.setenv("SMTP_STARTTLS_REQUIRED", "true")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "support@example.com")
    monkeypatch.setenv("SMTP_FROM_NAME", "Notifier")
    monkeypatch.setenv("SMTP_REPLY_TO", "support@example.com")
    monkeypatch.setenv("BULK_UPLOAD_EMAIL_SUBJECT_COMPLETED", "Upload done: {file_name}")
    monkeypatch.setenv("BULK_UPLOAD_EMAIL_SUBJECT_FAILED", "Upload failed: {file_name}")
    monkeypatch.setenv("BULK_UPLOAD_EMAIL_BODY_COMPLETED", "Done\\nCount={email_count}")
    monkeypatch.setenv("BULK_UPLOAD_EMAIL_BODY_FAILED", "Failed\\nCount={email_count}")


class FakeSMTP:
    def __init__(self, host, port, timeout):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.starttls_called = False
        self.logged_in = None
        self.message = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def starttls(self, context=None):
        self.starttls_called = True

    def login(self, username, password):
        self.logged_in = (username, password)

    def send_message(self, message: EmailMessage):
        self.message = message


def test_send_bulk_upload_notification_email_completed(monkeypatch):
    _set_smtp_env(monkeypatch)
    settings_module.get_settings.cache_clear()

    smtp_instances = []

    def fake_smtp(host, port, timeout):
        instance = FakeSMTP(host, port, timeout)
        smtp_instances.append(instance)
        return instance

    monkeypatch.setattr(smtp_mailer.smtplib, "SMTP", fake_smtp)

    smtp_mailer.send_bulk_upload_notification_email(
        recipient_email="user@example.com",
        outcome="completed",
        file_name="emails.csv",
        email_count=42,
    )

    assert len(smtp_instances) == 1
    smtp = smtp_instances[0]
    assert smtp.host == "smtp.test"
    assert smtp.port == 587
    assert smtp.starttls_called is True
    assert smtp.logged_in == ("user@test", "pass")
    assert smtp.message is not None
    assert smtp.message["Subject"] == "Upload done: emails.csv"
    assert smtp.message["To"] == "user@example.com"
    assert "Count=42" in smtp.message.get_content()


def test_send_bulk_upload_notification_email_missing_setting(monkeypatch):
    _set_smtp_env(monkeypatch)
    monkeypatch.delenv("SMTP_FROM_EMAIL", raising=False)
    settings_module.get_settings.cache_clear()

    with pytest.raises(smtp_mailer.SMTPConfigurationError):
        smtp_mailer.send_bulk_upload_notification_email(
            recipient_email="user@example.com",
            outcome="failed",
            file_name="emails.csv",
            email_count=5,
        )
