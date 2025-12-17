import logging
from fastapi import APIRouter, Depends

from ..core.auth import AuthContext, get_current_user
from ..services.tasks_store import fetch_tasks_with_counts

router = APIRouter(prefix="/api/debug", tags=["debug"])
logger = logging.getLogger(__name__)


@router.get("/me")
async def debug_me(user: AuthContext = Depends(get_current_user)):
    return {"user_id": user.user_id, "claims": user.claims}


@router.get("/tasks")
async def debug_tasks(user: AuthContext = Depends(get_current_user)):
    data = fetch_tasks_with_counts(user.user_id, limit=5, offset=0)
    logger.info("debug.tasks", extra={"user_id": user.user_id, "count": len(data.get('tasks', []))})
    return {"user_id": user.user_id, "count": data.get("count"), "tasks": data.get("tasks", [])}
