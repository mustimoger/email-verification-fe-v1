import logging
from typing import Dict, Optional

from supabase import Client

from ..core.supabase import get_supabase

logger = logging.getLogger(__name__)


def update_task_reservation(
    user_id: str,
    task_id: str,
    reserved_count: int,
    reservation_id: str,
) -> None:
    sb: Client = get_supabase()
    payload = {
        "user_id": user_id,
        "task_id": task_id,
        "credit_reserved_count": reserved_count,
        "credit_reservation_id": reservation_id,
    }
    try:
        sb.table("task_credit_reservations").upsert(payload, on_conflict="user_id,task_id").execute()
        logger.info(
            "task_credit_reservations.updated",
            extra={"user_id": user_id, "task_id": task_id, "reserved_count": reserved_count},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "task_credit_reservations.update_failed",
            extra={"user_id": user_id, "task_id": task_id, "error": str(exc)},
        )


def fetch_task_credit_reservation(user_id: str, task_id: str) -> Optional[Dict[str, object]]:
    sb: Client = get_supabase()
    try:
        res = (
            sb.table("task_credit_reservations")
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
            "task_credit_reservations.fetch_failed",
            extra={"user_id": user_id, "task_id": task_id, "error": str(exc)},
        )
        return None
