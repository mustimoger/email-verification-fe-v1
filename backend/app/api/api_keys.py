import logging
from datetime import datetime
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..clients.external import ExternalAPIClient, ExternalAPIError
from ..core.auth import AuthContext, get_current_user
from ..core.settings import get_settings
from ..config.integrations import get_integration_by_id, get_integration_ids, get_integrations
from ..services.date_range import normalize_range_value
from ..clients.external import ListAPIKeysResponse, CreateAPIKeyResponse, RevokeAPIKeyResponse

router = APIRouter(prefix="/api", tags=["api-keys"])
logger = logging.getLogger(__name__)

INTERNAL_DASHBOARD_KEY_NAME = "dashboard_api"


def _is_dashboard_key(name: str | None) -> bool:
    return (name or "").lower() == INTERNAL_DASHBOARD_KEY_NAME


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


def _normalize_purpose(value: str | None) -> str:
    if not value:
        return ""
    cleaned = value.strip().lower().replace("_", " ").replace("-", " ")
    return " ".join(cleaned.split())


@lru_cache()
def _purpose_to_integration_id() -> dict[str, str]:
    mapping: dict[str, str] = {}
    for integration in get_integrations():
        normalized = _normalize_purpose(integration.external_purpose)
        if normalized:
            mapping[normalized] = integration.id
    return mapping


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
    try:
        result = await client.list_api_keys(
            user_id=target_user_id if user_id else None,
            start=start_value,
            end=end_value,
        )
        if result.keys:
            filtered_keys = [k for k in result.keys if include_internal or not _is_dashboard_key(k.name)]
            purpose_map = _purpose_to_integration_id()
            unmapped: list[str] = []
            for key in filtered_keys:
                if key.integration:
                    continue
                normalized = _normalize_purpose(key.purpose)
                if normalized and normalized in purpose_map:
                    key.integration = purpose_map[normalized]
                elif normalized:
                    unmapped.append(normalized)
            if unmapped:
                logger.info(
                    "route.api_keys.purpose_unmapped",
                    extra={"user_id": target_user_id, "purposes": sorted(set(unmapped))},
                )
            result.keys = filtered_keys
            result.count = len(filtered_keys) if filtered_keys is not None else result.count
        # With per-user JWTs, return the external list (filtered for internal keys if needed).
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
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


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
        result.integration = integration or name
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
        logger.info("route.api_keys.revoke", extra={"user_id": target_user_id, "api_key_id": api_key_id})
        return result
    except ExternalAPIError as exc:
        level = logger.warning if exc.status_code in (401, 403) else logger.error
        level(
            "route.api_keys.revoke.failed",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or "Not authorized to revoke API keys")
