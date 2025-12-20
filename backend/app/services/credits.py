"""
Credit management helpers for billing events.
"""

import logging
from typing import Dict

from . import supabase_client

logger = logging.getLogger(__name__)


def grant_credits(user_id: str, credits: int) -> Dict:
    if credits <= 0:
        logger.info("credits.grant.skipped", extra={"user_id": user_id, "credits": credits})
        return {"user_id": user_id, "credits_remaining": supabase_client.fetch_credits(user_id)}
    try:
        updated = supabase_client.increment_credits(user_id, credits)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "credits.grant.failed",
            extra={"user_id": user_id, "granted": credits, "error": str(exc)},
        )
        raise
    logger.info(
        "credits.grant.applied",
        extra={"user_id": user_id, "granted": credits, "new_balance": updated.get("credits_remaining")},
    )
    return updated
