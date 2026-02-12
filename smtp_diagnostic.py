#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import logging
import smtplib
import ssl
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
from typing import Any, Callable


LOGGER_NAME = "smtp_diagnostic"


@dataclass(frozen=True)
class SMTPDiagnosticConfig:
    server: str
    port: int
    username: str
    password: str
    starttls_required: bool
    from_email: str
    from_name: str
    reply_to: str
    subject_completed: str
    subject_failed: str
    body_completed: str
    body_failed: str


def _repo_root() -> Path:
    return Path(__file__).resolve().parent


def _backend_path() -> Path:
    return _repo_root() / "apps" / "dashboard" / "backend"


def _default_env_file() -> Path:
    return _backend_path() / ".env"


def _default_log_file() -> Path:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return _repo_root() / "artifacts" / "smtp-diagnostics" / f"smtp-diagnostic-{timestamp}.log"


def _configure_logging(log_file: Path, *, verbose: bool) -> logging.Logger:
    log_file.parent.mkdir(parents=True, exist_ok=True)
    level = logging.DEBUG if verbose else logging.INFO
    logger = logging.getLogger(LOGGER_NAME)
    logger.setLevel(level)
    logger.propagate = False
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")

    existing = list(logger.handlers)
    for handler in existing:
        logger.removeHandler(handler)
        try:
            handler.close()
        except Exception:
            pass

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setLevel(level)
    stream_handler.setFormatter(formatter)

    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)

    logger.addHandler(stream_handler)
    logger.addHandler(file_handler)
    return logger


def _ensure_backend_on_path() -> None:
    backend_path = _backend_path()
    backend_path_str = str(backend_path)
    if backend_path_str not in sys.path:
        sys.path.insert(0, backend_path_str)


def _load_backend_helpers() -> tuple[Callable[..., Any], Callable[..., Any], Callable[..., Any]]:
    _ensure_backend_on_path()
    from app.core.settings import Settings  # noqa: WPS433
    from app.services.smtp_mailer import _render_template, _required_setting  # noqa: WPS433

    return Settings, _required_setting, _render_template


def _load_smtp_config(env_file: Path) -> SMTPDiagnosticConfig:
    Settings, required_setting, _ = _load_backend_helpers()
    settings = Settings(_env_file=str(env_file), _env_file_encoding="utf-8")
    return SMTPDiagnosticConfig(
        server=str(required_setting("SMTP_SERVER", settings.smtp_server)),
        port=int(required_setting("SMTP_PORT", settings.smtp_port)),
        username=str(required_setting("SMTP_USERNAME", settings.smtp_username)),
        password=str(required_setting("SMTP_PASSWORD", settings.smtp_password)),
        starttls_required=bool(required_setting("SMTP_STARTTLS_REQUIRED", settings.smtp_starttls_required)),
        from_email=str(required_setting("SMTP_FROM_EMAIL", settings.smtp_from_email)),
        from_name=str(required_setting("SMTP_FROM_NAME", settings.smtp_from_name)),
        reply_to=str(required_setting("SMTP_REPLY_TO", settings.smtp_reply_to)),
        subject_completed=str(
            required_setting("BULK_UPLOAD_EMAIL_SUBJECT_COMPLETED", settings.bulk_upload_email_subject_completed)
        ),
        subject_failed=str(required_setting("BULK_UPLOAD_EMAIL_SUBJECT_FAILED", settings.bulk_upload_email_subject_failed)),
        body_completed=str(required_setting("BULK_UPLOAD_EMAIL_BODY_COMPLETED", settings.bulk_upload_email_body_completed)),
        body_failed=str(required_setting("BULK_UPLOAD_EMAIL_BODY_FAILED", settings.bulk_upload_email_body_failed)),
    )


def _recipient_for_test(config: SMTPDiagnosticConfig, override: str | None) -> str:
    if override is not None and override.strip():
        return override.strip()
    return config.from_email


def _safe_mask(value: str) -> str:
    if len(value) <= 4:
        return "*" * len(value)
    return value[:2] + ("*" * (len(value) - 4)) + value[-2:]


def _extract_domain(value: str) -> str | None:
    value = value.strip()
    if "@" not in value:
        return None
    local_part, domain = value.rsplit("@", 1)
    if not local_part or not domain:
        return None
    return domain.lower()


def _build_message(
    *,
    config: SMTPDiagnosticConfig,
    recipient: str,
    outcome: str,
    file_name: str,
    email_count: int,
) -> EmailMessage:
    _, _, render_template = _load_backend_helpers()
    if outcome == "completed":
        subject_template = config.subject_completed
        body_template = config.body_completed
    else:
        subject_template = config.subject_failed
        body_template = config.body_failed

    subject = render_template(subject_template, file_name=file_name, email_count=email_count)
    body = render_template(body_template, file_name=file_name, email_count=email_count)

    message = EmailMessage()
    message["From"] = formataddr((config.from_name, config.from_email))
    message["To"] = recipient
    message["Reply-To"] = config.reply_to
    message["Subject"] = subject
    message.set_content(body)
    return message


class VerboseSMTP(smtplib.SMTP):
    def __init__(self, logger: logging.Logger, *args: Any, **kwargs: Any) -> None:
        self._diag_logger = logger
        super().__init__(*args, **kwargs)

    def _print_debug(self, *args: Any) -> None:  # type: ignore[override]
        wire_line = " ".join(str(arg) for arg in args)
        self._diag_logger.debug("smtp.wire %s", _redact_wire_line(wire_line))


def _redact_wire_line(line: str) -> str:
    lowered = line.lower()
    if "send:" in lowered and ("auth plain" in lowered or "auth login" in lowered):
        return "send: '<redacted auth command>'"
    return line


def _decode_response_text(response: bytes | str | None) -> str:
    if response is None:
        return ""
    if isinstance(response, bytes):
        return response.decode("utf-8", errors="replace")
    return str(response)


def _probe_smtp_delivery(
    *,
    config: SMTPDiagnosticConfig,
    recipient: str,
    message: EmailMessage,
    timeout_seconds: int,
    verify_tls: bool,
    logger: logging.Logger,
) -> dict[str, Any]:
    stages: list[dict[str, Any]] = []
    tls_context = ssl.create_default_context()
    if not verify_tls:
        tls_context.check_hostname = False
        tls_context.verify_mode = ssl.CERT_NONE

    with VerboseSMTP(logger, host=config.server, port=config.port, timeout=timeout_seconds) as smtp:
        smtp.set_debuglevel(2)
        code, response = smtp.ehlo()
        stages.append({"stage": "ehlo_pre_tls", "code": code, "response": _decode_response_text(response)})

        if config.starttls_required:
            code, response = smtp.starttls(context=tls_context)
            stages.append({"stage": "starttls", "code": code, "response": _decode_response_text(response)})
            code, response = smtp.ehlo()
            stages.append({"stage": "ehlo_post_tls", "code": code, "response": _decode_response_text(response)})
        else:
            stages.append({"stage": "starttls", "code": None, "response": "skipped_by_config"})

        login_result = smtp.login(config.username, config.password)
        if isinstance(login_result, tuple) and len(login_result) == 2:
            login_code, login_response = login_result
        else:
            login_code, login_response = None, str(login_result)
        stages.append({"stage": "auth_login", "code": login_code, "response": _decode_response_text(login_response)})

        code, response = smtp.mail(config.from_email)
        stages.append({"stage": "mail_from", "code": code, "response": _decode_response_text(response)})

        code, response = smtp.rcpt(recipient)
        stages.append({"stage": "rcpt_to", "code": code, "response": _decode_response_text(response)})

        code, response = smtp.data(message.as_string())
        stages.append({"stage": "data", "code": code, "response": _decode_response_text(response)})

    return {"accepted": True, "stages": stages}


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Send one SMTP diagnostic email using backend configuration and record verbose logs."
    )
    parser.add_argument(
        "--env-file",
        default=str(_default_env_file()),
        help="Path to backend .env file containing SMTP settings.",
    )
    parser.add_argument(
        "--recipient",
        default=None,
        help="Recipient for the diagnostic email. Defaults to SMTP_FROM_EMAIL when omitted.",
    )
    parser.add_argument(
        "--outcome",
        choices=("completed", "failed"),
        default="completed",
        help="Which template set to use.",
    )
    parser.add_argument(
        "--file-name",
        default="smtp-diagnostic.csv",
        help="Template value for {file_name}.",
    )
    parser.add_argument(
        "--email-count",
        type=int,
        default=1,
        help="Template value for {email_count}.",
    )
    parser.add_argument(
        "--timeout-seconds",
        type=int,
        default=30,
        help="SMTP connection timeout.",
    )
    parser.add_argument(
        "--disable-tls-verify",
        action="store_true",
        help="Disable TLS certificate validation for the SMTP STARTTLS probe.",
    )
    parser.add_argument(
        "--log-file",
        default=str(_default_log_file()),
        help="Path for detailed diagnostic logs.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug-level diagnostic logging.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    env_file = Path(args.env_file).resolve()
    log_file = Path(args.log_file).resolve()
    logger = _configure_logging(log_file, verbose=args.verbose)

    logger.info("smtp.diagnostic.start")
    logger.info("smtp.diagnostic.env_file %s", env_file)
    logger.info("smtp.diagnostic.log_file %s", log_file)

    if not env_file.exists():
        logger.error("smtp.diagnostic.env_file_missing %s", env_file)
        print(json.dumps({"ok": False, "error": "env_file_missing", "env_file": str(env_file), "log_file": str(log_file)}))
        return 2

    if args.email_count < 0:
        logger.error("smtp.diagnostic.invalid_email_count %s", args.email_count)
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "email_count_must_be_non_negative",
                    "email_count": args.email_count,
                    "log_file": str(log_file),
                }
            )
        )
        return 2

    try:
        config = _load_smtp_config(env_file)
        recipient = _recipient_for_test(config, args.recipient)
        message = _build_message(
            config=config,
            recipient=recipient,
            outcome=args.outcome,
            file_name=args.file_name,
            email_count=args.email_count,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("smtp.diagnostic.configuration_failed")
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "configuration_failed",
                    "detail": str(exc),
                    "log_file": str(log_file),
                }
            )
        )
        return 3

    from_domain = _extract_domain(config.from_email)
    auth_domain = _extract_domain(config.username)
    if from_domain and auth_domain and from_domain != auth_domain:
        logger.warning(
            "smtp.diagnostic.domain_mismatch from_domain=%s auth_domain=%s",
            from_domain,
            auth_domain,
        )

    logger.info(
        "smtp.diagnostic.runtime server=%s port=%s starttls_required=%s auth_username=%s recipient=%s from_email=%s reply_to=%s",
        config.server,
        config.port,
        config.starttls_required,
        _safe_mask(config.username),
        recipient,
        config.from_email,
        config.reply_to,
    )
    logger.info(
        "smtp.diagnostic.message_preview subject=%s body_lines=%s",
        message.get("Subject"),
        len(message.get_content().splitlines()),
    )

    try:
        result = _probe_smtp_delivery(
            config=config,
            recipient=recipient,
            message=message,
            timeout_seconds=args.timeout_seconds,
            verify_tls=not args.disable_tls_verify,
            logger=logger,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("smtp.diagnostic.delivery_failed")
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "delivery_failed",
                    "detail": str(exc),
                    "recipient": recipient,
                    "log_file": str(log_file),
                }
            )
        )
        return 4

    output = {
        "ok": True,
        "recipient": recipient,
        "smtp_server": config.server,
        "smtp_port": config.port,
        "starttls_required": config.starttls_required,
        "result": result,
        "log_file": str(log_file),
    }
    logger.info("smtp.diagnostic.completed accepted=%s", result.get("accepted"))
    print(json.dumps(output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
