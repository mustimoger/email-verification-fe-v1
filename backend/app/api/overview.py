import asyncio
import logging
import time
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..clients.external import ExternalAPIClient, ExternalAPIError, Task, VerificationMetricsResponse
from ..core.auth import AuthContext, get_current_user
from ..core.settings import get_settings
from ..services.billing_plans import get_billing_plans_by_price_ids
from ..services.billing_purchases import list_purchases as list_billing_purchases
from ..services import supabase_client
from ..services.task_metrics import counts_from_metrics, email_count_from_metrics
from ..services.verification_metrics import coerce_int, usage_series_from_metrics
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
    job_status: Optional[Dict[str, int]] = None
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
    credits_remaining: Optional[int] = None
    usage_total: Optional[int] = None
    usage_series: List[UsagePoint]
    task_counts: Dict[str, int]
    recent_tasks: List[TaskItem]
    verification_totals: Optional[VerificationTotals] = None
    current_plan: Optional[CurrentPlan] = None


def _build_usage_series(metrics: Optional[VerificationMetricsResponse]) -> List[UsagePoint]:
    points: List[UsagePoint] = []
    for point in usage_series_from_metrics(metrics):
        points.append(UsagePoint(date=point["date"], count=point["count"]))
    return points


def _normalize_job_status(job_status: Optional[Dict[str, object]]) -> Optional[Dict[str, int]]:
    if not isinstance(job_status, dict):
        return None
    normalized: Dict[str, int] = {}
    for key, raw in job_status.items():
        count = coerce_int(raw)
        if count is None:
            continue
        normalized[str(key).lower()] = count
    return normalized or None


def _derive_task_status(raw_status: Optional[str], job_status: Optional[Dict[str, int]]) -> Optional[str]:
    if job_status:
        pending = job_status.get("pending", 0)
        processing = job_status.get("processing", 0)
        completed = job_status.get("completed", 0)
        failed = job_status.get("failed", 0)
        if pending + processing > 0:
            return "processing"
        if completed > 0:
            return "completed"
        if failed > 0:
            return "failed"
    if isinstance(raw_status, str) and raw_status.strip():
        return raw_status.strip()
    return None


def _build_task_item(task: Task) -> Optional[TaskItem]:
    if not task.id:
        return None
    metrics = task.metrics
    counts = counts_from_metrics(metrics)
    valid = coerce_int(task.valid_count)
    invalid = coerce_int(task.invalid_count)
    catchall = coerce_int(task.catchall_count)
    if counts:
        if valid is None:
            valid = counts.get("valid")
        if invalid is None:
            invalid = counts.get("invalid")
        if catchall is None:
            catchall = counts.get("catchall")
    job_status = _normalize_job_status(task.job_status) or _normalize_job_status(
        metrics.job_status if metrics else None
    )
    status = _derive_task_status(task.status, job_status)
    email_count = coerce_int(task.email_count)
    if email_count is None:
        email_count = email_count_from_metrics(metrics)
    if email_count is None and counts:
        total = sum(counts.values())
        if total > 0:
            email_count = total
    return TaskItem(
        task_id=task.id,
        status=status,
        email_count=email_count,
        valid_count=valid,
        invalid_count=invalid,
        catchall_count=catchall,
        job_status=job_status,
        integration=task.integration,
        created_at=task.created_at,
    )


def _build_task_counts(tasks: List[TaskItem]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for task in tasks:
        key = (task.status or "unknown").lower()
        counts[key] = counts.get(key, 0) + 1
    return counts


def _build_verification_totals(metrics: VerificationMetricsResponse) -> Optional[VerificationTotals]:
    if not metrics:
        return None
    status_counts = metrics.verification_status
    counts = counts_from_metrics({"verification_status": status_counts}) if status_counts else None
    total = metrics.total_verifications
    valid = counts["valid"] if counts else None
    invalid = counts["invalid"] if counts else None
    catchall = counts["catchall"] if counts else None
    if metrics.total_catchall is not None and (catchall is None or (catchall == 0 and metrics.total_catchall > 0)):
        catchall = metrics.total_catchall
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
    timings: Dict[str, float] = {}
    started_at = time.monotonic()

    step = time.monotonic()
    try:
        profile = supabase_client.fetch_profile(user.user_id) or {"user_id": user.user_id}
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "overview.supabase_fetch_failed",
            extra={"user_id": user.user_id, "operation": "fetch_profile", "error": str(exc)},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase temporarily unavailable",
        ) from exc
    timings["profile_ms"] = round((time.monotonic() - step) * 1000, 2)

    step = time.monotonic()
    credits = None
    logger.info("overview.credits.unavailable", extra={"user_id": user.user_id})
    timings["credits_ms"] = round((time.monotonic() - step) * 1000, 2)

    usage_total: Optional[int] = None
    usage_series: List[UsagePoint] = []
    verification_totals = None
    metrics_source = "external"
    step = time.monotonic()
    try:
        settings = get_settings()
        timeout_seconds = settings.overview_metrics_timeout_seconds
        metrics = await asyncio.wait_for(client.get_verification_metrics(), timeout=timeout_seconds)
        verification_totals = _build_verification_totals(metrics)
        usage_series = _build_usage_series(metrics)
        usage_total = verification_totals.total if verification_totals else None
        if usage_total is None:
            logger.warning("overview.usage_total_unavailable", extra={"user_id": user.user_id})
        if not usage_series:
            logger.info("overview.usage_series_unavailable", extra={"user_id": user.user_id})
    except asyncio.TimeoutError:
        metrics_source = "unavailable"
        logger.warning(
            "overview.verification_metrics_timeout",
            extra={"user_id": user.user_id, "timeout_seconds": get_settings().overview_metrics_timeout_seconds},
        )
    except ExternalAPIError as exc:
        metrics_source = "unavailable"
        logger.warning(
            "overview.verification_metrics_failed",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )
    except Exception as exc:  # noqa: BLE001
        metrics_source = "unavailable"
        logger.error("overview.verification_metrics_error", extra={"user_id": user.user_id, "error": str(exc)})
    finally:
        timings["verification_metrics_ms"] = round((time.monotonic() - step) * 1000, 2)

    step = time.monotonic()
    recent_tasks: List[TaskItem] = []
    task_counts: Dict[str, int] = {}
    try:
        list_result = await client.list_tasks(limit=5, offset=0)
        tasks = list_result.tasks or []
        recent_tasks = [item for item in (_build_task_item(task) for task in tasks) if item is not None]
        task_counts = _build_task_counts(recent_tasks)
    except ExternalAPIError as exc:
        logger.warning(
            "overview.tasks_list_failed",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("overview.tasks_list_error", extra={"user_id": user.user_id, "error": str(exc)})
    finally:
        timings["tasks_list_ms"] = round((time.monotonic() - step) * 1000, 2)

    step = time.monotonic()
    current_plan = _build_current_plan(user.user_id)
    timings["current_plan_ms"] = round((time.monotonic() - step) * 1000, 2)

    timings["total_ms"] = round((time.monotonic() - started_at) * 1000, 2)
    logger.info(
        "overview.fetched",
        extra={
            "user_id": user.user_id,
            "usage_total": usage_total,
            "tasks": len(recent_tasks),
            "metrics_source": metrics_source,
            "timings_ms": timings,
        },
    )

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
