import logging
from typing import Dict, List, Optional

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from ..core.auth import AuthContext, get_current_user
from ..clients.external import ExternalAPIClient, ExternalAPIError, APIUsageMetricsResponse
from .api_keys import get_user_external_client
from ..services import supabase_client
from ..services.usage import record_usage
from ..services.usage_summary import summarize_tasks_usage, normalize_range_value

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


class UsageSummaryPoint(BaseModel):
    date: str
    count: int


class UsageSummaryResponse(BaseModel):
    source: str
    total: int
    series: List[UsageSummaryPoint]
    api_key_id: Optional[str] = None


class UsagePurposeResponse(BaseModel):
    api_keys_by_purpose: Optional[Dict[str, int]] = None
    last_used_at: Optional[str] = None
    requests_by_purpose: Optional[Dict[str, int]] = None
    total_api_keys: Optional[int] = None
    total_requests: Optional[int] = None
    user_id: Optional[str] = None


@router.get("", response_model=UsageResponse)
def list_usage(
    start: Optional[str] = Query(default=None, description="ISO timestamp start"),
    end: Optional[str] = Query(default=None, description="ISO timestamp end"),
    api_key_id: Optional[str] = Query(default=None, description="Filter by api_key_id"),
    user: AuthContext = Depends(get_current_user),
):
    rows = supabase_client.fetch_usage(user.user_id, start=start, end=end, api_key_id=api_key_id)
    logger.info(
        "usage.list",
        extra={"user_id": user.user_id, "count": len(rows), "start": start, "end": end, "api_key_id": api_key_id},
    )
    record_usage(user.user_id, path="/usage", count=1, api_key_id=api_key_id)
    return UsageResponse(items=rows)


@router.get("/summary", response_model=UsageSummaryResponse)
def get_usage_summary(
    start: Optional[str] = Query(default=None, description="ISO timestamp start"),
    end: Optional[str] = Query(default=None, description="ISO timestamp end"),
    api_key_id: Optional[str] = Query(default=None, description="Filter by api_key_id"),
    user: AuthContext = Depends(get_current_user),
):
    try:
        start_value = normalize_range_value(start)
        end_value = normalize_range_value(end)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if start_value and end_value:
        start_dt = datetime.fromisoformat(start_value)
        end_dt = datetime.fromisoformat(end_value)
        if start_dt > end_dt:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start must be before end")

    summary = summarize_tasks_usage(user.user_id, api_key_id=api_key_id, start=start_value, end=end_value)
    logger.info(
        "usage.summary",
        extra={"user_id": user.user_id, "api_key_id": api_key_id, "total": summary["total"], "series": len(summary["series"])},
    )
    record_usage(user.user_id, path="/usage/summary", count=1, api_key_id=api_key_id)
    return UsageSummaryResponse(source="dashboard", total=summary["total"], series=summary["series"], api_key_id=api_key_id)


@router.get("/purpose", response_model=UsagePurposeResponse)
async def get_usage_by_purpose(
    start: Optional[str] = Query(default=None, alias="from", description="RFC3339 start timestamp"),
    end: Optional[str] = Query(default=None, alias="to", description="RFC3339 end timestamp"),
    user_id: Optional[str] = Query(default=None, description="Target user ID (admins only)"),
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    try:
        start_value = normalize_range_value(start)
        end_value = normalize_range_value(end)
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
                "usage.purpose.forbidden_user_id",
                extra={"user_id": user.user_id, "requested_user_id": user_id},
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
        target_user_id = user_id
        logger.info(
            "usage.purpose.admin_scope",
            extra={"admin_user_id": user.user_id, "target_user_id": target_user_id},
        )

    try:
        response: APIUsageMetricsResponse = await client.get_api_usage_metrics(
            user_id=target_user_id if user_id else None,
            start=start_value,
            end=end_value,
        )
        record_usage(target_user_id, path="/usage/purpose", count=1)
        logger.info(
            "usage.purpose",
            extra={
                "user_id": target_user_id,
                "from": start_value,
                "to": end_value,
                "total_requests": response.total_requests,
                "total_api_keys": response.total_api_keys,
            },
        )
        return UsagePurposeResponse(**response.model_dump())
    except ExternalAPIError as exc:
        level = logger.warning if exc.status_code in (401, 403) else logger.error
        level(
            "usage.purpose.external_failed",
            extra={"user_id": target_user_id, "status_code": exc.status_code, "details": exc.details},
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or "External API error")
