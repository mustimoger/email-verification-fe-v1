import logging
from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, Header, HTTPException, Request, status
from jwt import InvalidTokenError
from pydantic import BaseModel

from .settings import get_settings

logger = logging.getLogger(__name__)


class AuthContext(BaseModel):
    user_id: str
    claims: Dict[str, Any]
    token: str


def _extract_token(authorization: Optional[str], cookie_token: Optional[str]) -> Optional[str]:
    if authorization:
        parts = authorization.split(" ", 1)
        if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1]:
            return parts[1].strip()
    if cookie_token:
        return cookie_token.strip()
    return None


def _decode_supabase_jwt(token: str, secret: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except InvalidTokenError as exc:
        logger.warning("auth.invalid_token", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        ) from exc


def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    settings=Depends(get_settings),
) -> AuthContext:
    cookie_token = request.cookies.get(settings.supabase_auth_cookie_name)
    token = _extract_token(authorization, cookie_token)
    if not token:
        logger.info(
            "auth.missing_token",
            extra={"has_authorization": bool(authorization), "has_cookie": bool(cookie_token)},
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing auth token")

    claims = _decode_supabase_jwt(token, settings.supabase_jwt_secret)
    user_id = claims.get("sub") or claims.get("user_id")
    if not user_id:
        logger.warning("auth.missing_sub", extra={"claims_keys": list(claims.keys())})
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth token")

    logger.debug(
        "auth.authenticated",
        extra={
            "user_id": user_id,
            "has_cookie": bool(cookie_token),
            "has_authorization": bool(authorization),
        },
    )
    return AuthContext(user_id=user_id, claims=claims, token=token)

