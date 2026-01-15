import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from pydantic import BaseModel, EmailStr, Field

from ..core.auth import AuthContext, get_current_user
from ..services import supabase_client
from ..services.credit_grants import list_credit_grants
from ..core.settings import get_settings
from ..services.supabase_client import get_storage

router = APIRouter(prefix="/api/account", tags=["account"])
logger = logging.getLogger(__name__)


class ProfileResponse(BaseModel):
    user_id: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class CreditsResponse(BaseModel):
    credits_remaining: Optional[int] = None


class PurchaseResponse(BaseModel):
    transaction_id: str
    event_id: Optional[str] = None
    event_type: str
    price_ids: list[str] = Field(default_factory=list)
    credits_granted: int
    amount: Optional[int] = None
    currency: Optional[str] = None
    checkout_email: Optional[str] = None
    invoice_id: Optional[str] = None
    invoice_number: Optional[str] = None
    purchased_at: Optional[str] = None
    created_at: Optional[str] = None


class PurchaseListResponse(BaseModel):
    items: list[PurchaseResponse] = Field(default_factory=list)


def _coerce_int(value: object) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_price_ids(raw: object, *, user_id: str, transaction_id: str) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(item) for item in raw if item is not None and str(item).strip()]
    logger.warning(
        "account.purchases.invalid_price_ids",
        extra={"user_id": user_id, "transaction_id": transaction_id, "price_ids": raw},
    )
    return []


def _map_purchase_row(row: dict, *, user_id: str) -> Optional[PurchaseResponse]:
    transaction_id = row.get("transaction_id") or row.get("source_id")
    if not transaction_id:
        logger.warning("account.purchases.missing_transaction_id", extra={"user_id": user_id, "row_id": row.get("id")})
        return None
    event_type = row.get("event_type")
    if not event_type:
        logger.warning(
            "account.purchases.missing_event_type",
            extra={"user_id": user_id, "transaction_id": transaction_id},
        )
        return None
    credits_granted = _coerce_int(row.get("credits_granted"))
    if credits_granted is None:
        logger.warning(
            "account.purchases.missing_credits",
            extra={"user_id": user_id, "transaction_id": transaction_id},
        )
        return None
    amount = _coerce_int(row.get("amount"))
    return PurchaseResponse(
        transaction_id=str(transaction_id),
        event_id=row.get("event_id"),
        event_type=str(event_type),
        price_ids=_normalize_price_ids(row.get("price_ids"), user_id=user_id, transaction_id=str(transaction_id)),
        credits_granted=credits_granted,
        amount=amount,
        currency=row.get("currency"),
        checkout_email=row.get("checkout_email"),
        invoice_id=row.get("invoice_id"),
        invoice_number=row.get("invoice_number"),
        purchased_at=row.get("purchased_at"),
        created_at=row.get("created_at"),
    )


@router.get("/profile", response_model=ProfileResponse)
def get_profile(user: AuthContext = Depends(get_current_user)):
    try:
        profile = supabase_client.fetch_profile(user.user_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("account.profile.fetch_failed", extra={"user_id": user.user_id, "error": str(exc), "error_type": type(exc).__name__})
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Profile service unavailable") from exc
    if not profile:
        logger.info("account.profile.not_found", extra={"user_id": user.user_id})
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    logger.info("account.profile.fetched", extra={"user_id": user.user_id})
    return profile


@router.patch("/profile", response_model=ProfileResponse)
def update_profile(payload: ProfileUpdateRequest, user: AuthContext = Depends(get_current_user)):
    token_email = None
    if isinstance(user.claims, dict):
        token_email = user.claims.get("email")
    if payload.email is not None:
        if not token_email or payload.email != token_email:
            logger.warning(
                "account.profile.email_mismatch",
                extra={
                    "user_id": user.user_id,
                    "token_email": token_email,
                    "payload_email": payload.email,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email change must be confirmed before updating profile",
            )
    updated = supabase_client.upsert_profile(
        user.user_id, email=payload.email, display_name=payload.display_name, avatar_url=payload.avatar_url
    )
    logger.info("account.profile.updated", extra={"user_id": user.user_id})
    return updated


@router.post("/avatar", response_model=ProfileResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    user: AuthContext = Depends(get_current_user),
):
    settings = get_settings()
    filename = f"{user.user_id}_{file.filename}"
    storage = get_storage()
    bucket = storage.from_("avatars")
    # Ensure bucket exists and is public; skip if not available
    try:
        bucket.list()
    except Exception as exc:  # noqa: BLE001
        logger.error("account.avatar.bucket_error", extra={"error": str(exc)})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Avatar storage unavailable") from exc

    try:
        data = await file.read()
        file_options = {
            "content-type": file.content_type or "application/octet-stream",
            "upsert": "true",
        }
        bucket.upload(filename, data, file_options)
        public_url = bucket.get_public_url(filename)
    except Exception as exc:  # noqa: BLE001
        logger.error("account.avatar.upload_failed", extra={"error": str(exc), "error_type": type(exc).__name__})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Avatar upload failed") from exc

    avatar_url = public_url.get("publicUrl") if isinstance(public_url, dict) else public_url
    updated = supabase_client.upsert_profile(user.user_id, email=None, display_name=None, avatar_url=avatar_url)
    logger.info("account.avatar.updated", extra={"user_id": user.user_id, "avatar_url": avatar_url})
    return updated


@router.get("/credits", response_model=CreditsResponse)
def get_credits(user: AuthContext = Depends(get_current_user)):
    credits = None
    logger.info("account.credits.unavailable", extra={"user_id": user.user_id})
    return CreditsResponse(credits_remaining=credits)


@router.get("/purchases", response_model=PurchaseListResponse)
def get_purchases(
    limit: Optional[int] = Query(default=None, gt=0),
    offset: Optional[int] = Query(default=None, ge=0),
    user: AuthContext = Depends(get_current_user),
):
    if offset is not None and limit is None:
        logger.warning("account.purchases.missing_limit", extra={"user_id": user.user_id, "offset": offset})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="limit is required when offset is provided")
    try:
        purchases = list_credit_grants(user_id=user.user_id, source="purchase", limit=limit, offset=offset)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "account.purchases.fetch_failed",
            extra={"user_id": user.user_id, "error": str(exc), "error_type": type(exc).__name__},
        )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Purchase history unavailable") from exc
    mapped = [item for item in (_map_purchase_row(row, user_id=user.user_id) for row in purchases) if item is not None]
    if len(mapped) != len(purchases):
        logger.warning(
            "account.purchases.filtered",
            extra={"user_id": user.user_id, "raw_count": len(purchases), "mapped_count": len(mapped)},
        )
    logger.info(
        "account.purchases.fetched",
        extra={"user_id": user.user_id, "count": len(mapped), "limit": limit, "offset": offset},
    )
    return PurchaseListResponse(items=mapped)
