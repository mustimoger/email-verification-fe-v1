"""Paddle Billing configuration loader (new API, not Classic).

Centralizes environment selection (sandbox vs production), validates required
settings, parses plan definitions, and exposes the active environment config
for use by Paddle clients/webhooks.
"""

from functools import lru_cache
import json
from typing import Dict, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class PaddlePriceDefinition(BaseModel):
    price_id: str
    metadata: Dict[str, object] = Field(default_factory=dict)
    quantity: int = 1

    @model_validator(mode="after")
    def validate_quantity(self):
        if self.quantity <= 0:
            raise ValueError("quantity must be greater than zero")
        return self


class PaddlePlanDefinition(BaseModel):
    product_id: str
    metadata: Dict[str, object] = Field(default_factory=dict)
    prices: Dict[str, PaddlePriceDefinition]

    @model_validator(mode="after")
    def ensure_prices(self):
        if not self.prices:
            raise ValueError("at least one price is required for a plan")
        return self


class PaddleEnvironmentConfig(BaseModel):
    api_url: str
    api_key: str
    checkout_script: Optional[str] = None
    webhook_secret: Optional[str] = None
    secondary_api_key: Optional[str] = None


class PaddleConfig(BaseSettings):
    """Env-driven Paddle Billing settings with sandbox/production selection."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    status: Literal["sandbox", "production"] = Field("sandbox", alias="PADDLE_STATUS")
    checkout_enabled: bool = Field(False, alias="PADDLE_BILLING_CHECKOUT_ENABLED")

    client_side_token: Optional[str] = Field(None, alias="PADDLE_CLIENT_SIDE_TOKEN")
    seller_id: Optional[str] = Field(None, alias="PADDLE_SELLER_ID")

    plan_definitions: Dict[str, PaddlePlanDefinition] = Field(alias="PADDLE_BILLING_PLAN_DEFINITIONS")

    sandbox_ip_allowlist: list[str] = Field(default_factory=list, alias="PADDLE_SANDBOX_IPS")
    production_ip_allowlist: list[str] = Field(default_factory=list, alias="PADDLE_PRODUCTION_IPS")

    default_country: Optional[str] = Field(None, alias="PADDLE_BILLING_DEFAULT_COUNTRY")
    default_postal_code: Optional[str] = Field(None, alias="PADDLE_BILLING_DEFAULT_POSTAL")
    default_region: Optional[str] = Field(None, alias="PADDLE_BILLING_DEFAULT_REGION")
    default_city: Optional[str] = Field(None, alias="PADDLE_BILLING_DEFAULT_CITY")
    default_line1: Optional[str] = Field(None, alias="PADDLE_BILLING_DEFAULT_LINE1")

    sandbox_api_url: Optional[str] = Field(None, alias="PADDLE_BILLING_SANDBOX_API_URL")
    sandbox_api_key: Optional[str] = Field(None, alias="PADDLE_BILLING_SANDBOX_API_KEY")
    sandbox_secondary_api_key: Optional[str] = Field(None, alias="PADDLE_BILLING_SANDBOX_SECONDARY_API_KEY")
    sandbox_checkout_script: Optional[str] = Field(None, alias="PADDLE_BILLING_SANDBOX_CHECKOUT_SCRIPT")
    sandbox_webhook_secret: Optional[str] = Field(None, alias="PADDLE_BILLING_SANDBOX_WEBHOOK_SECRET")

    production_api_url: Optional[str] = Field(None, alias="PADDLE_BILLING_PRODUCTION_API_URL")
    production_api_key: Optional[str] = Field(None, alias="PADDLE_BILLING_PRODUCTION_API_KEY")
    production_checkout_script: Optional[str] = Field(None, alias="PADDLE_BILLING_PRODUCTION_CHECKOUT_SCRIPT")
    production_webhook_secret: Optional[str] = Field(None, alias="PADDLE_BILLING_PRODUCTION_WEBHOOK_SECRET")
    production_secondary_api_key: Optional[str] = Field(None, alias="PADDLE_BILLING_PRODUCTION_SECONDARY_API_KEY")

    @field_validator("plan_definitions", mode="before")
    @classmethod
    def parse_plan_definitions(cls, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception as exc:  # noqa: BLE001
                raise ValueError(f"Invalid JSON for PADDLE_BILLING_PLAN_DEFINITIONS: {exc}") from exc
        if not value:
            raise ValueError("PADDLE_BILLING_PLAN_DEFINITIONS is required")
        return value

    @field_validator("sandbox_ip_allowlist", "production_ip_allowlist", mode="before")
    @classmethod
    def parse_ip_list(cls, value):
        if value is None:
            return []
        if isinstance(value, str):
            parts = [p.strip() for p in value.split(",") if p.strip()]
            return parts
        if isinstance(value, list):
            return [str(p).strip() for p in value if str(p).strip()]
        raise ValueError("IP allowlist must be a comma-separated string or list")

    @model_validator(mode="after")
    def validate_active_env(self):
        env = self.status
        active = self.active_environment
        missing = []
        if not active.api_url:
            missing.append("api_url")
        if not active.api_key:
            missing.append("api_key")
        if self.checkout_enabled and not active.checkout_script:
            missing.append("checkout_script")
        if not active.webhook_secret:
            missing.append("webhook_secret")
        if missing:
            raise ValueError(f"Missing Paddle {env} settings: {', '.join(missing)}")
        if self.checkout_enabled and not self.client_side_token:
            raise ValueError("PADDLE_CLIENT_SIDE_TOKEN is required when checkout is enabled")
        return self

    @property
    def active_environment(self) -> PaddleEnvironmentConfig:
        if self.status == "production":
            return PaddleEnvironmentConfig(
                api_url=self.production_api_url or "",
                api_key=self.production_api_key or "",
                checkout_script=self.production_checkout_script,
                webhook_secret=self.production_webhook_secret,
                secondary_api_key=self.production_secondary_api_key,
            )
        return PaddleEnvironmentConfig(
            api_url=self.sandbox_api_url or "",
            api_key=self.sandbox_api_key or "",
            checkout_script=self.sandbox_checkout_script,
            webhook_secret=self.sandbox_webhook_secret,
            secondary_api_key=self.sandbox_secondary_api_key,
        )


@lru_cache()
def get_paddle_config() -> PaddleConfig:
    return PaddleConfig()
