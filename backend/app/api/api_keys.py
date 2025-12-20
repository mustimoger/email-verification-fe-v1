import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..clients.external import ExternalAPIClient, ExternalAPIError
from ..core.auth import AuthContext, get_current_user
from ..core.settings import get_settings
from ..services.api_keys import (
    INTERNAL_DASHBOARD_KEY_NAME,
    cache_api_key,
    get_cached_key_by_name,
    list_cached_keys,
)
from ..config.integrations import get_integration_by_id, get_integration_ids
from ..services.usage import record_usage
from ..clients.external import APIKeySummary, ListAPIKeysResponse, CreateAPIKeyResponse, RevokeAPIKeyResponse
from ..services.usage_summary import normalize_range_value
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["api-keys"])
logger = logging.getLogger(__name__)


def _is_dashboard_key(name: str | None) -> bool:
    return (name or "").lower() == INTERNAL_DASHBOARD_KEY_NAME


def _build_key_preview(secret: str | None) -> str | None:
    if not secret:
        return None
    trimmed = secret.strip()
    if trimmed == "":
        return None
    preview = trimmed[:3]
    return f"{preview}***"


class BootstrapKeyResponse(BaseModel):
    key_id: str | None
    name: str
    created: bool = False
    skipped: bool = False
    error: str | None = None


def get_user_external_client(user: AuthContext = Depends(get_current_user)) -> ExternalAPIClient:
    """
    Build an external API client using the caller's Supabase JWT.
    """
    settings = get_settings()
    return ExternalAPIClient(
        base_url=settings.email_api_base_url,
        bearer_token=user.token,
        max_upload_bytes=settings.upload_max_mb * 1024 * 1024,
    )


@router.get("/api-keys", response_model=ListAPIKeysResponse)
async def list_api_keys(
    include_internal: bool = False,
    user_id: str | None = None,
    range_start: str | None = Query(default=None, alias="from", description="RFC3339 start timestamp"),
    range_end: str | None = Query(default=None, alias="to", description="RFC3339 end timestamp"),
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    try:
        start_value = normalize_range_value(range_start)
        end_value = normalize_range_value(range_end)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if start_value and end_value:
        start_dt = datetime.fromisoformat(start_value)
        end_dt = datetime.fromisoformat(end_value)
        if start_dt > end_dt:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="from must be before to")

    target_user_id = user.user_id
    if user_id:
        if user.role != "admin":
            logger.warning(
                "route.api_keys.list.forbidden_user_id",
                extra={"user_id": user.user_id, "requested_user_id": user_id},
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
        target_user_id = user_id
        logger.info(
            "route.api_keys.list.admin_scope",
            extra={"admin_user_id": user.user_id, "target_user_id": target_user_id},
        )
    cached = {item["key_id"]: item for item in list_cached_keys(target_user_id)}
    try:
        result = await client.list_api_keys(
            user_id=target_user_id if user_id else None,
            start=start_value,
            end=end_value,
        )
        if result.keys:
            filtered_keys = [k for k in result.keys if include_internal or not _is_dashboard_key(k.name)]
            for key in filtered_keys:
                cached_entry = cached.get(key.id or "")
                if cached_entry:
                    key.integration = cached_entry.get("integration") or key.integration
                    key.key_preview = _build_key_preview(cached_entry.get("key_plain"))
            result.keys = filtered_keys
            result.count = len(filtered_keys) if filtered_keys is not None else result.count
        # With per-user JWTs, we can return the full list; fall back to cached if needed.
        record_usage(target_user_id, path="/api-keys", count=1)
        logger.info(
            "route.api_keys.list",
            extra={
                "user_id": target_user_id,
                "count": result.count,
                "from": start_value,
                "to": end_value,
            },
        )
        return result
    except ExternalAPIError as exc:
        if exc.status_code in (401, 403):
            logger.warning(
                "route.api_keys.list_unauthorized",
                extra={"user_id": target_user_id, "status_code": exc.status_code, "details": exc.details},
            )
        else:
            logger.warning(
                "route.api_keys.list_external_failed",
                extra={"user_id": target_user_id, "status_code": exc.status_code, "details": exc.details},
            )
        if start_value or end_value:
            logger.warning(
                "route.api_keys.list_cache_fallback_range_ignored",
                extra={"user_id": target_user_id, "from": start_value, "to": end_value},
            )
        # Safe fallback to cached keys (if any), excluding dashboard unless requested.
        logger.warning(
            "route.api_keys.list_cache_fallback",
            extra={"user_id": target_user_id, "count": len(cached)},
        )
        fallback_keys = []
        if cached:
            fallback_keys = [
                APIKeySummary(
                    id=item.get("key_id"),
                    name=item.get("name"),
                    integration=item.get("integration"),
                    is_active=True,
                    key_preview=_build_key_preview(item.get("key_plain")),
                )
                for item in cached.values()
                if include_internal or not _is_dashboard_key(item.get("name"))
            ]
        record_usage(target_user_id, path="/api-keys", count=len(fallback_keys))
        logger.info(
            "route.api_keys.list_cache_fallback",
            extra={"user_id": target_user_id, "count": len(fallback_keys)},
        )
        return ListAPIKeysResponse(count=len(fallback_keys), keys=fallback_keys)


@router.post("/api-keys", response_model=CreateAPIKeyResponse)
async def create_api_key(
    payload: dict,
    user_id: str | None = None,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    name = payload.get("name")
    integration = payload.get("integration")
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="name is required")
    if not integration:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="integration is required")
    if _is_dashboard_key(name):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="dashboard key is reserved")
    allowed = set(get_integration_ids())
    if integration not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unknown integration")
    integration_def = get_integration_by_id(integration)
    if not integration_def or not integration_def.external_purpose:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="integration purpose not configured")
    try:
        target_user_id = user.user_id
        if user_id:
            if user.role != "admin":
                logger.warning(
                    "route.api_keys.create.forbidden_user_id",
                    extra={"user_id": user.user_id, "requested_user_id": user_id},
                )
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
            target_user_id = user_id
            logger.info(
                "route.api_keys.create.admin_scope",
                extra={"admin_user_id": user.user_id, "target_user_id": target_user_id},
            )
        result = await client.create_api_key(
            name=name,
            purpose=integration_def.external_purpose,
            user_id=target_user_id if user_id else None,
        )
        if not result.key:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="external API did not return a key")
        cache_api_key(
            target_user_id, key_id=result.id or name, name=name, key_plain=result.key, integration=integration or name
        )
        result.integration = integration or name
        record_usage(target_user_id, path="/api-keys", count=1)
        logger.info(
            "route.api_keys.create",
            extra={"user_id": target_user_id, "key_name": name, "integration": integration},
        )
        return result
    except ExternalAPIError as exc:
        level = logger.warning if exc.status_code in (401, 403) else logger.error
        level(
            "route.api_keys.create.failed",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or "Not authorized to create API keys")


@router.post("/api-keys/bootstrap", response_model=BootstrapKeyResponse)
async def bootstrap_dashboard_key(
    user: AuthContext = Depends(get_current_user),
):
    """
    Legacy endpoint kept for compatibility. Dashboard key creation via dev master key is disabled.
    """
    already = get_cached_key_by_name(user.user_id, INTERNAL_DASHBOARD_KEY_NAME)
    logger.info(
        "route.api_keys.bootstrap.disabled",
        extra={"user_id": user.user_id, "cached": bool(already)},
    )
    record_usage(user.user_id, path="/api-keys/bootstrap", count=0)
    return BootstrapKeyResponse(
        key_id=already.get("key_id") if already else None,
        name=INTERNAL_DASHBOARD_KEY_NAME,
        created=False,
        skipped=True,
        error="Dashboard key creation is disabled; external API now expects Supabase JWT auth.",
    )


@router.delete("/api-keys/{api_key_id}", response_model=RevokeAPIKeyResponse)
async def revoke_api_key(
    api_key_id: str,
    user_id: str | None = None,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    try:
        target_user_id = user.user_id
        if user_id:
            if user.role != "admin":
                logger.warning(
                    "route.api_keys.revoke.forbidden_user_id",
                    extra={"user_id": user.user_id, "requested_user_id": user_id},
                )
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
            target_user_id = user_id
            logger.info(
                "route.api_keys.revoke.admin_scope",
                extra={"admin_user_id": user.user_id, "target_user_id": target_user_id},
            )
        result = await client.revoke_api_key(
            api_key_id=api_key_id,
            user_id=target_user_id if user_id else None,
        )
        record_usage(target_user_id, path="/api-keys", count=1)
        logger.info("route.api_keys.revoke", extra={"user_id": target_user_id, "api_key_id": api_key_id})
        return result
    except ExternalAPIError as exc:
        level = logger.warning if exc.status_code in (401, 403) else logger.error
        level(
            "route.api_keys.revoke.failed",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or "Not authorized to revoke API keys")
