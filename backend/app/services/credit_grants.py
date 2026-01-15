"""
Helpers to store append-only credit grants for purchases and signup bonuses.
"""

import logging
from typing import Any, Dict, List, Optional

from postgrest.exceptions import APIError
from supabase import Client

from .supabase_client import get_supabase

logger = logging.getLogger(__name__)


def _table(sb: Client):
    return sb.table("credit_grants")


def upsert_credit_grant(
    *,
    user_id: str,
    source: str,
    source_id: str,
    credits_granted: int,
    event_id: Optional[str] = None,
    event_type: Optional[str] = None,
    transaction_id: Optional[str] = None,
    price_ids: Optional[list[str]] = None,
    amount: Optional[int] = None,
    currency: Optional[str] = None,
    checkout_email: Optional[str] = None,
    invoice_id: Optional[str] = None,
    invoice_number: Optional[str] = None,
    purchased_at: Optional[str] = None,
    raw: Optional[Dict[str, Any]] = None,
) -> bool:
    sb = get_supabase()
    payload = {
        "user_id": user_id,
        "source": source,
        "source_id": source_id,
        "credits_granted": credits_granted,
        "event_id": event_id,
        "event_type": event_type,
        "transaction_id": transaction_id,
        "price_ids": price_ids or [],
        "amount": amount,
        "currency": currency,
        "checkout_email": checkout_email,
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "purchased_at": purchased_at,
        "raw": raw or {},
    }
    try:
        _table(sb).upsert(payload, on_conflict="user_id,source,source_id").execute()
        logger.info(
            "credits.grant.upserted",
            extra={
                "user_id": user_id,
                "source": source,
                "source_id": source_id,
                "credits_granted": credits_granted,
            },
        )
        return True
    except APIError as exc:
        logger.error(
            "credits.grant.upsert_failed",
            extra={"user_id": user_id, "source": source, "source_id": source_id, "error": exc.json()},
        )
        return False
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "credits.grant.upsert_failed",
            extra={"user_id": user_id, "source": source, "source_id": source_id, "error": str(exc)},
        )
        return False


def list_credit_grants(
    *,
    user_id: str,
    source: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
) -> List[Dict[str, Any]]:
    sb = get_supabase()
    query = _table(sb).select("*").eq("user_id", user_id)
    if source:
        query = query.eq("source", source)
    query = query.order("purchased_at", desc=True).order("created_at", desc=True)
    if limit is not None:
        start = offset or 0
        end = start + limit - 1
        res = query.range(start, end).execute()
    else:
        res = query.execute()
    return res.data or []
