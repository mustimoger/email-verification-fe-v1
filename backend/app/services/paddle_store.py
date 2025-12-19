"""
Storage helpers for Paddle customer/address mapping per user.
"""

import logging
from typing import Optional, Tuple

from .supabase_client import get_supabase

logger = logging.getLogger(__name__)


def get_paddle_ids(user_id: str) -> Optional[Tuple[str, Optional[str]]]:
    sb = get_supabase()
    try:
        res = sb.table("paddle_customers").select("paddle_customer_id,paddle_address_id").eq("user_id", user_id).limit(1).execute()
        data = res.data or []
        if not data:
            return None
        row = data[0]
        return row["paddle_customer_id"], row.get("paddle_address_id")
    except Exception as exc:  # noqa: BLE001
        logger.error("paddle_store.fetch_failed", extra={"user_id": user_id, "error": str(exc)})
        return None


def upsert_paddle_ids(user_id: str, customer_id: str, address_id: Optional[str]) -> None:
    sb = get_supabase()
    try:
        sb.table("paddle_customers").upsert(
            {
                "user_id": user_id,
                "paddle_customer_id": customer_id,
                "paddle_address_id": address_id,
            },
            on_conflict="user_id",
        ).execute()
        logger.info(
            "paddle_store.saved",
            extra={"user_id": user_id, "customer_id": customer_id, "address_id": address_id},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "paddle_store.save_failed",
            extra={"user_id": user_id, "customer_id": customer_id, "address_id": address_id, "error": str(exc)},
        )
