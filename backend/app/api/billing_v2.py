import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from ..core.auth import AuthContext, get_current_user, get_current_user_optional
from ..paddle.client import (
    CreateTransactionRequest,
    PaddleAPIError,
    TransactionItem,
    TransactionPrice,
    TransactionUnitPrice,
    get_paddle_client,
)
from ..paddle.config import get_paddle_config
from ..services.pricing_v2 import (
    PricingValidationError,
    compute_pricing_totals_v2,
    format_decimal,
    get_pricing_config_v2,
    get_pricing_tier_by_price_id_v2,
    select_pricing_tier_v2,
    validate_quantity_v2,
)
from .billing import _resolve_customer_and_address

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing/v2", tags=["billing_v2"])

VALID_MODES = {"payg", "subscription"}
VALID_INTERVALS = {"one_time", "month", "year"}


class PricingConfigResponse(BaseModel):
    currency: str
    min_volume: int
    max_volume: int
    step_size: int
    free_trial_credits: Optional[int] = None
    rounding_rule: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PricingConfigEnvelope(BaseModel):
    status: str
    checkout_enabled: bool
    checkout_script: Optional[str] = None
    client_side_token: Optional[str] = None
    seller_id: Optional[str] = None
    pricing: PricingConfigResponse


class PricingTierResponse(BaseModel):
    mode: str
    interval: str
    min_quantity: int
    max_quantity: Optional[int] = None
    unit_amount: str
    currency: str
    credits_per_unit: int
    paddle_price_id: str


class PricingQuoteRequest(BaseModel):
    quantity: int = Field(..., gt=0)
    mode: str
    interval: str

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, value: str) -> str:
        if value not in VALID_MODES:
            raise ValueError("mode must be payg or subscription")
        return value

    @field_validator("interval")
    @classmethod
    def validate_interval(cls, value: str) -> str:
        if value not in VALID_INTERVALS:
            raise ValueError("interval must be one_time, month, or year")
        return value


class PricingQuoteResponse(BaseModel):
    quantity: int
    units: int
    mode: str
    interval: str
    currency: str
    unit_amount: str
    raw_total: str
    rounded_total: str
    paddle_total: str
    rounding_adjustment: str
    rounding_adjustment_cents: int
    tier: PricingTierResponse


class PricingTransactionRequest(BaseModel):
    quantity: int = Field(..., gt=0)
    mode: str
    interval: str
    price_id: Optional[str] = None
    custom_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, value: str) -> str:
        if value not in VALID_MODES:
            raise ValueError("mode must be payg or subscription")
        return value

    @field_validator("interval")
    @classmethod
    def validate_interval(cls, value: str) -> str:
        if value not in VALID_INTERVALS:
            raise ValueError("interval must be one_time, month, or year")
        return value


class PricingTransactionResponse(BaseModel):
    id: str
    status: Optional[str] = None


@router.get("/config", response_model=PricingConfigEnvelope)
async def config_pricing_v2(user: Optional[AuthContext] = Depends(get_current_user_optional)) -> PricingConfigEnvelope:
    user_id = user.user_id if user else None
    try:
        config = get_pricing_config_v2()
        paddle_config = get_paddle_config()
        env = paddle_config.active_environment
    except Exception as exc:  # noqa: BLE001
        logger.error("pricing_v2.config_failed", extra={"error": str(exc), "user_id": user_id})
        raise HTTPException(status_code=500, detail="Pricing configuration unavailable") from exc
    return PricingConfigEnvelope(
        status=paddle_config.status,
        checkout_enabled=paddle_config.checkout_enabled,
        checkout_script=env.checkout_script,
        client_side_token=paddle_config.client_side_token,
        seller_id=paddle_config.seller_id,
        pricing=PricingConfigResponse(
            currency=config.currency,
            min_volume=config.min_volume,
            max_volume=config.max_volume,
            step_size=config.step_size,
            free_trial_credits=config.free_trial_credits,
            rounding_rule=config.rounding_rule,
            metadata=config.metadata,
        ),
    )


def _validate_mode_interval(mode: str, interval: str) -> None:
    if mode == "payg" and interval != "one_time":
        raise PricingValidationError(
            {"message": "Pay-as-you-go must use one_time interval", "code": "invalid_interval"},
        )
    if mode == "subscription" and interval == "one_time":
        raise PricingValidationError(
            {"message": "Subscription must use month or year interval", "code": "invalid_interval"},
        )


@router.post("/quote", response_model=PricingQuoteResponse)
async def quote_pricing_v2(payload: PricingQuoteRequest) -> PricingQuoteResponse:
    try:
        config = get_pricing_config_v2()
        _validate_mode_interval(payload.mode, payload.interval)
        validate_quantity_v2(payload.quantity, config)
        tier = select_pricing_tier_v2(payload.quantity, payload.mode, payload.interval, config)
        totals = compute_pricing_totals_v2(payload.quantity, tier, config)
    except PricingValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    except Exception as exc:  # noqa: BLE001
        logger.error("pricing_v2.quote_failed", extra={"error": str(exc)})
        raise HTTPException(status_code=500, detail="Pricing unavailable") from exc
    return PricingQuoteResponse(
        quantity=payload.quantity,
        units=totals.units,
        mode=payload.mode,
        interval=payload.interval,
        currency=tier.currency,
        unit_amount=format_decimal(tier.unit_amount),
        raw_total=format_decimal(totals.raw_total),
        rounded_total=format_decimal(totals.rounded_total),
        paddle_total=format_decimal(totals.paddle_total),
        rounding_adjustment=format_decimal(totals.rounding_adjustment),
        rounding_adjustment_cents=totals.rounding_adjustment_cents,
        tier=PricingTierResponse(
            mode=tier.mode,
            interval=tier.interval,
            min_quantity=tier.min_quantity,
            max_quantity=tier.max_quantity,
            unit_amount=format_decimal(tier.unit_amount),
            currency=tier.currency,
            credits_per_unit=tier.credits_per_unit,
            paddle_price_id=tier.paddle_price_id,
        ),
    )


async def _resolve_product_id_for_price(price_id: str) -> str:
    client = get_paddle_client()
    price = await client.get_price(price_id)
    product_id = getattr(price, "product_id", None)
    if not product_id:
        logger.error("pricing_v2.product_id_missing", extra={"price_id": price_id})
        raise PricingValidationError(
            {"message": "Unable to resolve product for price", "code": "product_id_missing"},
            status_code=500,
        )
    return product_id


def _rounding_description(config_metadata: Dict[str, Any], adjustment_cents: int) -> str:
    key = "rounding_fee_description" if adjustment_cents > 0 else "rounding_discount_description"
    candidate = config_metadata.get(key) or config_metadata.get("rounding_description")
    if candidate:
        return str(candidate)
    logger.warning(
        "pricing_v2.rounding_description_missing",
        extra={"key": key, "metadata_keys": list(config_metadata.keys())},
    )
    return "Rounding adjustment"


def _build_rounding_fee_item(amount_cents: int, currency: str, product_id: str, description: str) -> TransactionItem:
    price = TransactionPrice(
        product_id=product_id,
        description=description,
        unit_price=TransactionUnitPrice(amount=str(amount_cents), currency_code=currency),
    )
    return TransactionItem(price=price, quantity=1)


def _sanitize_discount_code_prefix(prefix: str) -> str:
    return "".join(char for char in prefix if char.isalnum())


def _build_rounding_discount_code(metadata: Dict[str, Any], currency: str, amount_cents: int) -> str:
    prefix = metadata.get("rounding_discount_code_prefix")
    if not isinstance(prefix, str) or not prefix.strip():
        logger.warning("pricing_v2.discount_prefix_missing", extra={"currency": currency, "amount_cents": amount_cents})
        prefix = "ROUNDING"
    sanitized = _sanitize_discount_code_prefix(prefix)
    if not sanitized:
        logger.warning("pricing_v2.discount_prefix_invalid", extra={"prefix": prefix})
        sanitized = "ROUNDING"
    code = f"{sanitized}{currency.upper()}{amount_cents}"
    if len(code) > 32:
        logger.warning("pricing_v2.discount_code_trimmed", extra={"code": code, "length": len(code)})
        code = code[:32]
    return code


def _extract_discount_id(payload: Any) -> Optional[str]:
    if isinstance(payload, dict):
        if isinstance(payload.get("id"), str):
            return payload["id"]
        data = payload.get("data")
        if isinstance(data, dict) and isinstance(data.get("id"), str):
            return data["id"]
    return None


def _extract_discount_id_from_list(payload: Any) -> Optional[str]:
    if isinstance(payload, dict):
        items = payload.get("data")
        if isinstance(items, list) and items:
            first = items[0]
            if isinstance(first, dict) and isinstance(first.get("id"), str):
                return first["id"]
    return None


async def _get_rounding_discount_id(
    amount_cents: int,
    currency: str,
    description: str,
    metadata: Dict[str, Any],
) -> str:
    if amount_cents <= 0:
        raise PricingValidationError(
            {"message": "Invalid discount amount", "code": "invalid_discount"},
            status_code=500,
        )
    code = _build_rounding_discount_code(metadata, currency, amount_cents)
    client = get_paddle_client()
    discount_id: Optional[str] = None
    try:
        existing = await client.list_discounts(code=code, status=["active"], mode="custom")
        discount_id = _extract_discount_id_from_list(existing)
    except PaddleAPIError as exc:
        logger.warning(
            "pricing_v2.discount_lookup_failed",
            extra={"code": code, "error": str(exc), "detail": exc.details},
        )
    if discount_id:
        return discount_id
    payload = {
        "amount": str(amount_cents),
        "currency_code": currency,
        "description": description,
        "enabled_for_checkout": False,
        "mode": "custom",
        "type": "flat",
        "code": code,
        "custom_data": {"reason": "rounding_adjustment", "amount_cents": amount_cents, "currency": currency},
    }
    response = await client.create_discount(payload)
    discount_id = _extract_discount_id(response)
    if not discount_id:
        logger.error("pricing_v2.discount_create_missing_id", extra={"code": code, "payload": payload})
        raise PricingValidationError(
            {"message": "Unable to create rounding discount", "code": "discount_create_failed"},
            status_code=500,
        )
    return discount_id


@router.post("/transactions", response_model=PricingTransactionResponse)
async def create_transaction_v2(
    payload: PricingTransactionRequest,
    user: AuthContext = Depends(get_current_user),
) -> PricingTransactionResponse:
    if payload.metadata:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="metadata is not supported; use custom_data")
    try:
        config = get_pricing_config_v2()
        _validate_mode_interval(payload.mode, payload.interval)
        validate_quantity_v2(payload.quantity, config)
        if payload.price_id:
            tier = get_pricing_tier_by_price_id_v2(payload.price_id)
            if not tier:
                raise PricingValidationError({"message": "Unknown price_id", "code": "price_id_invalid"})
            if tier.mode != payload.mode or tier.interval != payload.interval:
                raise PricingValidationError(
                    {"message": "price_id does not match mode/interval", "code": "price_id_mismatch"}
                )
        else:
            tier = select_pricing_tier_v2(payload.quantity, payload.mode, payload.interval, config)
    except PricingValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    except Exception as exc:  # noqa: BLE001
        logger.error("pricing_v2.transaction_validation_failed", extra={"error": str(exc)})
        raise HTTPException(status_code=500, detail="Pricing unavailable") from exc

    totals = compute_pricing_totals_v2(payload.quantity, tier, config)
    items = [TransactionItem(price_id=tier.paddle_price_id, quantity=totals.base_units)]
    increment_price_id = tier.increment_price_id
    if totals.increment_units > 0:
        if not increment_price_id:
            logger.error(
                "pricing_v2.increment_price_missing",
                extra={"price_id": tier.paddle_price_id, "quantity": payload.quantity},
            )
            raise PricingValidationError(
                {"message": "Increment pricing not configured", "code": "increment_price_missing"},
                status_code=500,
            )
        items.append(TransactionItem(price_id=increment_price_id, quantity=totals.increment_units))
    discount_id: Optional[str] = None
    if totals.rounding_adjustment_cents != 0:
        description = _rounding_description(config.metadata, totals.rounding_adjustment_cents)
        if totals.rounding_adjustment_cents > 0:
            product_id = await _resolve_product_id_for_price(tier.paddle_price_id)
            items.append(
                _build_rounding_fee_item(
                    totals.rounding_adjustment_cents,
                    tier.currency,
                    product_id,
                    description,
                )
            )
        else:
            discount_id = await _get_rounding_discount_id(
                abs(totals.rounding_adjustment_cents),
                tier.currency,
                description,
                config.metadata,
            )
    try:
        customer_id, address_id = await _resolve_customer_and_address(user)
        client = get_paddle_client()
        transaction = await client.create_transaction(
            CreateTransactionRequest(
                customer_id=customer_id,
                address_id=address_id,
                items=items,
                custom_data={**(payload.custom_data or {}), "supabase_user_id": user.user_id},
                discount_id=discount_id,
            )
        )
    except PricingValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    except PaddleAPIError as exc:
        logger.error("pricing_v2.transaction_paddle_failed", extra={"status_code": exc.status_code, "detail": exc.details})
        raise HTTPException(status_code=exc.status_code, detail="Unable to create checkout session") from exc
    except Exception as exc:  # noqa: BLE001
        logger.error("pricing_v2.transaction_failed", extra={"error": str(exc)})
        raise HTTPException(status_code=500, detail="Unable to create checkout session") from exc
    logger.info(
        "pricing_v2.transaction_created",
        extra={
            "user_id": user.user_id,
            "transaction_id": transaction.id,
            "price_id": tier.paddle_price_id,
            "quantity": payload.quantity,
        },
    )
    return PricingTransactionResponse(id=transaction.id, status=transaction.status)
