import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr

from ..core.auth import AuthContext, get_current_user
from ..services import supabase_client
from ..services.usage import record_usage

router = APIRouter(prefix="/api/account", tags=["account"])
logger = logging.getLogger(__name__)


class ProfileResponse(BaseModel):
    user_id: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None


class CreditsResponse(BaseModel):
    credits_remaining: int


@router.get("/profile", response_model=ProfileResponse)
def get_profile(user: AuthContext = Depends(get_current_user)):
    profile = supabase_client.fetch_profile(user.user_id)
    if not profile:
        logger.info("account.profile.not_found", extra={"user_id": user.user_id})
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    logger.info("account.profile.fetched", extra={"user_id": user.user_id})
    record_usage(user.user_id, path="/account/profile", count=1)
    return profile


@router.patch("/profile", response_model=ProfileResponse)
def update_profile(payload: ProfileUpdateRequest, user: AuthContext = Depends(get_current_user)):
    updated = supabase_client.upsert_profile(user.user_id, email=payload.email, display_name=payload.display_name)
    logger.info("account.profile.updated", extra={"user_id": user.user_id})
    record_usage(user.user_id, path="/account/profile", count=1)
    return updated


@router.get("/credits", response_model=CreditsResponse)
def get_credits(user: AuthContext = Depends(get_current_user)):
    credits = supabase_client.fetch_credits(user.user_id)
    logger.info("account.credits.fetched", extra={"user_id": user.user_id, "credits_remaining": credits})
    record_usage(user.user_id, path="/account/credits", count=1)
    return CreditsResponse(credits_remaining=credits)
