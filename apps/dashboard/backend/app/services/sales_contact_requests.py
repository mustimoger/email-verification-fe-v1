import hashlib
import logging
from dataclasses import dataclass
from typing import Any, Optional
from uuid import uuid4

from postgrest.exceptions import APIError

from .supabase_client import fetch_auth_user, fetch_profile, get_supabase

logger = logging.getLogger(__name__)

UNIQUE_VIOLATION_CODE = "23505"
SALES_CONTACT_REQUESTS_TABLE = "sales_contact_requests"


class SalesContactPersistenceError(RuntimeError):
    pass


@dataclass(frozen=True)
class SalesContactRequestRecord:
    user_id: str
    source: str
    plan: str
    quantity: int
    contact_required: bool
    page: str
    request_ip: Optional[str]
    user_agent: Optional[str]
    account_email: Optional[str]
    idempotency_key: Optional[str]


@dataclass(frozen=True)
class SalesContactPersistResult:
    request_id: str
    deduplicated: bool


def _normalize_idempotency_key(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    return trimmed[:128]


def _stable_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _build_request_id(user_id: str, idempotency_key: Optional[str]) -> str:
    if idempotency_key:
        digest = _stable_hash(f"{user_id}:{idempotency_key}")[:24]
        return f"salesreq_{digest}"
    return f"salesreq_{uuid4().hex[:24]}"


def _extract_existing_request_id(user_id: str, idempotency_key: str, fallback_request_id: str) -> str:
    try:
        sb = get_supabase()
        response = (
            sb.table(SALES_CONTACT_REQUESTS_TABLE)
            .select("request_id")
            .eq("user_id", user_id)
            .eq("idempotency_key", idempotency_key)
            .limit(1)
            .execute()
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "sales.contact_request.lookup_failed",
            extra={"user_id": user_id, "error": str(exc)},
        )
        return fallback_request_id

    data = response.data or []
    if not data:
        return fallback_request_id

    if not isinstance(data[0], dict):
        return fallback_request_id
    request_id = data[0].get("request_id")
    if isinstance(request_id, str) and request_id.strip():
        return request_id
    return fallback_request_id


def persist_sales_contact_request(record: SalesContactRequestRecord) -> SalesContactPersistResult:
    normalized_key = _normalize_idempotency_key(record.idempotency_key)
    request_id = _build_request_id(record.user_id, normalized_key)
    row = {
        "request_id": request_id,
        "user_id": record.user_id,
        "account_email": record.account_email,
        "source": record.source,
        "plan": record.plan,
        "quantity": record.quantity,
        "contact_required": record.contact_required,
        "page": record.page,
        "request_ip": record.request_ip,
        "user_agent": record.user_agent,
        "idempotency_key": normalized_key,
        "metadata": {},
    }

    sb = get_supabase()
    try:
        sb.table(SALES_CONTACT_REQUESTS_TABLE).insert(row).execute()
        return SalesContactPersistResult(request_id=request_id, deduplicated=False)
    except APIError as exc:
        if exc.code == UNIQUE_VIOLATION_CODE and normalized_key:
            existing_request_id = _extract_existing_request_id(record.user_id, normalized_key, request_id)
            return SalesContactPersistResult(request_id=existing_request_id, deduplicated=True)
        logger.error(
            "sales.contact_request.persist_failed",
            extra={"request_id": request_id, "user_id": record.user_id, "error": exc.json()},
        )
        raise SalesContactPersistenceError("Unable to persist sales contact request") from exc
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "sales.contact_request.persist_failed",
            extra={"request_id": request_id, "user_id": record.user_id, "error": str(exc)},
        )
        raise SalesContactPersistenceError("Unable to persist sales contact request") from exc


def resolve_account_email(user_id: str, claims: Optional[dict[str, Any]]) -> Optional[str]:
    try:
        profile = fetch_profile(user_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("sales.contact_request.profile_lookup_failed", extra={"user_id": user_id, "error": str(exc)})
        profile = None

    profile_email = profile.get("email") if isinstance(profile, dict) else None
    if isinstance(profile_email, str) and profile_email.strip():
        return profile_email.strip()

    claim_email = claims.get("email") if isinstance(claims, dict) else None
    if isinstance(claim_email, str) and claim_email.strip():
        return claim_email.strip()

    try:
        auth_user = fetch_auth_user(user_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("sales.contact_request.auth_lookup_failed", extra={"user_id": user_id, "error": str(exc)})
        return None

    auth_email = getattr(auth_user, "email", None)
    if isinstance(auth_email, str) and auth_email.strip():
        return auth_email.strip()
    return None
