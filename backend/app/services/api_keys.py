import logging
from typing import Dict, List

from .supabase_client import get_supabase

logger = logging.getLogger(__name__)


def cache_api_key(user_id: str, key_id: str, name: str) -> None:
    """
    Persist API key metadata so we can show it later without storing plaintext.
    """
    sb = get_supabase()
    try:
        sb.table("cached_api_keys").upsert(
            {"user_id": user_id, "key_id": key_id, "name": name}, on_conflict="key_id"
        ).execute()
        logger.info("api_keys.cached", extra={"user_id": user_id, "key_id": key_id})
    except Exception as exc:
        logger.error("api_keys.cache_failed", extra={"error": str(exc), "user_id": user_id, "key_id": key_id})


def list_cached_keys(user_id: str) -> List[Dict[str, str]]:
    """
    Return cached key metadata for a user.
    """
    sb = get_supabase()
    try:
        res = sb.table("cached_api_keys").select("key_id,name").eq("user_id", user_id).execute()
        items: List[Dict[str, str]] = res.data or []
        logger.info("api_keys.cache_list", extra={"user_id": user_id, "count": len(items)})
        return items
    except Exception as exc:
        logger.error("api_keys.cache_list_failed", extra={"error": str(exc), "user_id": user_id})
        return []
