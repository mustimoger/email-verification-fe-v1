import logging
import time
from typing import Optional

import jwt

from .settings import get_settings

logger = logging.getLogger(__name__)


def build_supabase_jwt(*, user_id: str, role: str, ttl_seconds: Optional[int]) -> str:
    if not user_id:
        raise ValueError("user_id is required to build a Supabase JWT")
    if not role:
        raise ValueError("role is required to build a Supabase JWT")
    if ttl_seconds is None or ttl_seconds <= 0:
        raise ValueError("external_api_jwt_ttl_seconds must be configured and greater than zero")
    settings = get_settings()
    now = int(time.time())
    claims = {
        "aud": "authenticated",
        "sub": user_id,
        "role": role,
        "app_metadata": {"role": role},
        "iat": now,
        "exp": now + int(ttl_seconds),
    }
    return jwt.encode(claims, settings.supabase_jwt_secret, algorithm="HS256")
