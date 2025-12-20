import logging
from typing import Dict, List, Optional, Tuple

from ..clients.external import CreateAPIKeyResponse, ExternalAPIClient, ExternalAPIError
from .supabase_client import get_supabase

logger = logging.getLogger(__name__)

INTERNAL_DASHBOARD_KEY_NAME = "dashboard_api"


def cache_api_key(
    user_id: str, key_id: str, name: str, key_plain: Optional[str] = None, integration: Optional[str] = None
) -> None:
    """
    Persist API key metadata so we can show it later without storing plaintext.
    """
    sb = get_supabase()
    try:
        payload: Dict[str, Optional[str]] = {"user_id": user_id, "key_id": key_id, "name": name}
        if key_plain:
            payload["key_plain"] = key_plain
        if integration:
            payload["integration"] = integration
        sb.table("cached_api_keys").upsert(payload, on_conflict="key_id").execute()
        logger.info(
            "api_keys.cached",
            extra={
                "user_id": user_id,
                "key_id": key_id,
                "key_name": name,
                "integration": integration,
                "has_secret": bool(key_plain),
            },
        )
    except Exception as exc:
        logger.error("api_keys.cache_failed", extra={"error": str(exc), "user_id": user_id, "key_id": key_id})


def list_cached_keys(user_id: str) -> List[Dict[str, str]]:
    """
    Return cached key metadata for a user.
    """
    sb = get_supabase()
    try:
        res = (
            sb.table("cached_api_keys")
            .select("key_id,name,integration,key_plain")
            .eq("user_id", user_id)
            .execute()
        )
        items: List[Dict[str, str]] = res.data or []
        logger.info("api_keys.cache_list", extra={"user_id": user_id, "count": len(items)})
        return items
    except Exception as exc:
        logger.error("api_keys.cache_list_failed", extra={"error": str(exc), "user_id": user_id})
        return []


def get_cached_key_by_name(user_id: str, name: str) -> Optional[Dict[str, str]]:
    sb = get_supabase()
    try:
        res = (
            sb.table("cached_api_keys")
            .select("key_id,name,key_plain,integration")
            .eq("user_id", user_id)
            .eq("name", name)
            .limit(1)
            .execute()
        )
        data: List[Dict[str, str]] = res.data or []
        return data[0] if data else None
    except Exception as exc:
        logger.error("api_keys.cache_lookup_failed", extra={"error": str(exc), "user_id": user_id, "cache_key_name": name})
        return None


def get_cached_key_by_id(user_id: str, key_id: str) -> Optional[Dict[str, str]]:
    sb = get_supabase()
    try:
        res = (
            sb.table("cached_api_keys")
            .select("key_id,name,key_plain,integration")
            .eq("user_id", user_id)
            .eq("key_id", key_id)
            .limit(1)
            .execute()
        )
        data: List[Dict[str, str]] = res.data or []
        return data[0] if data else None
    except Exception as exc:
        logger.error("api_keys.cache_lookup_by_id_failed", extra={"error": str(exc), "user_id": user_id, "key_id": key_id})
        return None


async def resolve_user_api_key(
    user_id: str, desired_name: str, master_client: ExternalAPIClient, purpose: str
) -> Tuple[str, str]:
    """
    Return (key_secret, key_id) for the user's key with the given name, creating and caching it if missing.
    """
    cached = get_cached_key_by_name(user_id, desired_name)
    if cached and cached.get("key_plain"):
        logger.info(
            "api_keys.resolve.cached",
            extra={"user_id": user_id, "key_name": desired_name, "key_id": cached.get("key_id")},
        )
        return cached["key_plain"], cached["key_id"]

    if cached and not cached.get("key_plain"):
        logger.warning(
            "api_keys.resolve.missing_secret",
            extra={"user_id": user_id, "key_name": desired_name, "key_id": cached.get("key_id")},
        )

    try:
        if not purpose:
            raise ExternalAPIError(status_code=400, message="API key purpose is required")
        created: CreateAPIKeyResponse = await master_client.create_api_key(name=desired_name, purpose=purpose)
        key_secret = created.key or created.id
        if not key_secret:
            raise ExternalAPIError(status_code=500, message="External API did not return key secret")
        cache_api_key(user_id, key_id=created.id or key_secret, name=desired_name, key_plain=key_secret)
        logger.info(
            "api_keys.resolve.created",
            extra={"user_id": user_id, "key_name": desired_name, "key_id": created.id},
        )
        return key_secret, created.id or key_secret
    except ExternalAPIError:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("api_keys.resolve.failed", extra={"user_id": user_id, "key_name": desired_name})
        raise ExternalAPIError(status_code=500, message="Failed to resolve API key", details=str(exc)) from exc
