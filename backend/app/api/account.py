import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from pydantic import BaseModel, EmailStr

from ..core.auth import AuthContext, get_current_user
from ..services import supabase_client
from ..core.settings import get_settings
from ..services.supabase_client import get_storage
from ..services.usage import record_usage

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
    credits_remaining: int


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
    record_usage(user.user_id, path="/account/profile", count=1)
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
    record_usage(user.user_id, path="/account/profile", count=1)
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
    record_usage(user.user_id, path="/account/avatar", count=1)
    return updated


@router.get("/credits", response_model=CreditsResponse)
def get_credits(user: AuthContext = Depends(get_current_user)):
    try:
        credits = supabase_client.fetch_credits(user.user_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("account.credits.fetch_failed", extra={"user_id": user.user_id, "error": str(exc), "error_type": type(exc).__name__})
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Credits service unavailable") from exc
    logger.info("account.credits.fetched", extra={"user_id": user.user_id, "credits_remaining": credits})
    record_usage(user.user_id, path="/account/credits", count=1)
    return CreditsResponse(credits_remaining=credits)
