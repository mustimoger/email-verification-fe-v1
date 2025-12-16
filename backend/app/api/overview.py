import logging
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..core.auth import AuthContext, get_current_user
from ..services import supabase_client
from ..services.tasks_store import fetch_task_summary
from ..services.usage import record_usage

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


class OverviewResponse(BaseModel):
    profile: Dict[str, object]
    credits_remaining: int
    usage_total: int
    usage_series: List[UsagePoint]
    task_counts: Dict[str, int]
    recent_tasks: List[TaskItem]


def _aggregate_usage(items: List[Dict[str, object]]) -> (int, List[UsagePoint]):
    total = 0
    by_date: Dict[str, int] = defaultdict(int)
    for item in items:
        count = int(item.get("count", 0))
        total += count
        period_start = item.get("period_start")
        if period_start:
            try:
                date_key = datetime.fromisoformat(period_start.replace("Z", "+00:00")).date().isoformat()
            except Exception:
                date_key = str(period_start)
            by_date[date_key] += count
    series = [UsagePoint(date=date, count=by_date[date]) for date in sorted(by_date.keys())]
    return total, series


@router.get("", response_model=OverviewResponse)
def get_overview(user: AuthContext = Depends(get_current_user)):
    profile = supabase_client.fetch_profile(user.user_id) or {"user_id": user.user_id}
    credits = supabase_client.fetch_credits(user.user_id)
    usage_rows = supabase_client.fetch_usage(user.user_id)
    usage_total, usage_series = _aggregate_usage(usage_rows)

    task_summary = fetch_task_summary(user.user_id, limit=5)
    task_counts: Dict[str, int] = {row.get("status") or "unknown": int(row.get("count", 0)) for row in task_summary["counts"]}
    recent_tasks: List[TaskItem] = [TaskItem(**row) for row in task_summary["recent"]]

    record_usage(user.user_id, path="/overview", count=1)
    logger.info("overview.fetched", extra={"user_id": user.user_id, "usage_total": usage_total, "tasks": len(recent_tasks)})

    return OverviewResponse(
        profile=profile,
        credits_remaining=credits,
        usage_total=usage_total,
        usage_series=usage_series,
        task_counts=task_counts,
        recent_tasks=recent_tasks,
    )
