import logging
from datetime import datetime
from typing import Dict, List, Optional

from .supabase_client import get_supabase

logger = logging.getLogger(__name__)


def _parse_datetime(value: str) -> Optional[datetime]:
    raw = value.strip()
    if raw.endswith("Z"):
        raw = f"{raw[:-1]}+00:00"
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def normalize_range_value(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    raw = value.strip()
    if raw == "":
        return None
    parsed = _parse_datetime(raw)
    if not parsed:
        raise ValueError("Invalid timestamp format; expected RFC3339")
    return parsed.isoformat()


def _coerce_int(value: object) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _count_from_row(row: Dict[str, object]) -> Optional[int]:
    email_count = _coerce_int(row.get("email_count"))
    if email_count is not None:
        return email_count
    valid = _coerce_int(row.get("valid_count"))
    invalid = _coerce_int(row.get("invalid_count"))
    catchall = _coerce_int(row.get("catchall_count"))
    if valid is None or invalid is None or catchall is None:
        return None
    return valid + invalid + catchall


def summarize_usage_rows(rows: List[Dict[str, object]]) -> Dict[str, object]:
    totals: Dict[str, int] = {}
    total = 0
    for row in rows:
        created_at = row.get("created_at")
        if not isinstance(created_at, str):
            logger.debug("usage.summary.missing_created_at", extra={"row": row})
            continue
        dt = _parse_datetime(created_at)
        if not dt:
            logger.warning("usage.summary.invalid_created_at", extra={"created_at": created_at})
            continue
        count = _count_from_row(row)
        if count is None:
            logger.warning("usage.summary.missing_counts", extra={"task_id": row.get("task_id")})
            continue
        date_key = dt.date().isoformat()
        totals[date_key] = totals.get(date_key, 0) + count
        total += count
    series = [{"date": key, "count": totals[key]} for key in sorted(totals.keys())]
    return {"total": total, "series": series}


def summarize_tasks_usage(
    user_id: str,
    api_key_id: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    page_size: int = 1000,
) -> Dict[str, object]:
    sb = get_supabase()
    offset = 0
    rows: List[Dict[str, object]] = []
    while True:
        query = (
            sb.table("tasks")
            .select("task_id,created_at,email_count,valid_count,invalid_count,catchall_count", count="exact")
            .eq("user_id", user_id)
        )
        if api_key_id:
            query = query.eq("api_key_id", api_key_id)
        if start:
            query = query.gte("created_at", start)
        if end:
            query = query.lte("created_at", end)
        res = query.order("created_at", desc=False).range(offset, offset + page_size - 1).execute()
        data = res.data or []
        rows.extend(data)
        logger.debug(
            "usage.summary.page",
            extra={"user_id": user_id, "offset": offset, "returned": len(data), "api_key_id": api_key_id},
        )
        if len(data) < page_size:
            break
        offset += page_size
    summary = summarize_usage_rows(rows)
    return summary
