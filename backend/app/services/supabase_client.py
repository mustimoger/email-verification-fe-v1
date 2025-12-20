import logging
from functools import lru_cache
from typing import Any, Dict, List, Optional

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


def fetch_usage(
    user_id: str,
    start: Optional[str] = None,
    end: Optional[str] = None,
    api_key_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    sb = get_supabase()
    query = sb.table("api_usage").select("*").eq("user_id", user_id)
    if start:
        query = query.gte("period_start", start)
    if end:
        query = query.lte("period_end", end)
    if api_key_id:
        query = query.eq("api_key_id", api_key_id)
    res = query.order("period_start", desc=False).execute()
    return res.data or []
