import logging
from typing import Dict, List, Optional

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from ..core.auth import AuthContext, get_current_user
from ..clients.external import ExternalAPIClient, ExternalAPIError, APIUsageMetricsResponse, APIUsageMetricsSeriesPoint
from .api_keys import get_user_external_client
from ..services.date_range import normalize_range_value
from ..services.verification_metrics import usage_series_from_metrics

router = APIRouter(prefix="/api/usage", tags=["usage"])
logger = logging.getLogger(__name__)


class UsageSummaryPoint(BaseModel):
    date: str
    count: int


class UsageSummaryResponse(BaseModel):
    source: str
    total: Optional[int] = None
    series: List[UsageSummaryPoint]
    api_key_id: Optional[str] = None


class UsagePurposeResponse(BaseModel):
    api_keys_by_purpose: Optional[Dict[str, int]] = None
    last_used_at: Optional[str] = None
    requests_by_purpose: Optional[Dict[str, int]] = None
    series: Optional[List[APIUsageMetricsSeriesPoint]] = None
    total_api_keys: Optional[int] = None
    total_requests: Optional[int] = None
    user_id: Optional[str] = None


@router.get("/summary", response_model=UsageSummaryResponse)
async def get_usage_summary(
    start: Optional[str] = Query(default=None, description="ISO timestamp start"),
    end: Optional[str] = Query(default=None, description="ISO timestamp end"),
    api_key_id: Optional[str] = Query(default=None, description="Filter by api_key_id"),
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
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start must be before end")

    if api_key_id:
        logger.info(
            "usage.summary.api_key_unavailable",
            extra={"user_id": user.user_id, "api_key_id": api_key_id, "from": start_value, "to": end_value},
        )
        return UsageSummaryResponse(source="unavailable", total=None, series=[], api_key_id=api_key_id)

    try:
        metrics = await client.get_verification_metrics(start=start_value, end=end_value)
        series_points = usage_series_from_metrics(metrics)
        series = [UsageSummaryPoint(date=point["date"], count=point["count"]) for point in series_points]
        total = metrics.total_verifications if metrics else None
        logger.info(
            "usage.summary",
            extra={"user_id": user.user_id, "total": total, "series": len(series), "from": start_value, "to": end_value},
        )
        if total is None:
            logger.warning("usage.summary.total_unavailable", extra={"user_id": user.user_id})
        if not series:
            logger.info("usage.summary.series_unavailable", extra={"user_id": user.user_id})
        return UsageSummaryResponse(source="external", total=total, series=series, api_key_id=api_key_id)
    except ExternalAPIError as exc:
        logger.warning(
            "usage.summary.external_failed",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )
        return UsageSummaryResponse(source="unavailable", total=None, series=[], api_key_id=api_key_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("usage.summary.external_error", extra={"user_id": user.user_id, "error": str(exc)})
        return UsageSummaryResponse(source="unavailable", total=None, series=[], api_key_id=api_key_id)


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
