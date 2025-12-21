"""
Helpers to store Paddle purchase records for account history.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from postgrest.exceptions import APIError
from supabase import Client

from .supabase_client import get_supabase

logger = logging.getLogger(__name__)


def _table(sb: Client):
    return sb.table("billing_purchases")


def upsert_purchase(
    transaction_id: str,
    user_id: str,
    event_id: Optional[str],
    event_type: str,
    price_ids: list[str],
    credits_granted: int,
    amount: Optional[int],
    currency: Optional[str],
    checkout_email: Optional[str],
    invoice_id: Optional[str],
    invoice_number: Optional[str],
    purchased_at: Optional[str],
    raw: Dict[str, Any],
) -> bool:
    sb = get_supabase()
    payload = {
        "transaction_id": transaction_id,
        "user_id": user_id,
        "event_id": event_id,
        "event_type": event_type,
        "price_ids": price_ids,
        "credits_granted": credits_granted,
        "amount": amount,
        "currency": currency,
        "checkout_email": checkout_email,
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "purchased_at": purchased_at,
        "raw": raw,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        _table(sb).upsert(payload, on_conflict="transaction_id").execute()
        logger.info(
            "billing.purchase.upserted",
            extra={
                "transaction_id": transaction_id,
                "user_id": user_id,
                "event_id": event_id,
                "event_type": event_type,
                "credits_granted": credits_granted,
            },
        )
        return True
    except APIError as exc:
        logger.error(
            "billing.purchase.upsert_failed",
            extra={"transaction_id": transaction_id, "user_id": user_id, "error": exc.json()},
        )
        return False
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "billing.purchase.upsert_failed",
            extra={"transaction_id": transaction_id, "user_id": user_id, "error": str(exc)},
        )
        return False


def list_purchases(user_id: str, limit: Optional[int] = None, offset: Optional[int] = None) -> List[Dict[str, Any]]:
    sb = get_supabase()
    query = _table(sb).select("*").eq("user_id", user_id).order("purchased_at", desc=True).order("created_at", desc=True)
    if limit is not None:
        start = offset or 0
        end = start + limit - 1
        res = query.range(start, end).execute()
    else:
        res = query.execute()
    return res.data or []
