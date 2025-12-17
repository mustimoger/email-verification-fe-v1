import logging
import time
from typing import Any, Dict, Optional

import httpx
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

    try:
        claims = _decode_supabase_jwt(token, settings.supabase_jwt_secret)
    except InvalidTokenError:
        jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        claims = _decode_supabase_jwt_with_jwks(token, jwks_url)
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
