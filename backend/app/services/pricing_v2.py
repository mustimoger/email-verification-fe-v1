from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Dict, List, Optional

from .supabase_client import get_supabase

logger = logging.getLogger(__name__)


class PricingValidationError(Exception):
    def __init__(self, detail: Dict[str, Any], status_code: int = 400) -> None:
        super().__init__(detail.get("message", "Pricing validation failed"))
        self.detail = detail
        self.status_code = status_code


@dataclass(frozen=True)
class PricingConfigV2:
    currency: str
    min_volume: int
    max_volume: int
    step_size: int
    rounding_rule: Optional[str]
    metadata: Dict[str, Any]


@dataclass(frozen=True)
class PricingTierV2:
    mode: str
    interval: str
    min_quantity: int
    max_quantity: Optional[int]
    unit_amount: Decimal
    currency: str
    credits_per_unit: int
    paddle_price_id: str
    metadata: Dict[str, Any]
    sort_order: Optional[int]


@dataclass(frozen=True)
class PricingTotalsV2:
    units: int
    raw_total: Decimal
    rounded_total: Decimal
    paddle_total: Decimal
    rounding_adjustment: Decimal
    rounding_adjustment_cents: int


def get_pricing_config_v2(status: str = "active") -> PricingConfigV2:
    sb = get_supabase()
    result = sb.table("billing_pricing_config_v2").select("*").eq("status", status).execute()
    rows = result.data or []
    if not rows:
        logger.error("pricing_v2.config_missing", extra={"status": status})
        raise RuntimeError("Pricing configuration not available")
    if len(rows) > 1:
        logger.error("pricing_v2.config_not_unique", extra={"status": status, "count": len(rows)})
    row = rows[0]
    try:
        config = PricingConfigV2(
            currency=str(row.get("currency") or ""),
            min_volume=int(row.get("min_volume")),
            max_volume=int(row.get("max_volume")),
            step_size=int(row.get("step_size")),
            rounding_rule=row.get("rounding_rule"),
            metadata=row.get("metadata") if isinstance(row.get("metadata"), dict) else {},
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("pricing_v2.config_invalid", extra={"error": str(exc), "row": row})
        raise RuntimeError("Pricing configuration invalid") from exc
    if not config.currency:
        logger.error("pricing_v2.config_currency_missing")
        raise RuntimeError("Pricing configuration missing currency")
    return config


def list_pricing_tiers_v2(mode: str, interval: str, status: str = "active") -> List[PricingTierV2]:
    sb = get_supabase()
    result = (
        sb.table("billing_pricing_tiers_v2")
        .select("*")
        .eq("status", status)
        .eq("mode", mode)
        .eq("interval", interval)
        .order("sort_order")
        .execute()
    )
    rows = result.data or []
    tiers: List[PricingTierV2] = []
    for row in rows:
        try:
            tiers.append(_parse_tier_row(row))
        except Exception as exc:  # noqa: BLE001
            logger.error("pricing_v2.tier_invalid", extra={"error": str(exc), "row": row})
    return tiers


def get_pricing_tier_by_price_id_v2(price_id: str, status: str = "active") -> Optional[PricingTierV2]:
    sb = get_supabase()
    result = (
        sb.table("billing_pricing_tiers_v2")
        .select("*")
        .eq("status", status)
        .eq("paddle_price_id", price_id)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if not rows:
        return None
    try:
        return _parse_tier_row(rows[0])
    except Exception as exc:  # noqa: BLE001
        logger.error("pricing_v2.tier_by_price_id_invalid", extra={"error": str(exc), "price_id": price_id})
        return None


def validate_quantity_v2(quantity: int, config: PricingConfigV2) -> None:
    if quantity < config.min_volume:
        raise PricingValidationError(
            {
                "message": "Quantity below minimum",
                "code": "below_minimum",
                "min_quantity": config.min_volume,
            }
        )
    if quantity > config.max_volume:
        raise PricingValidationError(
            {
                "message": "Quantity exceeds maximum",
                "code": "above_maximum",
                "max_quantity": config.max_volume,
                "contact_required": True,
            }
        )
    if config.step_size <= 0:
        raise PricingValidationError(
            {
                "message": "Invalid pricing step size",
                "code": "invalid_step",
            },
            status_code=500,
        )
    if quantity % config.step_size != 0:
        raise PricingValidationError(
            {
                "message": "Quantity must align with step size",
                "code": "invalid_step",
                "step_size": config.step_size,
            }
        )


def select_pricing_tier_v2(
    quantity: int,
    mode: str,
    interval: str,
    config: PricingConfigV2,
) -> PricingTierV2:
    tiers = list_pricing_tiers_v2(mode, interval)
    if not tiers:
        logger.error("pricing_v2.tiers_missing", extra={"mode": mode, "interval": interval})
        raise PricingValidationError(
            {"message": "Pricing tiers not configured", "code": "tiers_missing"},
            status_code=500,
        )
    _validate_tiers(tiers, config)
    for tier in tiers:
        max_quantity = tier.max_quantity
        if max_quantity is None and quantity >= tier.min_quantity:
            return tier
        if max_quantity is not None and tier.min_quantity <= quantity <= max_quantity:
            return tier
    raise PricingValidationError({"message": "No tier found for quantity", "code": "tier_not_found"})


def compute_pricing_totals_v2(quantity: int, tier: PricingTierV2) -> PricingTotalsV2:
    credits_per_unit = tier.credits_per_unit
    if credits_per_unit <= 0:
        raise PricingValidationError(
            {"message": "Invalid credits per unit", "code": "invalid_credits_per_unit"},
            status_code=500,
        )
    if quantity % credits_per_unit != 0:
        raise PricingValidationError(
            {"message": "Quantity does not align with tier unit size", "code": "invalid_step"},
        )
    units = quantity // credits_per_unit
    raw_total = (tier.unit_amount * Decimal(units)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
    rounded_total = raw_total.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    paddle_unit_cents = _extract_paddle_unit_cents(tier)
    paddle_total = (Decimal(paddle_unit_cents) * Decimal(units) / Decimal(100)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    rounding_adjustment = rounded_total - paddle_total
    adjustment_cents = int((rounding_adjustment * Decimal(100)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return PricingTotalsV2(
        units=units,
        raw_total=raw_total,
        rounded_total=rounded_total,
        paddle_total=paddle_total,
        rounding_adjustment=rounding_adjustment,
        rounding_adjustment_cents=adjustment_cents,
    )


def format_decimal(value: Decimal) -> str:
    normalized = value.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
    raw = format(normalized, "f")
    if "." in raw:
        raw = raw.rstrip("0").rstrip(".")
    return raw or "0"


def _parse_tier_row(row: Dict[str, Any]) -> PricingTierV2:
    unit_amount_raw = row.get("unit_amount")
    try:
        unit_amount = Decimal(str(unit_amount_raw))
    except (InvalidOperation, TypeError) as exc:
        raise ValueError(f"Invalid unit_amount: {unit_amount_raw}") from exc
    paddle_price_id = row.get("paddle_price_id")
    if not paddle_price_id:
        raise ValueError("Missing paddle_price_id")
    metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
    return PricingTierV2(
        mode=str(row.get("mode")),
        interval=str(row.get("interval")),
        min_quantity=int(row.get("min_quantity")),
        max_quantity=row.get("max_quantity"),
        unit_amount=unit_amount,
        currency=str(row.get("currency") or ""),
        credits_per_unit=int(row.get("credits_per_unit")),
        paddle_price_id=str(paddle_price_id),
        metadata=metadata,
        sort_order=row.get("sort_order"),
    )


def _extract_paddle_unit_cents(tier: PricingTierV2) -> int:
    metadata = tier.metadata or {}
    custom = metadata.get("paddle_custom_data") if isinstance(metadata.get("paddle_custom_data"), dict) else {}
    for key in ("unit_amount_cents", "unitAmountCents"):
        value = custom.get(key)
        if value is not None:
            try:
                return int(value)
            except (TypeError, ValueError) as exc:
                logger.error(
                    "pricing_v2.unit_amount_cents_invalid",
                    extra={"value": value, "price_id": tier.paddle_price_id, "error": str(exc)},
                )
    try:
        return int((tier.unit_amount * Decimal(100)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "pricing_v2.unit_amount_cents_fallback_failed",
            extra={"price_id": tier.paddle_price_id, "error": str(exc)},
        )
        raise PricingValidationError(
            {"message": "Unable to determine unit price for Paddle", "code": "unit_price_missing"},
            status_code=500,
        ) from exc


def _validate_tiers(tiers: List[PricingTierV2], config: PricingConfigV2) -> None:
    sorted_tiers = sorted(tiers, key=lambda tier: tier.min_quantity)
    first = sorted_tiers[0]
    if first.min_quantity != config.min_volume:
        logger.error(
            "pricing_v2.tiers_min_mismatch",
            extra={"expected": config.min_volume, "actual": first.min_quantity},
        )
        raise PricingValidationError(
            {"message": "Pricing tiers do not match minimum volume", "code": "tiers_min_mismatch"},
            status_code=500,
        )
    previous_max: Optional[int] = None
    for tier in sorted_tiers:
        if tier.max_quantity is not None and tier.max_quantity < tier.min_quantity:
            raise PricingValidationError(
                {"message": "Pricing tier has invalid range", "code": "tier_range_invalid"},
                status_code=500,
            )
        if previous_max is not None:
            expected_min = previous_max + 1
            if tier.min_quantity != expected_min:
                logger.error(
                    "pricing_v2.tiers_gap_or_overlap",
                    extra={"expected_min": expected_min, "actual_min": tier.min_quantity},
                )
                raise PricingValidationError(
                    {"message": "Pricing tiers are not contiguous", "code": "tiers_not_contiguous"},
                    status_code=500,
                )
        previous_max = tier.max_quantity
    if previous_max is not None and previous_max != config.max_volume:
        logger.error(
            "pricing_v2.tiers_max_mismatch",
            extra={"expected": config.max_volume, "actual": previous_max},
        )
        raise PricingValidationError(
            {"message": "Pricing tiers do not match maximum volume", "code": "tiers_max_mismatch"},
            status_code=500,
        )
