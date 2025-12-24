import logging
from typing import Dict, Iterable, List, Optional

from supabase import Client

from ..clients.external import Task, TaskDetailResponse, TaskMetrics
from .supabase_client import get_supabase
from .api_keys import list_cached_key_integrations
from .task_files_store import fetch_task_files

logger = logging.getLogger(__name__)


def _task_payload(
    user_id: str,
    task_id: str,
    status: Optional[str],
    email_count: Optional[int],
    counts: Optional[Dict[str, Optional[int]]] = None,
    job_status: Optional[Dict[str, int]] = None,
    integration: Optional[str] = None,
    api_key_id: Optional[str] = None,
) -> Dict[str, object]:
    payload: Dict[str, object] = {"task_id": task_id, "user_id": user_id}
    if status is not None:
        payload["status"] = status
    if email_count is not None:
        payload["email_count"] = email_count
    if integration:
        payload["integration"] = integration
    if api_key_id:
        payload["api_key_id"] = api_key_id
    if counts:
        if counts.get("valid") is not None:
            payload["valid_count"] = counts["valid"]
        if counts.get("invalid") is not None:
            payload["invalid_count"] = counts["invalid"]
        if counts.get("catchall") is not None:
            payload["catchall_count"] = counts["catchall"]
    if job_status:
        payload["job_status"] = job_status
    return payload


def _coerce_int(value: object) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        logger.warning("tasks.metrics.invalid_count_value", extra={"value": value})
        return None


def counts_from_metrics(metrics: Optional[TaskMetrics | Dict[str, object]]) -> Optional[Dict[str, int]]:
    if not metrics:
        return None
    if isinstance(metrics, dict):
        status_counts = metrics.get("verification_status")
    else:
        status_counts = metrics.verification_status
    if not isinstance(status_counts, dict) or not status_counts:
        return None

    valid = _coerce_int(status_counts.get("exists")) or 0
    catchall = _coerce_int(status_counts.get("catchall")) or 0
    invalid = 0
    unknown_statuses: List[str] = []
    for key, raw in status_counts.items():
        if key in ("exists", "catchall"):
            continue
        count = _coerce_int(raw)
        if count is None:
            continue
        invalid += count
        if key not in ("not_exists", "invalid_syntax", "unknown"):
            unknown_statuses.append(key)

    if unknown_statuses:
        logger.warning("tasks.metrics.unknown_statuses", extra={"statuses": unknown_statuses})

    return {"valid": valid, "catchall": catchall, "invalid": invalid}


def job_status_from_metrics(metrics: Optional[TaskMetrics | Dict[str, object]]) -> Optional[Dict[str, int]]:
    if not metrics:
        return None
    status_counts = metrics.get("job_status") if isinstance(metrics, dict) else metrics.job_status
    if not isinstance(status_counts, dict) or not status_counts:
        return None
    normalized: Dict[str, int] = {}
    for key, raw in status_counts.items():
        count = _coerce_int(raw)
        if count is None:
            continue
        normalized[str(key)] = count
    return normalized or None


def email_count_from_metrics(metrics: Optional[TaskMetrics | Dict[str, object]]) -> Optional[int]:
    if not metrics:
        return None
    if isinstance(metrics, dict):
        raw_total = metrics.get("total_email_addresses")
    else:
        raw_total = metrics.total_email_addresses
    return _coerce_int(raw_total)


def upsert_tasks_from_list(
    user_id: str,
    tasks: Iterable[Task],
    integration: Optional[str] = None,
    api_key_id: Optional[str] = None,
) -> None:
    sb: Client = get_supabase()
    rows: List[Dict[str, object]] = []
    for task in tasks:
        if not task.id:
            continue
        counts = None
        valid_count = getattr(task, "valid_count", None)
        invalid_count = getattr(task, "invalid_count", None)
        catchall_count = getattr(task, "catchall_count", None)
        if valid_count is not None or invalid_count is not None or catchall_count is not None:
            counts = {
                "valid": valid_count,
                "invalid": invalid_count,
                "catchall": catchall_count,
            }
        else:
            metrics = getattr(task, "metrics", None)
            counts = counts_from_metrics(metrics)
        email_count = getattr(task, "email_count", None)
        if email_count is None:
            metrics = getattr(task, "metrics", None)
            email_count = email_count_from_metrics(metrics)
        job_status = job_status_from_metrics(getattr(task, "metrics", None))
        rows.append(
            _task_payload(
                user_id=user_id,
                task_id=task.id,
                status=getattr(task, "status", None),
                email_count=email_count,
                counts=counts,
                job_status=job_status,
                integration=integration,
                api_key_id=api_key_id,
            )
        )
    if not rows:
        return
    try:
        sb.table("tasks").upsert(rows, on_conflict="task_id").execute()
        logger.info("tasks.upsert_list", extra={"user_id": user_id, "count": len(rows)})
    except Exception as exc:  # noqa: BLE001
        logger.error("tasks.upsert_list_failed", extra={"user_id": user_id, "error": str(exc)})


def upsert_task_from_detail(
    user_id: str,
    detail: TaskDetailResponse,
    counts: Optional[Dict[str, int]] = None,
    integration: Optional[str] = None,
    api_key_id: Optional[str] = None,
) -> None:
    if not detail.id:
        return
    payload = _task_payload(
        user_id=user_id,
        task_id=detail.id,
        status=detail.finished_at and "completed" or detail.started_at and "processing" or detail.id and detail.id,
        email_count=len(detail.jobs or []) if detail.jobs is not None else None,
        counts=counts,
        job_status=job_status_from_metrics(getattr(detail, "metrics", None)),
        integration=integration,
        api_key_id=api_key_id,
    )
    sb: Client = get_supabase()
    try:
        sb.table("tasks").upsert(payload, on_conflict="task_id").execute()
        logger.info("tasks.upsert_detail", extra={"user_id": user_id, "task_id": detail.id})
    except Exception as exc:  # noqa: BLE001
        logger.error("tasks.upsert_detail_failed", extra={"user_id": user_id, "task_id": detail.id, "error": str(exc)})


def fetch_task_summary(user_id: str, limit: int = 5) -> Dict[str, object]:
    sb: Client = get_supabase()
    try:
        counts_res = sb.table("tasks").select("status, count:count(*)").eq("user_id", user_id).group("status").execute()
        counts = counts_res.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error("tasks.summary_counts_failed", extra={"user_id": user_id, "error": str(exc)})
        counts = []
    try:
        recent_res = (
            sb.table("tasks")
            .select("task_id,status,email_count,valid_count,invalid_count,catchall_count,job_status,integration,created_at,api_key_id")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        recent = recent_res.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error("tasks.summary_recent_failed", extra={"user_id": user_id, "error": str(exc)})
        recent = []
    if recent:
        key_integrations = list_cached_key_integrations(user_id)
        for row in recent:
            if row.get("integration"):
                row.pop("api_key_id", None)
                continue
            api_key_id = row.get("api_key_id")
            if not api_key_id:
                logger.warning(
                    "tasks.summary_missing_integration",
                    extra={"user_id": user_id, "task_id": row.get("task_id")},
                )
                row.pop("api_key_id", None)
                continue
            integration = key_integrations.get(api_key_id)
            if integration:
                row["integration"] = integration
            else:
                logger.warning(
                    "tasks.summary_integration_unmapped",
                    extra={"user_id": user_id, "task_id": row.get("task_id"), "api_key_id": api_key_id},
                )
            row.pop("api_key_id", None)
    return {"counts": counts, "recent": recent}


def summarize_task_validation_totals(
    user_id: str,
    api_key_id: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    page_size: int = 1000,
) -> Optional[Dict[str, int]]:
    sb: Client = get_supabase()
    offset = 0
    totals = {"valid": 0, "invalid": 0, "catchall": 0}
    matched_rows = 0
    missing_rows = 0
    while True:
        query = sb.table("tasks").select("valid_count,invalid_count,catchall_count", count="exact").eq("user_id", user_id)
        if api_key_id:
            query = query.eq("api_key_id", api_key_id)
        if start:
            query = query.gte("created_at", start)
        if end:
            query = query.lte("created_at", end)
        res = query.order("created_at", desc=False).range(offset, offset + page_size - 1).execute()
        data = res.data or []
        for row in data:
            valid = _coerce_int(row.get("valid_count"))
            invalid = _coerce_int(row.get("invalid_count"))
            catchall = _coerce_int(row.get("catchall_count"))
            if valid is None and invalid is None and catchall is None:
                missing_rows += 1
                continue
            matched_rows += 1
            totals["valid"] += valid or 0
            totals["invalid"] += invalid or 0
            totals["catchall"] += catchall or 0
        logger.debug(
            "tasks.validation_totals.page",
            extra={"user_id": user_id, "offset": offset, "returned": len(data), "api_key_id": api_key_id},
        )
        if len(data) < page_size:
            break
        offset += page_size
    if missing_rows:
        logger.warning(
            "tasks.validation_totals.missing_counts",
            extra={"user_id": user_id, "missing_rows": missing_rows},
        )
    if matched_rows == 0:
        return None
    return totals


def update_task_reservation(
    user_id: str,
    task_id: str,
    reserved_count: int,
    reservation_id: str,
) -> None:
    sb: Client = get_supabase()
    payload = {
        "credit_reserved_count": reserved_count,
        "credit_reservation_id": reservation_id,
    }
    try:
        sb.table("tasks").update(payload).eq("user_id", user_id).eq("task_id", task_id).execute()
        logger.info(
            "tasks.reservation_updated",
            extra={"user_id": user_id, "task_id": task_id, "reserved_count": reserved_count},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "tasks.reservation_update_failed",
            extra={"user_id": user_id, "task_id": task_id, "error": str(exc)},
        )


def fetch_task_credit_reservation(user_id: str, task_id: str) -> Optional[Dict[str, object]]:
    sb: Client = get_supabase()
    try:
        res = (
            sb.table("tasks")
            .select("credit_reserved_count,credit_reservation_id")
            .eq("user_id", user_id)
            .eq("task_id", task_id)
            .limit(1)
            .execute()
        )
        data = res.data or []
        return data[0] if data else None
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "tasks.reservation_fetch_failed",
            extra={"user_id": user_id, "task_id": task_id, "error": str(exc)},
        )
        return None


def fetch_tasks_with_counts(
    user_id: str,
    limit: int = 10,
    offset: int = 0,
    api_key_id: Optional[str] = None,
) -> Dict[str, object]:
    """
    Fetch tasks from Supabase with stored counts/status for history fallback.
    Returns dict with tasks list and optional total count when available.
    """
    sb: Client = get_supabase()
    end = offset + limit - 1
    try:
        query = sb.table("tasks").select("*", count="exact").eq("user_id", user_id)
        if api_key_id:
            query = query.eq("api_key_id", api_key_id)
        res = query.order("created_at", desc=True).range(offset, end if end >= offset else offset).execute()
        data = res.data or []
        task_ids = [row.get("task_id") for row in data if row.get("task_id")]
        file_names = fetch_task_files(user_id, task_ids) if task_ids else {}
        for row in data:
            task_id = row.get("task_id")
            if task_id and task_id in file_names:
                row["file_name"] = file_names[task_id]
        total = res.count if hasattr(res, "count") else None
        return {"tasks": data, "count": total}
    except Exception as exc:  # noqa: BLE001
        logger.error("tasks.fetch_with_counts_failed", extra={"user_id": user_id, "error": str(exc)})
        return {"tasks": [], "count": None}


def fetch_latest_file_task(user_id: str, limit: int) -> Optional[Dict[str, object]]:
    if limit <= 0:
        logger.warning("tasks.latest_file_upload.invalid_limit", extra={"user_id": user_id, "limit": limit})
        return None
    result = fetch_tasks_with_counts(user_id, limit=limit, offset=0)
    tasks = result.get("tasks") or []
    for row in tasks:
        if row.get("file_name"):
            return row
    logger.info("tasks.latest_file_upload.not_found", extra={"user_id": user_id, "searched": len(tasks)})
    return None
