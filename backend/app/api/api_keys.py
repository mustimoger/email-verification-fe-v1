import logging
from fastapi import APIRouter, Depends, HTTPException, status

from ..clients.external import ExternalAPIClient, ExternalAPIError, get_external_api_client
from ..core.auth import AuthContext, get_current_user
from ..services.api_keys import INTERNAL_DASHBOARD_KEY_NAME, cache_api_key, list_cached_keys
from ..services.usage import record_usage
from ..clients.external import ListAPIKeysResponse, CreateAPIKeyResponse, RevokeAPIKeyResponse

router = APIRouter(prefix="/api", tags=["api-keys"])
logger = logging.getLogger(__name__)


def _is_dashboard_key(name: str | None) -> bool:
    return (name or "").lower() == INTERNAL_DASHBOARD_KEY_NAME


@router.get("/api-keys", response_model=ListAPIKeysResponse)
async def list_api_keys(
    user: AuthContext = Depends(get_current_user), client: ExternalAPIClient = Depends(get_external_api_client)
):
    try:
        cached = {item["key_id"]: item for item in list_cached_keys(user.user_id)}
        result = await client.list_api_keys()
        # Filter external keys to those cached for this user to avoid leaking other users' keys when using a shared bearer.
        if cached and result.keys:
            filtered_keys = [k for k in result.keys if k.id in cached and not _is_dashboard_key(k.name)]
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
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="name is required")
    if _is_dashboard_key(name):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="dashboard key is reserved")
    try:
        result = await client.create_api_key(name=name)
        cache_api_key(user.user_id, key_id=result.id or name, name=name)
        record_usage(user.user_id, path="/api-keys", count=1)
        logger.info("route.api_keys.create", extra={"user_id": user.user_id, "name": name})
        return result
    except ExternalAPIError as exc:
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
