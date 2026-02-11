from functools import lru_cache
from typing import List, Literal, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: Literal["local", "staging", "prod"] = "local"
    log_level: Literal["debug", "info", "warning", "error", "critical"] = "info"
    log_file_path: Optional[str] = None
    log_file_when: Optional[Literal["S", "M", "H", "D", "W0", "W1", "W2", "W3", "W4", "W5", "W6", "midnight"]] = None
    log_file_interval: Optional[int] = None
    log_file_backup_count: Optional[int] = None

    email_api_base_url: str
    dev_api_keys: List[str] | str = []

    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    supabase_anon_key: Optional[str] = None
    supabase_auth_cookie_name: str
    external_api_jwt_ttl_seconds: Optional[int] = None
    external_api_admin_key: Optional[str] = None

    database_url: Optional[str] = None

    next_public_api_base_url: Optional[str] = None
    backend_cors_origins: List[str] | str = ["http://localhost:3000", "https://boltroute.ai", "https://www.boltroute.ai"]

    upload_max_mb: int = 10
    manual_max_emails: int
    latest_uploads_limit: int
    upload_poll_attempts: int = 3
    upload_poll_interval_seconds: float = 2.0
    upload_poll_page_size: int = 20
    overview_metrics_timeout_seconds: float = 8.0

    signup_bonus_credits: Optional[int] = None
    signup_bonus_max_account_age_seconds: Optional[int] = None
    signup_bonus_require_email_confirmed: Optional[bool] = None

    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_starttls_required: Optional[bool] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    smtp_reply_to: Optional[str] = None
    bulk_upload_email_subject_completed: Optional[str] = None
    bulk_upload_email_subject_failed: Optional[str] = None
    bulk_upload_email_body_completed: Optional[str] = None
    bulk_upload_email_body_failed: Optional[str] = None
    bulk_upload_webhook_url: Optional[str] = None
    bulk_upload_webhook_secret_key: Optional[str] = Field(default=None, alias="WEBHOOK_SECRET_KEY")
    sales_contact_user_rate_limit_requests: int = 5
    sales_contact_ip_rate_limit_requests: int = 20
    sales_contact_rate_limit_window_seconds: int = 300

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def split_cors(cls, value):
        """
        Allow comma-separated CORS origins in env (e.g., http://localhost:3000,https://example.com).
        """
        if isinstance(value, str):
            trimmed = value.strip()
            if trimmed.startswith("[") and trimmed.endswith("]"):
                for parser in ("json", "ast"):
                    try:
                        if parser == "json":
                            import json
                            parsed = json.loads(trimmed)
                        else:
                            import ast
                            parsed = ast.literal_eval(trimmed)
                        if isinstance(parsed, list):
                            return [v.strip() for v in parsed if isinstance(v, str) and v.strip()]
                    except Exception:
                        continue
                # Fallback for shell-stripped bracketed values like [http://a.com,"http://b.com"]
                stripped = trimmed.strip("[]")
                parts = [p.strip().strip('"').strip("'") for p in stripped.split(",") if p.strip()]
                if parts:
                    return parts
            parts = [v.strip() for v in value.split(",") if v.strip()]
            return parts or value
        return value

    @field_validator("dev_api_keys", mode="before")
    @classmethod
    def split_dev_keys(cls, value):
        """Allow comma-separated DEV_API_KEYS env to populate a list."""
        if isinstance(value, str):
            parts = [v.strip() for v in value.split(",") if v.strip()]
            return parts
        return value

    @field_validator(
        "manual_max_emails",
        "latest_uploads_limit",
        "upload_poll_attempts",
        "upload_poll_page_size",
        "sales_contact_user_rate_limit_requests",
        "sales_contact_ip_rate_limit_requests",
        "sales_contact_rate_limit_window_seconds",
    )
    @classmethod
    def positive_int(cls, value):
        if value <= 0:
            raise ValueError("must be greater than zero")
        return value

    @field_validator("upload_poll_interval_seconds")
    @classmethod
    def non_negative(cls, value):
        if value < 0:
            raise ValueError("must be non-negative")
        return value

    @field_validator("overview_metrics_timeout_seconds")
    @classmethod
    def positive_timeout(cls, value):
        if value <= 0:
            raise ValueError("must be greater than zero")
        return value

    @field_validator("signup_bonus_credits", "signup_bonus_max_account_age_seconds")
    @classmethod
    def positive_optional(cls, value):
        if value is None:
            return value
        if value <= 0:
            raise ValueError("must be greater than zero")
        return value

    @field_validator("external_api_jwt_ttl_seconds")
    @classmethod
    def positive_optional_ttl(cls, value):
        if value is None:
            return value
        if value <= 0:
            raise ValueError("must be greater than zero")
        return value

    @field_validator("smtp_port")
    @classmethod
    def positive_optional_port(cls, value):
        if value is None:
            return value
        if value <= 0:
            raise ValueError("must be greater than zero")
        return value


@lru_cache()
def get_settings() -> Settings:
    return Settings()
