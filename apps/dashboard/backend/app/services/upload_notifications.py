import hashlib
import hmac
import logging
from typing import Any, Mapping, Optional

from fastapi import HTTPException, status

from ..clients.external import ExternalAPIClient, ExternalAPIError, TaskDetailResponse
from ..core.settings import get_settings
from . import supabase_client
from .billing_events import delete_billing_event, record_billing_event
from .external_credits import _resolve_admin_token
from .smtp_mailer import SMTPConfigurationError, SMTPDeliveryError, send_bulk_upload_notification_email

logger = logging.getLogger(__name__)


def _normalize_text(value: object) -> Optional[str]:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    return trimmed or None


def _normalize_outcome(value: object) -> Optional[str]:
    normalized = _normalize_text(value)
    if not normalized:
        return None
    lowered = normalized.lower()
    if lowered in {"completed", "failed"}:
        return lowered
    return None


def _resolve_outcome(task_detail: TaskDetailResponse, payload_data: dict[str, Any]) -> Optional[str]:
    file_metadata = getattr(task_detail, "file", None)
    file_status = _normalize_outcome(getattr(file_metadata, "status", None) if file_metadata else None)
    if file_status:
        return file_status

    stats = payload_data.get("stats") if isinstance(payload_data, dict) else None
    if not isinstance(stats, dict):
        return None

    failed = stats.get("failed")
    completed = stats.get("completed")
    if isinstance(failed, int) and failed > 0:
        return "failed"
    if isinstance(completed, int) and completed >= 0:
        return "completed"
    return None


def _is_task_completion_payload(data: object) -> bool:
    if not isinstance(data, dict):
        return False
    return isinstance(data.get("stats"), dict) and isinstance(data.get("jobs"), list)


def _is_file_backed_task(task: TaskDetailResponse) -> bool:
    if bool(getattr(task, "is_file_backed", False)):
        return True
    file_metadata = getattr(task, "file", None)
    if file_metadata is None:
        return False
    upload_id = _normalize_text(getattr(file_metadata, "upload_id", None))
    filename = _normalize_text(getattr(file_metadata, "filename", None))
    return bool(upload_id or filename)


def _resolve_user_id(task: TaskDetailResponse, payload_data: dict[str, Any]) -> Optional[str]:
    return _normalize_text(getattr(task, "user_id", None)) or _normalize_text(payload_data.get("user_id"))


def _resolve_file_name(task: TaskDetailResponse) -> Optional[str]:
    file_metadata = getattr(task, "file", None)
    return _normalize_text(getattr(file_metadata, "filename", None)) or _normalize_text(getattr(task, "file_name", None))


def _resolve_email_count(task: TaskDetailResponse, payload_data: dict[str, Any]) -> Optional[int]:
    file_metadata = getattr(task, "file", None)
    file_count = getattr(file_metadata, "email_count", None) if file_metadata else None
    if isinstance(file_count, int) and file_count >= 0:
        return file_count

    stats = payload_data.get("stats") if isinstance(payload_data, dict) else None
    if isinstance(stats, dict):
        total = stats.get("total")
        if isinstance(total, int) and total >= 0:
            return total

    jobs = payload_data.get("jobs") if isinstance(payload_data, dict) else None
    if isinstance(jobs, list):
        return len(jobs)

    return None


def _resolve_recipient_email(user_id: str) -> Optional[str]:
    try:
        profile = supabase_client.fetch_profile(user_id)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "bulk_upload_notification.profile_lookup_failed",
            extra={"user_id": user_id, "error": str(exc)},
        )
        profile = None

    profile_email = _normalize_text(profile.get("email")) if isinstance(profile, dict) else None
    if profile_email:
        return profile_email

    try:
        auth_user = supabase_client.fetch_auth_user(user_id)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "bulk_upload_notification.auth_user_lookup_failed",
            extra={"user_id": user_id, "error": str(exc)},
        )
        return None

    return _normalize_text(getattr(auth_user, "email", None))


def _verify_signature(raw_body: bytes, headers: Mapping[str, str], secret_key: Optional[str]) -> None:
    if not secret_key:
        return

    signature_header = headers.get("X-Webhook-Signature")
    if not signature_header:
        logger.warning("bulk_upload_notification.signature_missing")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing webhook signature")

    digest = hmac.new(secret_key.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    expected = f"sha256={digest}"
    if not hmac.compare_digest(expected, signature_header.strip()):
        logger.warning("bulk_upload_notification.signature_invalid")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")


def _build_admin_client() -> Optional[ExternalAPIClient]:
    settings = get_settings()
    token = _resolve_admin_token()
    if not token:
        logger.error("bulk_upload_notification.admin_token_missing")
        return None
    return ExternalAPIClient(
        base_url=settings.email_api_base_url,
        bearer_token=token,
        max_upload_bytes=settings.upload_max_mb * 1024 * 1024,
    )


async def process_bulk_upload_webhook(*, payload: dict[str, Any], raw_body: bytes, headers: Mapping[str, str]) -> dict[str, Any]:
    settings = get_settings()
    _verify_signature(raw_body, headers, settings.bulk_upload_webhook_secret_key)

    event_type = _normalize_text(payload.get("event_type"))
    task_id = _normalize_text(payload.get("task_id"))
    data = payload.get("data")

    if event_type != "email_verification_completed":
        logger.info("bulk_upload_notification.event_ignored", extra={"event_type": event_type, "task_id": task_id})
        return {"received": True, "processed": False, "reason": "event_type_not_supported"}

    if not task_id:
        logger.warning("bulk_upload_notification.task_id_missing")
        return {"received": True, "processed": False, "reason": "task_id_missing"}

    if not _is_task_completion_payload(data):
        logger.info(
            "bulk_upload_notification.per_email_ignored",
            extra={"task_id": task_id},
        )
        return {"received": True, "processed": False, "reason": "not_task_completion"}

    payload_data: dict[str, Any] = data

    client = _build_admin_client()
    if client is None:
        return {"received": True, "processed": False, "reason": "admin_token_missing"}

    try:
        task_detail = await client.get_task_detail(task_id)
    except ExternalAPIError as exc:
        logger.error(
            "bulk_upload_notification.task_detail_failed",
            extra={"task_id": task_id, "status_code": exc.status_code, "details": exc.details},
        )
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to fetch task detail") from exc

    if not _is_file_backed_task(task_detail):
        logger.info(
            "bulk_upload_notification.non_file_task_ignored",
            extra={"task_id": task_id},
        )
        return {"received": True, "processed": False, "reason": "not_file_backed"}

    outcome = _resolve_outcome(task_detail, payload_data)
    if outcome is None:
        logger.warning("bulk_upload_notification.outcome_unknown", extra={"task_id": task_id})
        return {"received": True, "processed": False, "reason": "outcome_unknown"}

    user_id = _resolve_user_id(task_detail, payload_data)
    if not user_id:
        logger.warning("bulk_upload_notification.user_id_missing", extra={"task_id": task_id})
        return {"received": True, "processed": False, "reason": "user_id_missing"}

    recipient_email = _resolve_recipient_email(user_id)
    if not recipient_email:
        logger.warning(
            "bulk_upload_notification.recipient_missing",
            extra={"task_id": task_id, "user_id": user_id},
        )
        return {"received": True, "processed": False, "reason": "recipient_missing"}

    file_name = _resolve_file_name(task_detail)
    email_count = _resolve_email_count(task_detail, payload_data)
    if not file_name or email_count is None:
        logger.warning(
            "bulk_upload_notification.task_metadata_missing",
            extra={
                "task_id": task_id,
                "user_id": user_id,
                "has_file_name": bool(file_name),
                "email_count": email_count,
            },
        )
        return {"received": True, "processed": False, "reason": "task_metadata_missing"}

    idempotency_event_id = f"bulk_upload_notification:{task_id}:{outcome}"
    recorded = record_billing_event(
        event_id=idempotency_event_id,
        user_id=user_id,
        event_type=f"bulk_upload_notification.{outcome}",
        transaction_id=task_id,
        price_ids=[],
        credits_granted=0,
        raw=payload,
    )
    if not recorded:
        logger.info(
            "bulk_upload_notification.duplicate_or_not_recorded",
            extra={"task_id": task_id, "event_id": idempotency_event_id, "outcome": outcome},
        )
        return {"received": True, "processed": False, "reason": "duplicate_or_not_recorded"}

    try:
        send_bulk_upload_notification_email(
            recipient_email=recipient_email,
            outcome=outcome,
            file_name=file_name,
            email_count=email_count,
        )
    except SMTPConfigurationError as exc:
        delete_billing_event(idempotency_event_id)
        logger.error(
            "bulk_upload_notification.smtp_configuration_error",
            extra={"task_id": task_id, "event_id": idempotency_event_id, "error": str(exc)},
        )
        return {"received": True, "processed": False, "reason": "smtp_configuration_error"}
    except SMTPDeliveryError as exc:
        delete_billing_event(idempotency_event_id)
        logger.error(
            "bulk_upload_notification.smtp_delivery_error",
            extra={"task_id": task_id, "event_id": idempotency_event_id, "error": str(exc)},
        )
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Email delivery failed") from exc

    return {
        "received": True,
        "processed": True,
        "task_id": task_id,
        "outcome": outcome,
        "recipient_email": recipient_email,
        "file_name": file_name,
        "email_count": email_count,
    }
