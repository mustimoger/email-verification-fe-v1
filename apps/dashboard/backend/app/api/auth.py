from fastapi import APIRouter, Depends

from ..core.auth import enforce_email_confirmed, get_current_user_allow_unconfirmed

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/confirmed")
def confirm_email(user=Depends(get_current_user_allow_unconfirmed)) -> dict[str, bool]:
    enforce_email_confirmed(user.user_id, user.claims)
    return {"confirmed": True}
