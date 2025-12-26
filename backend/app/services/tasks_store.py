import logging
from typing import Dict, Iterable, List, Optional

from supabase import Client

from ..clients.external import Task, TaskDetailResponse, TaskMetrics
from .supabase_client import get_supabase
from .api_keys import list_cached_key_integrations
from .task_files_store import fetch_task_files

logger = logging.getLogger(__name__)

RUNNING_STATUSES = {"processing", "pending", "started", "queued", "running"}


def _task_payload(
    user_id: str,
    task_id: str,
    status: Optional[str],
    email_count: Optional[int],
    manual_emails: Optional[List[str]] = None,
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
    if manual_emails is not None:
        payload["manual_emails"] = manual_emails
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


def _normalize_manual_emails(raw: object) -> List[str]:
    if not isinstance(raw, list):
        return []
    cleaned: List[str] = []
    for item in raw:
        if not isinstance(item, str):
            continue
        trimmed = item.strip()
        if not trimmed:
            continue
        cleaned.append(trimmed)
    return cleaned


def _normalize_manual_results(raw: object) -> List[Dict[str, object]]:
    if not isinstance(raw, list):
        return []
    cleaned: List[Dict[str, object]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        email = item.get("email")
        if not isinstance(email, str) or not email.strip():
            continue
        cleaned.append(item)
    return cleaned


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


def normalize_status_from_job_status(
    status: Optional[str],
    job_status: Optional[Dict[str, int]],
) -> Optional[str]:
    if not job_status:
        return status
    normalized: Dict[str, int] = {}
    for key, raw in job_status.items():
        count = _coerce_int(raw)
        if count is None:
            continue
        normalized[str(key).lower()] = count
    if not normalized:
        return status
    pending = normalized.get("pending", 0)
    processing = normalized.get("processing", 0)
    completed = normalized.get("completed", 0)
    failed = normalized.get("failed", 0)
    derived: Optional[str] = None
    if pending + processing > 0:
        derived = "processing"
    elif completed > 0:
        derived = "completed"
    elif failed > 0:
        derived = "failed"
    if not derived:
        return status
    current = (status or "").strip().lower()
    if not current or current in RUNNING_STATUSES:
        if current != derived:
            logger.info(
                "tasks.status.normalized",
                extra={"status": status, "derived": derived, "job_status": normalized},
            )
        return derived
    if current != derived:
        logger.debug(
            "tasks.status.unmodified",
            extra={"status": status, "derived": derived, "job_status": normalized},
        )
    return status


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
        status = normalize_status_from_job_status(getattr(task, "status", None), job_status)
        rows.append(
            _task_payload(
                user_id=user_id,
                task_id=task.id,
                status=status,
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
    manual_emails: Optional[List[str]] = None,
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
        manual_emails=manual_emails,
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


def update_task_manual_emails(
    user_id: str,
    task_id: str,
    manual_emails: List[str],
) -> None:
    if not manual_emails:
        return
    sb: Client = get_supabase()
    payload = {"manual_emails": manual_emails}
    try:
        sb.table("tasks").update(payload).eq("user_id", user_id).eq("task_id", task_id).execute()
        logger.info(
            "tasks.manual_emails_updated",
            extra={"user_id": user_id, "task_id": task_id, "email_count": len(manual_emails)},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "tasks.manual_emails_update_failed",
            extra={"user_id": user_id, "task_id": task_id, "error": str(exc)},
        )


def update_manual_task_results(
    user_id: str,
    task_id: str,
    result: Dict[str, object],
    manual_emails: Optional[List[str]] = None,
) -> None:
    if not task_id:
        return
    sb: Client = get_supabase()
    resolved_emails = _normalize_manual_emails(manual_emails)
    try:
        res = (
            sb.table("tasks")
            .select("manual_results,manual_emails")
            .eq("user_id", user_id)
            .eq("task_id", task_id)
            .limit(1)
            .execute()
        )
        data = res.data or []
        existing = data[0] if data else {}
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "tasks.manual_results_fetch_failed",
            extra={"user_id": user_id, "task_id": task_id, "error": str(exc)},
        )
        existing = {}

    existing_emails = _normalize_manual_emails(existing.get("manual_emails"))
    if not resolved_emails:
        resolved_emails = existing_emails
    existing_results = _normalize_manual_results(existing.get("manual_results"))
    result_email = result.get("email")
    if not isinstance(result_email, str) or not result_email.strip():
        logger.warning("tasks.manual_results_missing_email", extra={"user_id": user_id, "task_id": task_id})
        return
    normalized_key = result_email.strip().lower()
    results_map: Dict[str, Dict[str, object]] = {}
    for item in existing_results:
        email = item.get("email")
        if isinstance(email, str) and email.strip():
            results_map[email.strip().lower()] = item
    results_map[normalized_key] = result
    merged_results = list(results_map.values())

    total = len(resolved_emails) if resolved_emails else len(merged_results)
    valid = 0
    invalid = 0
    catchall = 0
    for item in merged_results:
        status = item.get("status")
        if status == "exists":
            valid += 1
        elif status == "catchall":
            catchall += 1
        elif status:
            invalid += 1
    pending = max(total - len(merged_results), 0)
    job_status: Optional[Dict[str, int]] = None
    status_value: Optional[str] = None
    if total > 0:
        job_status = {"completed": len(merged_results)}
        if pending:
            job_status["pending"] = pending
        status_value = "completed" if pending == 0 else "processing"

    payload = _task_payload(
        user_id=user_id,
        task_id=task_id,
        status=status_value,
        email_count=total if total > 0 else None,
        manual_emails=resolved_emails or None,
        counts={"valid": valid, "invalid": invalid, "catchall": catchall} if merged_results else None,
        job_status=job_status,
    )
    payload["manual_results"] = merged_results
    try:
        sb.table("tasks").upsert(payload, on_conflict="task_id").execute()
        logger.info(
            "tasks.manual_results_updated",
            extra={
                "user_id": user_id,
                "task_id": task_id,
                "email": result_email,
                "total": total,
                "completed": len(merged_results),
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "tasks.manual_results_update_failed",
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


def fetch_latest_manual_task(user_id: str, limit: int) -> Optional[Dict[str, object]]:
    if limit <= 0:
        logger.warning("tasks.latest_manual.invalid_limit", extra={"user_id": user_id, "limit": limit})
        return None
    result = fetch_tasks_with_counts(user_id, limit=limit, offset=0)
    tasks = result.get("tasks") or []
    for row in tasks:
        if not row.get("file_name"):
            return row
    logger.info("tasks.latest_manual.not_found", extra={"user_id": user_id, "searched": len(tasks)})
    return None


def fetch_latest_file_tasks(user_id: str, limit: int) -> List[Dict[str, object]]:
    if limit <= 0:
        logger.warning("tasks.latest_file_uploads.invalid_limit", extra={"user_id": user_id, "limit": limit})
        return []
    page_size = limit
    offset = 0
    results: List[Dict[str, object]] = []
    while len(results) < limit:
        page = fetch_tasks_with_counts(user_id, limit=page_size, offset=offset)
        tasks = page.get("tasks") or []
        if not tasks:
            break
        for row in tasks:
            if row.get("file_name"):
                results.append(row)
                if len(results) >= limit:
                    break
        if len(tasks) < page_size:
            break
        offset += page_size
    if not results:
        logger.info("tasks.latest_file_uploads.not_found", extra={"user_id": user_id})
    return results
