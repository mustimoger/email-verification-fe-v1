import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..clients.external import ExternalAPIClient, ExternalAPIError, VerificationMetricsResponse
from ..core.auth import AuthContext, get_current_user
from ..services.billing_plans import get_billing_plans_by_price_ids
from ..services.billing_purchases import list_purchases as list_billing_purchases
from ..services import supabase_client
from ..services.tasks_store import fetch_task_summary
from ..services.tasks_store import counts_from_metrics
from ..services.usage import record_usage
from ..services.usage_summary import summarize_tasks_usage
from .api_keys import get_user_external_client

router = APIRouter(prefix="/api/overview", tags=["overview"])
logger = logging.getLogger(__name__)


class UsagePoint(BaseModel):
    date: str
    count: int


class TaskItem(BaseModel):
    task_id: str
    status: Optional[str] = None
    email_count: Optional[int] = None
    valid_count: Optional[int] = None
    invalid_count: Optional[int] = None
    catchall_count: Optional[int] = None
    integration: Optional[str] = None
    created_at: Optional[str] = None


class VerificationTotals(BaseModel):
    total: Optional[int] = None
    valid: Optional[int] = None
    invalid: Optional[int] = None
    catchall: Optional[int] = None


class CurrentPlan(BaseModel):
    label: Optional[str] = None
    plan_names: List[str]
    price_ids: List[str]
    purchased_at: Optional[str] = None


class OverviewResponse(BaseModel):
    profile: Dict[str, object]
    credits_remaining: int
    usage_total: int
    usage_series: List[UsagePoint]
    task_counts: Dict[str, int]
    recent_tasks: List[TaskItem]
    verification_totals: Optional[VerificationTotals] = None
    current_plan: Optional[CurrentPlan] = None


def _build_usage_series(summary: Dict[str, object]) -> List[UsagePoint]:
    series = summary.get("series")
    if not isinstance(series, list):
        return []
    return [UsagePoint(**point) for point in series if isinstance(point, dict)]


def _build_verification_totals(metrics: VerificationMetricsResponse) -> Optional[VerificationTotals]:
    if not metrics:
        return None
    status_counts = metrics.verification_status
    counts = counts_from_metrics({"verification_status": status_counts}) if status_counts else None
    total = metrics.total_verifications
    valid = counts["valid"] if counts else None
    invalid = counts["invalid"] if counts else None
    catchall = counts["catchall"] if counts else None
    if total is None and counts:
        total = (valid or 0) + (invalid or 0) + (catchall or 0)
    if total is None and not counts:
        return None
    return VerificationTotals(total=total, valid=valid, invalid=invalid, catchall=catchall)


def _build_current_plan(user_id: str) -> Optional[CurrentPlan]:
    try:
        purchases = list_billing_purchases(user_id, limit=1, offset=0)
    except Exception as exc:  # noqa: BLE001
        logger.error("overview.current_plan.fetch_failed", extra={"user_id": user_id, "error": str(exc)})
        return None
    if not purchases:
        return None
    purchase = purchases[0]
    price_ids = purchase.get("price_ids") or []
    if not isinstance(price_ids, list):
        logger.warning("overview.current_plan.invalid_price_ids", extra={"user_id": user_id, "price_ids": price_ids})
        price_ids = []
    plan_rows = get_billing_plans_by_price_ids(price_ids) if price_ids else []
    plan_names_by_id = {
        row.get("paddle_price_id"): row.get("plan_name")
        for row in plan_rows
        if row.get("paddle_price_id") and row.get("plan_name")
    }
    plan_names = [plan_names_by_id[price_id] for price_id in price_ids if price_id in plan_names_by_id]
    missing = [price_id for price_id in price_ids if price_id not in plan_names_by_id]
    if missing:
        logger.warning("overview.current_plan.missing_price_ids", extra={"user_id": user_id, "price_ids": missing})
    label = None
    if len(price_ids) > 1:
        label = "Multiple items"
    elif len(price_ids) == 1 and plan_names:
        label = plan_names[0]
    purchased_at = purchase.get("purchased_at")
    if purchased_at is None:
        logger.warning("overview.current_plan.missing_purchased_at", extra={"user_id": user_id})
    return CurrentPlan(label=label, plan_names=plan_names, price_ids=price_ids, purchased_at=purchased_at)


@router.get("", response_model=OverviewResponse)
async def get_overview(
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    profile = supabase_client.fetch_profile(user.user_id) or {"user_id": user.user_id}
    credits = supabase_client.fetch_credits(user.user_id)
    usage_summary = summarize_tasks_usage(user.user_id)
    raw_total = usage_summary.get("total")
    if raw_total is None:
        logger.warning("overview.usage_summary_missing_total", extra={"user_id": user.user_id})
        usage_total = 0
    else:
        try:
            usage_total = int(raw_total)
        except (TypeError, ValueError):
            logger.warning(
                "overview.usage_summary_invalid_total",
                extra={"user_id": user.user_id, "total": raw_total},
            )
            usage_total = 0
    usage_series = _build_usage_series(usage_summary)

    task_summary = fetch_task_summary(user.user_id, limit=5)
    task_counts: Dict[str, int] = {row.get("status") or "unknown": int(row.get("count", 0)) for row in task_summary["counts"]}
    recent_tasks: List[TaskItem] = [TaskItem(**row) for row in task_summary["recent"]]

    verification_totals = None
    try:
        metrics = await client.get_verification_metrics()
        verification_totals = _build_verification_totals(metrics)
    except ExternalAPIError as exc:
        logger.warning(
            "overview.verification_metrics_failed",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("overview.verification_metrics_error", extra={"user_id": user.user_id, "error": str(exc)})

    current_plan = _build_current_plan(user.user_id)

    record_usage(user.user_id, path="/overview", count=1)
    logger.info("overview.fetched", extra={"user_id": user.user_id, "usage_total": usage_total, "tasks": len(recent_tasks)})

    return OverviewResponse(
        profile=profile,
        credits_remaining=credits,
        usage_total=usage_total,
        usage_series=usage_series,
        task_counts=task_counts,
        recent_tasks=recent_tasks,
        verification_totals=verification_totals,
        current_plan=current_plan,
    )
