import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from typing import Literal

from ..core.settings import get_settings

logger = logging.getLogger(__name__)

Outcome = Literal["completed", "failed"]


class SMTPConfigurationError(RuntimeError):
    pass


class SMTPDeliveryError(RuntimeError):
    pass


def _normalize_template_text(value: str) -> str:
    # Env files commonly store escaped newlines (\\n); normalize before rendering.
    return value.replace("\\n", "\n")


def _render_template(template: str, *, file_name: str, email_count: int) -> str:
    normalized = _normalize_template_text(template)
    try:
        return normalized.format(file_name=file_name, email_count=email_count)
    except KeyError as exc:  # noqa: PERF203
        missing = exc.args[0]
        raise SMTPConfigurationError(f"Email template missing placeholder value: {missing}") from exc


def _required_setting(name: str, value: str | int | bool | None) -> str | int | bool:
    if value is None:
        raise SMTPConfigurationError(f"Missing required setting: {name}")
    if isinstance(value, str) and not value.strip():
        raise SMTPConfigurationError(f"Missing required setting: {name}")
    return value


def send_bulk_upload_notification_email(
    *,
    recipient_email: str,
    outcome: Outcome,
    file_name: str,
    email_count: int,
) -> None:
    settings = get_settings()

    smtp_server = _required_setting("SMTP_SERVER", settings.smtp_server)
    smtp_port = _required_setting("SMTP_PORT", settings.smtp_port)
    smtp_username = _required_setting("SMTP_USERNAME", settings.smtp_username)
    smtp_password = _required_setting("SMTP_PASSWORD", settings.smtp_password)
    smtp_starttls_required = _required_setting("SMTP_STARTTLS_REQUIRED", settings.smtp_starttls_required)

    from_email = _required_setting("SMTP_FROM_EMAIL", settings.smtp_from_email)
    from_name = _required_setting("SMTP_FROM_NAME", settings.smtp_from_name)
    reply_to = _required_setting("SMTP_REPLY_TO", settings.smtp_reply_to)

    if outcome == "completed":
        subject_template = _required_setting(
            "BULK_UPLOAD_EMAIL_SUBJECT_COMPLETED",
            settings.bulk_upload_email_subject_completed,
        )
        body_template = _required_setting(
            "BULK_UPLOAD_EMAIL_BODY_COMPLETED",
            settings.bulk_upload_email_body_completed,
        )
    else:
        subject_template = _required_setting(
            "BULK_UPLOAD_EMAIL_SUBJECT_FAILED",
            settings.bulk_upload_email_subject_failed,
        )
        body_template = _required_setting(
            "BULK_UPLOAD_EMAIL_BODY_FAILED",
            settings.bulk_upload_email_body_failed,
        )

    subject = _render_template(str(subject_template), file_name=file_name, email_count=email_count)
    body = _render_template(str(body_template), file_name=file_name, email_count=email_count)

    message = EmailMessage()
    message["From"] = formataddr((str(from_name), str(from_email)))
    message["To"] = recipient_email
    message["Reply-To"] = str(reply_to)
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(host=str(smtp_server), port=int(smtp_port), timeout=30) as smtp:
            if bool(smtp_starttls_required):
                context = ssl.create_default_context()
                smtp.starttls(context=context)
            smtp.login(str(smtp_username), str(smtp_password))
            smtp.send_message(message)
    except SMTPConfigurationError:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "bulk_upload_notification.smtp_send_failed",
            extra={
                "recipient_email": recipient_email,
                "outcome": outcome,
                "file_name": file_name,
                "email_count": email_count,
                "error": str(exc),
            },
        )
        raise SMTPDeliveryError("SMTP send failed") from exc

    logger.info(
        "bulk_upload_notification.email_sent",
        extra={
            "recipient_email": recipient_email,
            "outcome": outcome,
            "file_name": file_name,
            "email_count": email_count,
        },
    )
