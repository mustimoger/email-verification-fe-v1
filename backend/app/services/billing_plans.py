"""
Helpers for reading Paddle plan catalog from Supabase.
"""

import logging
from typing import Any, Dict, List, Optional

from .supabase_client import get_supabase

logger = logging.getLogger(__name__)


def list_billing_plans(status: str = "active") -> List[Dict[str, Any]]:
    sb = get_supabase()
    try:
        res = (
            sb.table("billing_plans")
            .select("*")
            .eq("status", status)
            .order("amount", desc=False)
            .execute()
        )
        return res.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error("billing_plans.list_failed", extra={"status": status, "error": str(exc)})
        return []


def get_billing_plan_by_price_id(price_id: str, status: Optional[str] = "active") -> Optional[Dict[str, Any]]:
    sb = get_supabase()
    try:
        query = sb.table("billing_plans").select("*").eq("paddle_price_id", price_id).limit(1)
        if status:
            query = query.eq("status", status)
        res = query.execute()
        data = res.data or []
        return data[0] if data else None
    except Exception as exc:  # noqa: BLE001
        logger.error("billing_plans.get_failed", extra={"price_id": price_id, "status": status, "error": str(exc)})
        return None


def get_billing_plans_by_price_ids(price_ids: List[str]) -> List[Dict[str, Any]]:
    if not price_ids:
        return []
    sb = get_supabase()
    try:
        res = sb.table("billing_plans").select("*").in_("paddle_price_id", price_ids).execute()
        return res.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error("billing_plans.list_by_ids_failed", extra={"count": len(price_ids), "error": str(exc)})
        return []
