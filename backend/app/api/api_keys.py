import logging
from fastapi import APIRouter, Depends, HTTPException, status

from ..clients.external import ExternalAPIClient, ExternalAPIError, get_external_api_client
from ..core.auth import AuthContext, get_current_user
from ..services.api_keys import (
    INTERNAL_DASHBOARD_KEY_NAME,
    cache_api_key,
    get_cached_key_by_name,
    list_cached_keys,
    resolve_user_api_key,
)
from ..services.usage import record_usage
from ..clients.external import ListAPIKeysResponse, CreateAPIKeyResponse, RevokeAPIKeyResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["api-keys"])
logger = logging.getLogger(__name__)


def _is_dashboard_key(name: str | None) -> bool:
    return (name or "").lower() == INTERNAL_DASHBOARD_KEY_NAME


class BootstrapKeyResponse(BaseModel):
    key_id: str
    name: str
    created: bool = False


@router.get("/api-keys", response_model=ListAPIKeysResponse)
async def list_api_keys(
    include_internal: bool = False,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_external_api_client),
):
    try:
        cached = {item["key_id"]: item for item in list_cached_keys(user.user_id)}
        result = await client.list_api_keys()
        # Filter external keys to those cached for this user to avoid leaking other users' keys when using a shared bearer.
        if cached and result.keys:
            filtered_keys = [
                k
                for k in result.keys
                if k.id in cached and (include_internal or not _is_dashboard_key(k.name))
            ]
            for key in filtered_keys:
                cached_row = cached.get(key.id or "")
                if cached_row:
                    key.integration = cached_row.get("integration")
            result.keys = filtered_keys
            result.count = len(filtered_keys)
        record_usage(user.user_id, path="/api-keys", count=1)
        logger.info("route.api_keys.list", extra={"user_id": user.user_id, "count": result.count})
        return result
    except ExternalAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


@router.post("/api-keys", response_model=CreateAPIKeyResponse)
async def create_api_key(
    payload: dict,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_external_api_client),
):
    name = payload.get("name")
    integration = payload.get("integration")
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="name is required")
    if _is_dashboard_key(name):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="dashboard key is reserved")
    try:
        result = await client.create_api_key(name=name)
        if not result.key:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="external API did not return a key")
        cache_api_key(
            user.user_id, key_id=result.id or name, name=name, key_plain=result.key, integration=integration or name
        )
        result.integration = integration or name
        record_usage(user.user_id, path="/api-keys", count=1)
        logger.info("route.api_keys.create", extra={"user_id": user.user_id, "name": name, "integration": integration})
        return result
    except ExternalAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


@router.post("/api-keys/bootstrap", response_model=BootstrapKeyResponse)
async def bootstrap_dashboard_key(
    user: AuthContext = Depends(get_current_user),
    master_client: ExternalAPIClient = Depends(get_external_api_client),
):
    """
    Ensure the per-user hidden dashboard key exists and is cached. Does not return the secret.
    """
    already = get_cached_key_by_name(user.user_id, INTERNAL_DASHBOARD_KEY_NAME)
    if already and already.get("key_plain") and already.get("key_id"):
        record_usage(user.user_id, path="/api-keys/bootstrap", count=1)
        logger.info(
            "route.api_keys.bootstrap.cached",
            extra={"user_id": user.user_id, "key_id": already.get("key_id"), "created": False},
        )
        return BootstrapKeyResponse(
            key_id=already["key_id"], name=INTERNAL_DASHBOARD_KEY_NAME, created=False
        )
    try:
        _, key_id = await resolve_user_api_key(
            user_id=user.user_id, desired_name=INTERNAL_DASHBOARD_KEY_NAME, master_client=master_client
        )
        created = not (already and already.get("key_id") == key_id and already.get("key_plain"))
        record_usage(user.user_id, path="/api-keys/bootstrap", count=1)
        logger.info(
            "route.api_keys.bootstrap",
            extra={"user_id": user.user_id, "key_id": key_id, "created": created},
        )
        return BootstrapKeyResponse(key_id=key_id, name=INTERNAL_DASHBOARD_KEY_NAME, created=created)
    except ExternalAPIError as exc:
        logger.error(
            "route.api_keys.bootstrap_failed",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


@router.delete("/api-keys/{api_key_id}", response_model=RevokeAPIKeyResponse)
async def revoke_api_key(
    api_key_id: str,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_external_api_client),
):
    try:
        result = await client.revoke_api_key(api_key_id=api_key_id)
        record_usage(user.user_id, path="/api-keys", count=1)
        logger.info("route.api_keys.revoke", extra={"user_id": user.user_id, "api_key_id": api_key_id})
        return result
    except ExternalAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])
