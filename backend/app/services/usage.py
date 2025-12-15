import logging
from datetime import datetime, timezone
from typing import Optional

from .supabase_client import get_supabase

logger = logging.getLogger(__name__)


def record_usage(
    user_id: str,
    path: str,
    count: int = 1,
    api_key_id: Optional[str] = None,
    period_start: Optional[datetime] = None,
    period_end: Optional[datetime] = None,
) -> None:
    sb = get_supabase()
    payload = {
        "user_id": user_id,
        "path": path,
        "count": count,
        "api_key_id": api_key_id,
        "period_start": (period_start or datetime.now(timezone.utc)).isoformat(),
        "period_end": (period_end or datetime.now(timezone.utc)).isoformat(),
    }
    try:
        sb.table("api_usage").insert(payload).execute()
        logger.info("usage.recorded", extra={"user_id": user_id, "path": path, "count": count})
    except Exception as exc:
        logger.error("usage.record_failed", extra={"error": str(exc), "payload": payload})
