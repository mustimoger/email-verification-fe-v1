import logging
from functools import lru_cache
from typing import Any, Dict, List, Optional

from supabase_auth.types import User

from supabase import Client, create_client

from ..core.settings import get_settings

logger = logging.getLogger(__name__)


@lru_cache()
def get_supabase() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise ValueError("Supabase URL and service role key are required")
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    logger.info("supabase.client_initialized", extra={"url": settings.supabase_url})
    return client


def get_storage():
    return get_supabase().storage


def fetch_profile(user_id: str) -> Optional[Dict[str, Any]]:
    sb = get_supabase()
    res = sb.table("profiles").select("*").eq("user_id", user_id).limit(1).execute()
    data: List[Dict[str, Any]] = res.data or []
    return data[0] if data else None


def fetch_profile_by_email(email: str) -> Optional[Dict[str, Any]]:
    sb = get_supabase()
    res = sb.table("profiles").select("*").eq("email", email).limit(2).execute()
    data: List[Dict[str, Any]] = res.data or []
    if not data:
        return None
    if len(data) > 1:
        logger.error("supabase.profile.email_not_unique", extra={"email": email, "count": len(data)})
        return None
    return data[0]


def upsert_profile(
    user_id: str,
    email: Optional[str],
    display_name: Optional[str],
    avatar_url: Optional[str] = None,
) -> Dict[str, Any]:
    sb = get_supabase()
    payload: Dict[str, Any] = {"user_id": user_id}
    if email is not None:
        payload["email"] = email
    if display_name is not None:
        payload["display_name"] = display_name
    if avatar_url is not None:
        payload["avatar_url"] = avatar_url
    res = sb.table("profiles").upsert(payload, on_conflict="user_id").execute()
    data: List[Dict[str, Any]] = res.data or []
    # supabase-py upsert may return the inserted row or empty; fall back to payload
    return data[0] if data else payload


def fetch_credits(user_id: str) -> int:
    row = fetch_credits_row(user_id)
    return int(row["credits_remaining"]) if row else 0


def fetch_credits_row(user_id: str) -> Optional[Dict[str, Any]]:
    sb = get_supabase()
    res = sb.table("user_credits").select("*").eq("user_id", user_id).limit(1).execute()
    data: List[Dict[str, Any]] = res.data or []
    return data[0] if data else None


def fetch_auth_user(user_id: str) -> User:
    sb = get_supabase()
    try:
        res = sb.auth.admin.get_user_by_id(user_id)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "supabase.auth.user_fetch_failed",
            extra={"user_id": user_id, "error": str(exc)},
        )
        raise
    user = getattr(res, "user", None)
    if not user:
        logger.error("supabase.auth.user_missing", extra={"user_id": user_id})
        raise RuntimeError("Supabase auth user lookup returned no user")
    return user


def set_credits(user_id: str, credits_remaining: int) -> Dict[str, Any]:
    sb = get_supabase()
    payload = {"user_id": user_id, "credits_remaining": credits_remaining}
    res = sb.table("user_credits").upsert(payload, on_conflict="user_id").execute()
    error = getattr(res, "error", None)
    if error:
        logger.error(
            "supabase.credits.upsert_failed error=%s",
            error,
            extra={"user_id": user_id},
        )
        raise RuntimeError("Credits upsert failed")
    data: List[Dict[str, Any]] = res.data or []
    if data:
        return data[0]
    row = fetch_credits_row(user_id)
    if row:
        logger.warning("supabase.credits.upsert_no_data", extra={"user_id": user_id})
        return row
    logger.error("supabase.credits.upsert_missing_row", extra={"user_id": user_id})
    raise RuntimeError("Credits upsert returned no row")


def increment_credits(user_id: str, delta: int) -> Dict[str, Any]:
    current = fetch_credits(user_id)
    new_value = current + delta
    if new_value < 0:
        new_value = 0
    return set_credits(user_id, new_value)


def debit_credits(user_id: str, amount: int) -> Optional[Dict[str, Any]]:
    sb = get_supabase()
    payload = {"p_user_id": user_id, "p_amount": amount}
    try:
        res = sb.rpc("debit_credits", payload).execute()
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "supabase.credits.debit_failed",
            extra={"user_id": user_id, "amount": amount, "error": str(exc)},
        )
        raise
    data: List[Dict[str, Any]] = res.data or []
    if not data:
        logger.info("supabase.credits.debit_insufficient", extra={"user_id": user_id, "amount": amount})
        return None
    return data[0]


def apply_credit_debit(
    user_id: str,
    amount: int,
    source: str,
    source_id: str,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    sb = get_supabase()
    payload = {
        "p_user_id": user_id,
        "p_amount": amount,
        "p_source": source,
        "p_source_id": source_id,
        "p_meta": meta or {},
    }
    try:
        res = sb.rpc("apply_credit_debit", payload).execute()
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "supabase.credits.apply_failed",
            extra={"user_id": user_id, "amount": amount, "source": source, "source_id": source_id, "error": str(exc)},
        )
        raise
    data: List[Dict[str, Any]] = res.data or []
    if not data:
        logger.error(
            "supabase.credits.apply_missing_row",
            extra={"user_id": user_id, "amount": amount, "source": source, "source_id": source_id},
        )
        raise RuntimeError("Credit debit returned no row")
    return data[0]


def apply_credit_release(
    user_id: str,
    amount: int,
    source: str,
    source_id: str,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    sb = get_supabase()
    payload = {
        "p_user_id": user_id,
        "p_amount": amount,
        "p_source": source,
        "p_source_id": source_id,
        "p_meta": meta or {},
    }
    try:
        res = sb.rpc("apply_credit_release", payload).execute()
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "supabase.credits.release_failed",
            extra={"user_id": user_id, "amount": amount, "source": source, "source_id": source_id, "error": str(exc)},
        )
        raise
    data: List[Dict[str, Any]] = res.data or []
    if not data:
        logger.error(
            "supabase.credits.release_missing_row",
            extra={"user_id": user_id, "amount": amount, "source": source, "source_id": source_id},
        )
        raise RuntimeError("Credit release returned no row")
    return data[0]

