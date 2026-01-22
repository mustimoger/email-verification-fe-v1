import logging
from typing import Any, Dict, Optional

from ..clients.external import CreditTransactionResponse, ExternalAPIClient, ExternalAPIError
from ..core.settings import get_settings
from ..core.supabase_jwt import build_supabase_jwt

logger = logging.getLogger(__name__)

ADMIN_ROLE = "admin"


def _compact_metadata(payload: Dict[str, Any]) -> Dict[str, Any]:
    cleaned: Dict[str, Any] = {}
    for key, value in payload.items():
        if value is None:
            continue
        if isinstance(value, (list, dict)) and not value:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        cleaned[key] = value
    return cleaned


def build_purchase_grant_metadata(
    *,
    source: str,
    source_id: str,
    transaction_id: str,
    event_id: Optional[str],
    event_type: Optional[str],
    price_ids: Optional[list[str]],
    amount: Optional[int],
    currency: Optional[str],
    checkout_email: Optional[str],
    invoice_id: Optional[str],
    invoice_number: Optional[str],
    purchased_at: Optional[str],
    credits_granted: int,
) -> Dict[str, Any]:
    return _compact_metadata(
        {
            "source": source,
            "source_id": source_id,
            "transaction_id": transaction_id,
            "event_id": event_id,
            "event_type": event_type,
            "price_ids": price_ids,
            "amount": amount,
            "currency": currency,
            "checkout_email": checkout_email,
            "invoice_id": invoice_id,
            "invoice_number": invoice_number,
            "purchased_at": purchased_at,
            "credits_granted": credits_granted,
        }
    )


def build_bonus_grant_metadata(
    *,
    source: str,
    source_id: str,
    credits_granted: int,
    user_email: Optional[str],
    account_created_at: Optional[str],
    ip: Optional[str],
    user_agent: Optional[str],
) -> Dict[str, Any]:
    return _compact_metadata(
        {
            "source": source,
            "source_id": source_id,
            "credits_granted": credits_granted,
            "user_email": user_email,
            "account_created_at": account_created_at,
            "ip": ip,
            "user_agent": user_agent,
        }
    )


async def grant_external_credits(
    *,
    user_id: str,
    amount: int,
    reason: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> Optional[CreditTransactionResponse]:
    settings = get_settings()
    try:
        token = build_supabase_jwt(
            user_id=user_id,
            role=ADMIN_ROLE,
            ttl_seconds=settings.external_api_jwt_ttl_seconds,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "external_credits.token_failed",
            extra={"user_id": user_id, "error": str(exc)},
        )
        return None

    client = ExternalAPIClient(
        base_url=settings.email_api_base_url,
        bearer_token=token,
        max_upload_bytes=settings.upload_max_mb * 1024 * 1024,
    )
    payload = _compact_metadata(metadata or {})
    try:
        response = await client.grant_credits(
            amount=amount,
            reason=reason,
            metadata=payload if payload else None,
            user_id=user_id,
        )
        logger.info(
            "external_credits.grant_succeeded",
            extra={"user_id": user_id, "amount": amount, "reason": reason},
        )
        return response
    except ExternalAPIError as exc:
        logger.error(
            "external_credits.grant_failed",
            extra={
                "user_id": user_id,
                "amount": amount,
                "reason": reason,
                "status_code": exc.status_code,
                "details": exc.details,
            },
        )
        return None
