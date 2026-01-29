import logging
import time
from typing import Any, Dict, Optional

import httpx
import jwt
from fastapi import Depends, Header, HTTPException, Request, status
from jwt import InvalidTokenError
from pydantic import BaseModel

from .settings import get_settings
from ..services import supabase_client

logger = logging.getLogger(__name__)


class AuthContext(BaseModel):
    user_id: str
    claims: Dict[str, Any]
    token: str
    role: str = "user"


def _claims_email_confirmed(claims: Dict[str, Any]) -> bool:
    for key in ("email_confirmed_at", "confirmed_at"):
        value = claims.get(key)
        if isinstance(value, str) and value.strip():
            return True
    return False


def _is_email_confirmed(user: Any) -> bool:
    return bool(getattr(user, "email_confirmed_at", None) or getattr(user, "confirmed_at", None))


def enforce_email_confirmed(user_id: str, claims: Dict[str, Any]) -> None:
    if _claims_email_confirmed(claims):
        return
    try:
        auth_user = supabase_client.fetch_auth_user(user_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("auth.email_confirm_lookup_failed", extra={"user_id": user_id, "error": str(exc)})
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Email verification unavailable")
    if _is_email_confirmed(auth_user):
        return
    logger.info(
        "auth.email_unconfirmed",
        extra={"user_id": user_id, "email": getattr(auth_user, "email", None)},
    )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Please confirm your email address before signing in.",
    )


def _extract_token(authorization: Optional[str], cookie_token: Optional[str]) -> Optional[str]:
    if authorization:
        parts = authorization.split(" ", 1)
        if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1]:
            return parts[1].strip()
    if cookie_token:
        return cookie_token.strip()
    return None


def _extract_role_claim(claims: Dict[str, Any]) -> tuple[Optional[str], Optional[str]]:
    app_metadata = claims.get("app_metadata") if isinstance(claims, dict) else None
    if isinstance(app_metadata, dict):
        role = app_metadata.get("role")
        if isinstance(role, str) and role.strip():
            return role.strip(), "app_metadata.role"
    top_level_role = claims.get("role") if isinstance(claims, dict) else None
    if isinstance(top_level_role, str) and top_level_role.strip():
        return top_level_role.strip(), "role"
    return None, None


def _decode_supabase_jwt(token: str, secret: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
    except InvalidTokenError as exc:
        raise exc


_jwks_cache: Dict[str, Any] = {"expires_at": 0.0, "keys": None}


def _fetch_jwks(jwks_url: str) -> Dict[str, Any]:
    now = time.time()
    if _jwks_cache["keys"] and _jwks_cache["expires_at"] > now:
        return _jwks_cache["keys"]
    try:
        with httpx.Client(timeout=5) as client:
            resp = client.get(jwks_url)
            resp.raise_for_status()
            data = resp.json()
            _jwks_cache["keys"] = data
            _jwks_cache["expires_at"] = now + 300  # 5 minutes
            return data
    except Exception as exc:  # noqa: BLE001
        logger.warning("auth.jwks_fetch_failed", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired authentication token"
        ) from exc


def _decode_supabase_jwt_with_jwks(token: str, jwks_url: str) -> Dict[str, Any]:
    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        keys = _fetch_jwks(jwks_url).get("keys", [])
        key_data = next((k for k in keys if k.get("kid") == kid), None)
        if not key_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired authentication token"
            )
        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
        return jwt.decode(token, public_key, algorithms=["RS256"], audience="authenticated")
    except InvalidTokenError as exc:
        logger.warning("auth.invalid_token_jwks", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        ) from exc


def _get_current_user(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    dev_api_key: Optional[str] = Header(default=None, alias="x-dev-api-key"),
    settings=Depends(get_settings),
    require_confirmed_email: bool = True,
) -> AuthContext:
    cookie_token = request.cookies.get(settings.supabase_auth_cookie_name)
    token = _extract_token(authorization, cookie_token)
    if not token:
        logger.info(
            "auth.missing_token",
            extra={"has_authorization": bool(authorization), "has_cookie": bool(cookie_token)},
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing auth token")

    try:
        claims = _decode_supabase_jwt(token, settings.supabase_jwt_secret)
    except InvalidTokenError:
        jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        claims = _decode_supabase_jwt_with_jwks(token, jwks_url)
    user_id = claims.get("sub") or claims.get("user_id")
    if not user_id:
        logger.warning("auth.missing_sub", extra={"claims_keys": list(claims.keys())})
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth token")

    role = "user"
    role_source = None
    role_claim, role_source = _extract_role_claim(claims)
    if role_claim:
        if role_claim == "admin":
            role = "admin"
        else:
            logger.debug(
                "auth.role_claim_non_admin",
                extra={"user_id": user_id, "role_claim": role_claim, "role_source": role_source},
            )
    else:
        logger.debug("auth.role_claim_missing", extra={"user_id": user_id})
    dev_keys = settings.dev_api_keys if isinstance(settings.dev_api_keys, list) else [settings.dev_api_keys]
    if dev_api_key and dev_keys and dev_api_key in dev_keys:
        role = "admin"
        role_source = "dev_api_key"

    logger.debug(
        "auth.authenticated",
        extra={
            "user_id": user_id,
            "has_cookie": bool(cookie_token),
            "has_authorization": bool(authorization),
            "role": role,
            "role_source": role_source,
        },
    )
    if require_confirmed_email:
        enforce_email_confirmed(user_id, claims)
    return AuthContext(user_id=user_id, claims=claims, token=token, role=role)


def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    dev_api_key: Optional[str] = Header(default=None, alias="x-dev-api-key"),
    settings=Depends(get_settings),
) -> AuthContext:
    return _get_current_user(
        request,
        authorization=authorization,
        dev_api_key=dev_api_key,
        settings=settings,
        require_confirmed_email=True,
    )


def get_current_user_allow_unconfirmed(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    dev_api_key: Optional[str] = Header(default=None, alias="x-dev-api-key"),
    settings=Depends(get_settings),
) -> AuthContext:
    return _get_current_user(
        request,
        authorization=authorization,
        dev_api_key=dev_api_key,
        settings=settings,
        require_confirmed_email=False,
    )


def get_current_user_optional(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    dev_api_key: Optional[str] = Header(default=None, alias="x-dev-api-key"),
    settings=Depends(get_settings),
) -> Optional[AuthContext]:
    cookie_token = request.cookies.get(settings.supabase_auth_cookie_name)
    token = _extract_token(authorization, cookie_token)
    if not token:
        return None
    return _get_current_user(
        request,
        authorization=authorization,
        dev_api_key=dev_api_key,
        settings=settings,
        require_confirmed_email=False,
    )
