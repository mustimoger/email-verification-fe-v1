import logging
from fastapi import APIRouter, Depends, HTTPException, status

from ..core.auth import AuthContext, get_current_user
from ..clients.external import ExternalAPIClient, ExternalAPIError
from .api_keys import get_user_external_client

router = APIRouter(prefix="/api/debug", tags=["debug"])
logger = logging.getLogger(__name__)


@router.get("/me")
async def debug_me(user: AuthContext = Depends(get_current_user)):
    return {"user_id": user.user_id, "claims": user.claims}


@router.get("/tasks")
async def debug_tasks(
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    try:
        result = await client.list_tasks(limit=5, offset=0)
        tasks = result.tasks or []
        logger.info("debug.tasks", extra={"user_id": user.user_id, "count": len(tasks)})
        return {"user_id": user.user_id, "count": result.count, "tasks": tasks}
    except ExternalAPIError as exc:
        logger.warning(
            "debug.tasks.failed",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or "Unable to fetch tasks")
    except Exception as exc:  # noqa: BLE001
        logger.error("debug.tasks.error", extra={"user_id": user.user_id, "error": str(exc)})
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="External tasks service error") from exc
