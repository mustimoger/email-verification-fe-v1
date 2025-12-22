"""
Credit management helpers for billing events.
"""

import logging
from typing import Dict, Optional

from . import supabase_client

logger = logging.getLogger(__name__)

CREDIT_SOURCE_TASK = "task"
CREDIT_SOURCE_TASK_RESERVE = "task_reserve"
CREDIT_SOURCE_TASK_FINALIZE = "task_finalize"
CREDIT_SOURCE_TASK_RELEASE = "task_release"
CREDIT_SOURCE_VERIFY = "verify"


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


def debit_credits(user_id: str, credits: int) -> Optional[Dict]:
    if credits <= 0:
        logger.warning("credits.debit.invalid_amount", extra={"user_id": user_id, "credits": credits})
        return None
    try:
        return supabase_client.debit_credits(user_id, credits)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "credits.debit.failed",
            extra={"user_id": user_id, "debit": credits, "error": str(exc)},
        )
        raise


def apply_credit_debit(
    user_id: str,
    credits: int,
    source: str,
    source_id: str,
    meta: Optional[Dict] = None,
) -> Dict:
    if credits <= 0:
        logger.warning(
            "credits.debit.invalid_amount",
            extra={"user_id": user_id, "credits": credits, "source": source, "source_id": source_id},
        )
        return {"status": "invalid", "credits_remaining": supabase_client.fetch_credits(user_id)}
    try:
        result = supabase_client.apply_credit_debit(
            user_id=user_id,
            amount=credits,
            source=source,
            source_id=source_id,
            meta=meta or {},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "credits.debit.apply_failed",
            extra={"user_id": user_id, "credits": credits, "source": source, "source_id": source_id, "error": str(exc)},
        )
        raise
    status = result.get("status")
    logger.info(
        "credits.debit.applied",
        extra={
            "user_id": user_id,
            "credits": credits,
            "source": source,
            "source_id": source_id,
            "status": status,
            "credits_remaining": result.get("credits_remaining"),
        },
    )
    return result


def apply_credit_release(
    user_id: str,
    credits: int,
    source: str,
    source_id: str,
    meta: Optional[Dict] = None,
) -> Dict:
    if credits <= 0:
        logger.warning(
            "credits.release.invalid_amount",
            extra={"user_id": user_id, "credits": credits, "source": source, "source_id": source_id},
        )
        return {"status": "invalid", "credits_remaining": supabase_client.fetch_credits(user_id)}
    try:
        result = supabase_client.apply_credit_release(
            user_id=user_id,
            amount=credits,
            source=source,
            source_id=source_id,
            meta=meta or {},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "credits.release.failed",
            extra={"user_id": user_id, "credits": credits, "source": source, "source_id": source_id, "error": str(exc)},
        )
        raise
    status = result.get("status")
    logger.info(
        "credits.release.applied",
        extra={
            "user_id": user_id,
            "credits": credits,
            "source": source,
            "source_id": source_id,
            "status": status,
            "credits_remaining": result.get("credits_remaining"),
        },
    )
    return result
