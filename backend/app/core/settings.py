from functools import lru_cache
from typing import List, Literal, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


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
    supabase_auth_cookie_name: str

    database_url: Optional[str] = None

    next_public_api_base_url: Optional[str] = None
    backend_cors_origins: List[str] = ["http://localhost:3000", "https://boltroute.ai", "https://www.boltroute.ai"]

    upload_max_mb: int = 10
    upload_retention_days: int = 180
    upload_retention_when_credits: Literal["non_zero", "always", "never"] = "non_zero"

    usage_retention_days: int = 180

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def split_cors(cls, value):
        """
        Allow comma-separated CORS origins in env (e.g., http://localhost:3000,https://example.com).
        """
        if isinstance(value, str):
            parts = [v.strip() for v in value.split(",") if v.strip()]
            return parts or value
        return value


@lru_cache()
def get_settings() -> Settings:
    return Settings()
