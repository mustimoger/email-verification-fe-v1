import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from ..core.auth import AuthContext, get_current_user_allow_unconfirmed
from ..core.settings import get_settings
from ..services import supabase_client
from ..services.credit_grants import list_credit_grants, upsert_credit_grant
from ..services.pricing_v2 import get_pricing_config_v2

router = APIRouter(prefix="/api/credits", tags=["credits"])
logger = logging.getLogger(__name__)


class SignupBonusResponse(BaseModel):
    status: str
    credits_granted: Optional[int] = None


class TrialBonusResponse(BaseModel):
    status: str
    credits_granted: Optional[int] = None


def _parse_timestamp(value: object) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _is_email_confirmed(auth_user: object) -> bool:
    return bool(getattr(auth_user, "email_confirmed_at", None) or getattr(auth_user, "confirmed_at", None))


@router.post("/signup-bonus", response_model=SignupBonusResponse)
async def claim_signup_bonus(
    request: Request,
    user: AuthContext = Depends(get_current_user_allow_unconfirmed),
):
    settings = get_settings()
    missing = []
    if settings.signup_bonus_credits is None:
        missing.append("SIGNUP_BONUS_CREDITS")
    if settings.signup_bonus_max_account_age_seconds is None:
        missing.append("SIGNUP_BONUS_MAX_ACCOUNT_AGE_SECONDS")
    if settings.signup_bonus_require_email_confirmed is None:
        missing.append("SIGNUP_BONUS_REQUIRE_EMAIL_CONFIRMED")
    if missing:
        logger.warning("credits.signup_bonus.misconfigured", extra={"missing": missing, "user_id": user.user_id})
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Signup bonus not configured")

    try:
        auth_user = supabase_client.fetch_auth_user(user.user_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("credits.signup_bonus.auth_lookup_failed", extra={"user_id": user.user_id, "error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Signup bonus eligibility unavailable"
        ) from exc

    created_at = _parse_timestamp(getattr(auth_user, "created_at", None))
    if created_at is None:
        logger.error("credits.signup_bonus.created_at_missing", extra={"user_id": user.user_id})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Signup bonus eligibility unavailable"
        )

    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    age_seconds = (now - created_at).total_seconds()
    if age_seconds < 0:
        logger.warning(
            "credits.signup_bonus.created_at_in_future",
            extra={"user_id": user.user_id, "created_at": created_at.isoformat()},
        )
        age_seconds = 0

    max_age = settings.signup_bonus_max_account_age_seconds
    if max_age is not None and age_seconds > max_age:
        logger.info(
            "credits.signup_bonus.too_old",
            extra={"user_id": user.user_id, "age_seconds": age_seconds, "max_age_seconds": max_age},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Signup bonus eligibility window elapsed")

    if settings.signup_bonus_require_email_confirmed and not _is_email_confirmed(auth_user):
        logger.info("credits.signup_bonus.email_unconfirmed", extra={"user_id": user.user_id})
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email confirmation required")

    existing = list_credit_grants(user_id=user.user_id, source="signup", limit=1, offset=0)
    if existing:
        credits_granted = existing[0].get("credits_granted") if isinstance(existing[0], dict) else None
        logger.info("credits.signup_bonus.duplicate", extra={"user_id": user.user_id})
        return SignupBonusResponse(status="duplicate", credits_granted=credits_granted)

    credits = settings.signup_bonus_credits
    if credits is None:
        logger.warning("credits.signup_bonus.misconfigured", extra={"user_id": user.user_id})
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Signup bonus not configured")

    raw_meta = {
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }
    inserted = upsert_credit_grant(
        user_id=user.user_id,
        source="signup",
        source_id=user.user_id,
        credits_granted=credits,
        raw=raw_meta,
    )
    if not inserted:
        logger.error("credits.signup_bonus.grant_failed", extra={"user_id": user.user_id})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Signup bonus grant failed")

    logger.info("credits.signup_bonus.granted", extra={"user_id": user.user_id, "credits": credits})
    return SignupBonusResponse(status="applied", credits_granted=credits)


@router.post("/trial-bonus", response_model=TrialBonusResponse)
async def claim_trial_bonus(
    request: Request,
    user: AuthContext = Depends(get_current_user_allow_unconfirmed),
):
    try:
        config = get_pricing_config_v2()
    except Exception as exc:  # noqa: BLE001
        logger.error("credits.trial_bonus.config_load_failed", extra={"user_id": user.user_id, "error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Free trial credits not configured",
        ) from exc

    trial_credits = config.free_trial_credits
    if trial_credits is None or trial_credits <= 0:
        logger.warning(
            "credits.trial_bonus.misconfigured",
            extra={"user_id": user.user_id, "free_trial_credits": trial_credits},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Free trial credits not configured",
        )

    try:
        auth_user = supabase_client.fetch_auth_user(user.user_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("credits.trial_bonus.auth_lookup_failed", extra={"user_id": user.user_id, "error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Free trial eligibility unavailable",
        ) from exc

    if not _is_email_confirmed(auth_user):
        logger.info("credits.trial_bonus.email_unconfirmed", extra={"user_id": user.user_id})
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email confirmation required")

    existing = list_credit_grants(user_id=user.user_id, source="trial", limit=1, offset=0)
    if existing:
        credits_granted = existing[0].get("credits_granted") if isinstance(existing[0], dict) else None
        logger.info("credits.trial_bonus.duplicate", extra={"user_id": user.user_id})
        return TrialBonusResponse(status="duplicate", credits_granted=credits_granted)

    raw_meta = {
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }
    inserted = upsert_credit_grant(
        user_id=user.user_id,
        source="trial",
        source_id=user.user_id,
        credits_granted=trial_credits,
        raw=raw_meta,
    )
    if not inserted:
        logger.error("credits.trial_bonus.grant_failed", extra={"user_id": user.user_id})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Free trial grant failed")

    logger.info("credits.trial_bonus.granted", extra={"user_id": user.user_id, "credits": trial_credits})
    return TrialBonusResponse(status="applied", credits_granted=trial_credits)
