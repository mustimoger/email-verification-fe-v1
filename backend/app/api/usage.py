import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from ..core.auth import AuthContext, get_current_user
from ..services import supabase_client

router = APIRouter(prefix="/api/usage", tags=["usage"])
logger = logging.getLogger(__name__)


class UsageEntry(BaseModel):
    id: str
    user_id: str
    api_key_id: Optional[str] = None
    path: Optional[str] = None
    count: int
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    created_at: Optional[str] = None


class UsageResponse(BaseModel):
    items: List[UsageEntry]


@router.get("", response_model=UsageResponse)
def list_usage(
    start: Optional[str] = Query(default=None, description="ISO timestamp start"),
    end: Optional[str] = Query(default=None, description="ISO timestamp end"),
    user: AuthContext = Depends(get_current_user),
):
    rows = supabase_client.fetch_usage(user.user_id, start=start, end=end)
    logger.info(
        "usage.list",
        extra={"user_id": user.user_id, "count": len(rows), "start": start, "end": end},
    )
    return UsageResponse(items=rows)

