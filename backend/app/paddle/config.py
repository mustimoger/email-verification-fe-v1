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

    plan_definitions: Optional[Dict[str, PaddlePlanDefinition]] = Field(
        default=None,
        alias="PADDLE_BILLING_PLAN_DEFINITIONS",
    )

    sandbox_ip_allowlist: list[str] | str = Field(default_factory=list, alias="PADDLE_SANDBOX_IPS")
    production_ip_allowlist: list[str] | str = Field(default_factory=list, alias="PADDLE_PRODUCTION_IPS")

    address_mode: Optional[Literal["checkout", "server_default"]] = Field(None, alias="PADDLE_ADDRESS_MODE")
    default_country: Optional[str] = Field(None, alias="PADDLE_BILLING_DEFAULT_COUNTRY")
    default_postal_code: Optional[str] = Field(None, alias="PADDLE_BILLING_DEFAULT_POSTAL")
    default_region: Optional[str] = Field(None, alias="PADDLE_BILLING_DEFAULT_REGION")
    default_city: Optional[str] = Field(None, alias="PADDLE_BILLING_DEFAULT_CITY")
    default_line1: Optional[str] = Field(None, alias="PADDLE_BILLING_DEFAULT_LINE1")
    webhook_max_variance_seconds: Optional[int] = Field(None, alias="PADDLE_WEBHOOK_MAX_VARIANCE_SECONDS")
    webhook_trust_proxy: Optional[bool] = Field(None, alias="PADDLE_WEBHOOK_TRUST_PROXY")
    webhook_forwarded_header: Optional[str] = Field(None, alias="PADDLE_WEBHOOK_FORWARDED_HEADER")
    webhook_forwarded_format: Optional[Literal["x_forwarded_for", "forwarded"]] = Field(
        None,
        alias="PADDLE_WEBHOOK_FORWARDED_FORMAT",
    )
    webhook_proxy_hops: Optional[int] = Field(None, alias="PADDLE_WEBHOOK_PROXY_HOPS")

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
        if value is None or value == "":
            return None
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception as exc:  # noqa: BLE001
                raise ValueError(f"Invalid JSON for PADDLE_BILLING_PLAN_DEFINITIONS: {exc}") from exc
        if not value:
            return None
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
        if self.webhook_trust_proxy is None:
            raise ValueError("PADDLE_WEBHOOK_TRUST_PROXY is required")
        if self.address_mode is None:
            raise ValueError("PADDLE_ADDRESS_MODE is required")
        if self.address_mode == "server_default":
            missing_address = []
            if not self.default_country:
                missing_address.append("PADDLE_BILLING_DEFAULT_COUNTRY")
            if not self.default_line1:
                missing_address.append("PADDLE_BILLING_DEFAULT_LINE1")
            if not self.default_city:
                missing_address.append("PADDLE_BILLING_DEFAULT_CITY")
            if not self.default_region:
                missing_address.append("PADDLE_BILLING_DEFAULT_REGION")
            if not self.default_postal_code:
                missing_address.append("PADDLE_BILLING_DEFAULT_POSTAL")
            if missing_address:
                raise ValueError(f"Missing Paddle default address settings: {', '.join(missing_address)}")
        if self.webhook_trust_proxy:
            proxy_missing = []
            if not self.webhook_forwarded_header:
                proxy_missing.append("PADDLE_WEBHOOK_FORWARDED_HEADER")
            if not self.webhook_forwarded_format:
                proxy_missing.append("PADDLE_WEBHOOK_FORWARDED_FORMAT")
            if self.webhook_proxy_hops is None:
                proxy_missing.append("PADDLE_WEBHOOK_PROXY_HOPS")
            if proxy_missing:
                raise ValueError(f"Missing Paddle webhook proxy settings: {', '.join(proxy_missing)}")
            if self.webhook_proxy_hops < 1:
                raise ValueError("PADDLE_WEBHOOK_PROXY_HOPS must be greater than zero")
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
