import logging
from typing import Dict, Iterable, List, Optional

from supabase import Client

from ..clients.external import Task, TaskDetailResponse
from .supabase_client import get_supabase

logger = logging.getLogger(__name__)


def _task_payload(
    user_id: str,
    task_id: str,
    status: Optional[str],
    email_count: Optional[int],
    counts: Optional[Dict[str, Optional[int]]] = None,
    integration: Optional[str] = None,
) -> Dict[str, object]:
    payload: Dict[str, object] = {"task_id": task_id, "user_id": user_id}
    if status is not None:
        payload["status"] = status
    if email_count is not None:
        payload["email_count"] = email_count
    if integration:
        payload["integration"] = integration
    if counts:
        if counts.get("valid") is not None:
            payload["valid_count"] = counts["valid"]
        if counts.get("invalid") is not None:
            payload["invalid_count"] = counts["invalid"]
        if counts.get("catchall") is not None:
            payload["catchall_count"] = counts["catchall"]
    return payload


def upsert_tasks_from_list(user_id: str, tasks: Iterable[Task], integration: Optional[str] = None) -> None:
    sb: Client = get_supabase()
    rows: List[Dict[str, object]] = []
    for task in tasks:
        if not task.id:
            continue
        rows.append(
            _task_payload(
                user_id=user_id,
                task_id=task.id,
                status=task.status if hasattr(task, "status") else None,
                email_count=task.email_count,
                integration=integration,
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
    user_id: str, detail: TaskDetailResponse, counts: Optional[Dict[str, int]] = None, integration: Optional[str] = None
) -> None:
    if not detail.id:
        return
    payload = _task_payload(
        user_id=user_id,
        task_id=detail.id,
        status=detail.finished_at and "completed" or detail.started_at and "processing" or detail.id and detail.id,
        email_count=len(detail.jobs or []) if detail.jobs is not None else None,
        counts=counts,
        integration=integration,
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
            .select("task_id,status,email_count,valid_count,invalid_count,catchall_count,integration,created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        recent = recent_res.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error("tasks.summary_recent_failed", extra={"user_id": user_id, "error": str(exc)})
        recent = []
    return {"counts": counts, "recent": recent}
