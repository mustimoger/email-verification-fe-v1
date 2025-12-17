"""
Helpers to record billing webhook events and enforce idempotency via Supabase.
"""

import logging
from typing import Any, Dict, Optional

from supabase import Client

from .supabase_client import get_supabase

logger = logging.getLogger(__name__)


def _table(sb: Client):
    return sb.table("billing_events")


def record_billing_event(
    event_id: str,
    user_id: str,
    event_type: str,
    transaction_id: Optional[str],
    price_ids: list[str],
    credits_granted: int,
    raw: Dict[str, Any],
) -> bool:
    """
    Upsert billing event to avoid duplicate credit grants.
    Returns True when inserted, False when already processed or on failure.
    """
    sb = get_supabase()
    try:
        existing = (
            _table(sb)
            .select("event_id")
            .eq("event_id", event_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            logger.info("billing.event.duplicate", extra={"event_id": event_id})
            return False
        payload = {
            "event_id": event_id,
            "user_id": user_id,
            "event_type": event_type,
            "transaction_id": transaction_id,
            "price_ids": price_ids,
            "credits_granted": credits_granted,
            "raw": raw,
        }
        _table(sb).upsert(payload, on_conflict="event_id").execute()
        logger.info(
            "billing.event.recorded",
            extra={
                "event_id": event_id,
                "user_id": user_id,
                "event_type": event_type,
                "transaction_id": transaction_id,
                "credits_granted": credits_granted,
            },
        )
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("billing.event.record_failed", extra={"event_id": event_id, "error": str(exc)})
        # Fail open: return False to avoid double grant until table exists
        return False
