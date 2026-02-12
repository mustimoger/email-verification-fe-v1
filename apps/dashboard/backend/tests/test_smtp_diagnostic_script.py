from __future__ import annotations

import importlib.util
import logging
from pathlib import Path
import sys


REPO_ROOT = Path(__file__).resolve().parents[4]
SCRIPT_PATH = REPO_ROOT / "smtp_diagnostic.py"


def _load_script_module():
    spec = importlib.util.spec_from_file_location("smtp_diagnostic", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _write_env(path: Path, *, starttls_required: str = "true") -> None:
    values = {
        "EMAIL_API_BASE_URL": "https://api.test",
        "SUPABASE_URL": "https://sb.test",
        "SUPABASE_SERVICE_ROLE_KEY": "service-key",
        "SUPABASE_JWT_SECRET": "jwt-secret",
        "SUPABASE_AUTH_COOKIE_NAME": "sb-cookie",
        "MANUAL_MAX_EMAILS": "1000",
        "LATEST_UPLOADS_LIMIT": "25",
        "SMTP_SERVER": "smtp.test.local",
        "SMTP_PORT": "587",
        "SMTP_USERNAME": "auth-user@example.com",
        "SMTP_PASSWORD": "smtp-password",
        "SMTP_STARTTLS_REQUIRED": starttls_required,
        "SMTP_FROM_EMAIL": "support@example.com",
        "SMTP_FROM_NAME": "Support Bot",
        "SMTP_REPLY_TO": "support@example.com",
        "BULK_UPLOAD_EMAIL_SUBJECT_COMPLETED": "Done: {file_name}",
        "BULK_UPLOAD_EMAIL_SUBJECT_FAILED": "Failed: {file_name}",
        "BULK_UPLOAD_EMAIL_BODY_COMPLETED": "Completed\\nCount={email_count}",
        "BULK_UPLOAD_EMAIL_BODY_FAILED": "Failed\\nCount={email_count}",
    }
    text = "\n".join(f"{key}={value}" for key, value in values.items()) + "\n"
    path.write_text(text, encoding="utf-8")


def test_load_smtp_config_reads_backend_env_file(tmp_path: Path):
    module = _load_script_module()
    env_file = tmp_path / "backend.env"
    _write_env(env_file)

    config = module._load_smtp_config(env_file)

    assert config.server == "smtp.test.local"
    assert config.port == 587
    assert config.starttls_required is True
    assert config.from_email == "support@example.com"


def test_build_message_renders_templates_from_env(tmp_path: Path):
    module = _load_script_module()
    env_file = tmp_path / "backend.env"
    _write_env(env_file)
    config = module._load_smtp_config(env_file)

    message = module._build_message(
        config=config,
        recipient="recipient@example.net",
        outcome="completed",
        file_name="leads.csv",
        email_count=42,
    )

    assert message["To"] == "recipient@example.net"
    assert message["Subject"] == "Done: leads.csv"
    assert "Count=42" in message.get_content()


def test_probe_smtp_delivery_records_stage_results(tmp_path: Path):
    module = _load_script_module()
    env_file = tmp_path / "backend.env"
    _write_env(env_file, starttls_required="true")
    config = module._load_smtp_config(env_file)
    message = module._build_message(
        config=config,
        recipient="recipient@example.net",
        outcome="failed",
        file_name="leads.csv",
        email_count=5,
    )

    events: list[tuple[str, str]] = []

    class FakeSMTP:
        def __init__(self, logger, host, port, timeout):
            events.append(("init", f"{host}:{port}:{timeout}"))

        def __enter__(self):
            events.append(("enter", "ok"))
            return self

        def __exit__(self, exc_type, exc, tb):
            events.append(("exit", "ok"))
            return False

        def set_debuglevel(self, level):
            events.append(("debuglevel", str(level)))

        def ehlo(self):
            events.append(("ehlo", "ok"))
            return 250, b"ok"

        def starttls(self, context=None):
            events.append(("starttls", "ok"))
            return 220, b"go-ahead"

        def login(self, username, password):
            events.append(("login", f"{username}:{password}"))
            return 235, b"authenticated"

        def mail(self, sender):
            events.append(("mail", sender))
            return 250, b"sender accepted"

        def rcpt(self, recipient):
            events.append(("rcpt", recipient))
            return 250, b"recipient accepted"

        def data(self, payload):
            events.append(("data", "payload"))
            assert "Subject: Failed: leads.csv" in payload
            return 250, b"queued"

    module.VerboseSMTP = FakeSMTP

    logger = logging.getLogger("smtp-diagnostic-test")
    result = module._probe_smtp_delivery(
        config=config,
        recipient="recipient@example.net",
        message=message,
        timeout_seconds=30,
        verify_tls=True,
        logger=logger,
    )

    assert result["accepted"] is True
    stage_names = [entry["stage"] for entry in result["stages"]]
    assert stage_names == [
        "ehlo_pre_tls",
        "starttls",
        "ehlo_post_tls",
        "auth_login",
        "mail_from",
        "rcpt_to",
        "data",
    ]
    assert ("mail", "support@example.com") in events
    assert ("rcpt", "recipient@example.net") in events


def test_redact_wire_line_masks_auth_commands():
    module = _load_script_module()
    line = "send: 'AUTH PLAIN AGFhYWFhYWFhYWFhYWFhYQ==\\r\\n'"
    assert module._redact_wire_line(line) == "send: '<redacted auth command>'"

    safe_line = "send: 'mail FROM:<support@example.com>\\r\\n'"
    assert module._redact_wire_line(safe_line) == safe_line
