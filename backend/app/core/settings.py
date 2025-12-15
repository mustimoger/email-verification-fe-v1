from functools import lru_cache
from typing import List, Literal, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: Literal["local", "staging", "prod"] = "local"
    log_level: Literal["debug", "info", "warning", "error", "critical"] = "info"

    email_api_base_url: str
    email_api_key: str

    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    supabase_anon_key: Optional[str] = None

    database_url: Optional[str] = None

    next_public_api_base_url: Optional[str] = None
    backend_cors_origins: List[str] = ["http://localhost:3000", "https://boltroute.ai", "https://www.boltroute.ai"]

    upload_max_mb: int = 10
    upload_retention_days: int = 180
    upload_retention_when_credits: Literal["non_zero", "always", "never"] = "non_zero"

    usage_retention_days: int = 180


@lru_cache()
def get_settings() -> Settings:
    return Settings()
