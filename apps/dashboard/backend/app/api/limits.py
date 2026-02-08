import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..core.auth import AuthContext, get_current_user
from ..core.settings import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["limits"])


class LimitsResponse(BaseModel):
    manual_max_emails: int
    upload_max_mb: int


@router.get("/limits", response_model=LimitsResponse)
def get_limits(user: AuthContext = Depends(get_current_user)) -> LimitsResponse:
    settings = get_settings()
    logger.info("route.limits", extra={"user_id": user.user_id})
    return LimitsResponse(
        manual_max_emails=settings.manual_max_emails,
        upload_max_mb=settings.upload_max_mb,
    )
