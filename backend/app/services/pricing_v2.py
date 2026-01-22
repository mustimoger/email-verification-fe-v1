from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_FLOOR, ROUND_HALF_UP
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
    free_trial_credits: Optional[int]
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
    increment_price_id: Optional[str]


@dataclass(frozen=True)
class PricingTotalsV2:
    base_units: int
    increment_units: int
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
        free_trial_raw = row.get("free_trial_credits")
        free_trial_credits: Optional[int] = None
        if free_trial_raw is not None:
            try:
                free_trial_credits = int(free_trial_raw)
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "pricing_v2.config_free_trial_invalid",
                    extra={"value": free_trial_raw, "error": str(exc)},
                )
        config = PricingConfigV2(
            currency=str(row.get("currency") or ""),
            min_volume=int(row.get("min_volume")),
            max_volume=int(row.get("max_volume")),
            step_size=int(row.get("step_size")),
            free_trial_credits=free_trial_credits,
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
    tiers = get_pricing_tiers_by_price_ids_v2([price_id], status=status)
    return tiers.get(price_id)


def get_pricing_tiers_by_price_ids_v2(price_ids: List[str], status: str = "active") -> Dict[str, PricingTierV2]:
    if not price_ids:
        return {}
    unique_ids = [str(price_id) for price_id in set(price_ids) if price_id]
    if not unique_ids:
        return {}
    sb = get_supabase()
    result = (
        sb.table("billing_pricing_tiers_v2")
        .select("*")
        .eq("status", status)
        .in_("paddle_price_id", unique_ids)
        .execute()
    )
    rows = result.data or []
    tiers: Dict[str, PricingTierV2] = {}
    for row in rows:
        try:
            tier = _parse_tier_row(row)
        except Exception as exc:  # noqa: BLE001
            logger.error("pricing_v2.tier_by_price_ids_invalid", extra={"error": str(exc), "row": row})
            continue
        tiers[tier.paddle_price_id] = tier
    remaining = {price_id for price_id in unique_ids if price_id not in tiers}
    if remaining:
        try:
            all_rows = (
                sb.table("billing_pricing_tiers_v2")
                .select("*")
                .eq("status", status)
                .execute()
            ).data or []
        except Exception as exc:  # noqa: BLE001
            logger.error("pricing_v2.tier_increment_lookup_failed", extra={"error": str(exc), "remaining": list(remaining)})
            return tiers
        for row in all_rows:
            try:
                tier = _parse_tier_row(row)
            except Exception as exc:  # noqa: BLE001
                logger.error("pricing_v2.tier_increment_invalid", extra={"error": str(exc), "row": row})
                continue
            increment_price_id = tier.increment_price_id
            if increment_price_id and increment_price_id in remaining:
                tiers[increment_price_id] = tier
    return tiers


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


def compute_pricing_totals_v2(quantity: int, tier: PricingTierV2, config: PricingConfigV2) -> PricingTotalsV2:
    credits_per_unit = tier.credits_per_unit
    if credits_per_unit <= 0:
        raise PricingValidationError(
            {"message": "Invalid credits per unit", "code": "invalid_credits_per_unit"},
            status_code=500,
        )
    if quantity < tier.min_quantity or (tier.max_quantity is not None and quantity > tier.max_quantity):
        raise PricingValidationError(
            {"message": "Quantity outside tier range", "code": "tier_quantity_invalid"},
        )
    if quantity % credits_per_unit != 0:
        raise PricingValidationError(
            {"message": "Quantity does not align with tier unit size", "code": "invalid_step"},
        )
    units = quantity // credits_per_unit
    segment_min = _resolve_segment_min_quantity(tier)
    increment_units = (quantity - segment_min) // credits_per_unit
    base_units = 1
    base_amount, increment_amount = _resolve_segment_amounts(config, tier)
    raw_total = (base_amount + increment_amount * Decimal(increment_units)).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )
    rounded_total = _apply_rounding_rule(raw_total, config.rounding_rule)
    base_unit_cents = _extract_base_unit_cents(tier)
    increment_unit_cents = _extract_increment_unit_cents(tier) if increment_units > 0 else 0
    paddle_total = (
        (Decimal(base_unit_cents) + Decimal(increment_unit_cents) * Decimal(increment_units)) / Decimal(100)
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    rounding_adjustment = rounded_total - paddle_total
    adjustment_cents = int((rounding_adjustment * Decimal(100)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return PricingTotalsV2(
        base_units=base_units,
        increment_units=increment_units,
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
    increment_price_id = _extract_increment_price_id(metadata)
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
        increment_price_id=increment_price_id,
    )


def _extract_base_unit_cents(tier: PricingTierV2) -> int:
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


def _extract_increment_unit_cents(tier: PricingTierV2) -> int:
    metadata = tier.metadata or {}
    for key in ("increment_unit_amount_cents", "incrementUnitAmountCents"):
        value = metadata.get(key)
        if value is not None:
            try:
                return int(value)
            except (TypeError, ValueError) as exc:
                logger.error(
                    "pricing_v2.increment_unit_cents_invalid",
                    extra={"value": value, "price_id": tier.paddle_price_id, "error": str(exc)},
                )
                raise PricingValidationError(
                    {"message": "Invalid increment unit price", "code": "increment_price_invalid"},
                    status_code=500,
                ) from exc
    logger.error(
        "pricing_v2.increment_unit_cents_missing",
        extra={"price_id": tier.paddle_price_id, "metadata_keys": list(metadata.keys())},
    )
    raise PricingValidationError(
        {"message": "Missing increment unit price", "code": "increment_price_missing"},
        status_code=500,
    )


def _extract_increment_price_id(metadata: Dict[str, Any]) -> Optional[str]:
    for key in ("increment_price_id", "incrementPriceId"):
        value = metadata.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _apply_rounding_rule(raw_total: Decimal, rounding_rule: Optional[str]) -> Decimal:
    normalized = (rounding_rule or "").strip().lower()
    if normalized in {"floor", "floor_whole_dollar"}:
        return raw_total.quantize(Decimal("1"), rounding=ROUND_FLOOR)
    logger.error(
        "pricing_v2.rounding_rule_invalid",
        extra={"rounding_rule": rounding_rule},
    )
    raise PricingValidationError(
        {"message": "Unsupported rounding rule", "code": "rounding_rule_invalid"},
        status_code=500,
    )


def _anchor_key_for_plan(mode: str, interval: str) -> Optional[str]:
    if mode == "payg" and interval == "one_time":
        return "payg"
    if mode == "subscription" and interval == "month":
        return "monthly"
    if mode == "subscription" and interval == "year":
        return "annual"
    return None


def _parse_anchor_prices(config: PricingConfigV2, mode: str, interval: str) -> Dict[int, Decimal]:
    metadata = config.metadata or {}
    anchors = metadata.get("anchors") if isinstance(metadata.get("anchors"), dict) else {}
    anchor_key = _anchor_key_for_plan(mode, interval)
    if not anchor_key:
        raise PricingValidationError(
            {"message": "Unsupported pricing plan", "code": "anchor_key_missing"},
            status_code=500,
        )
    plan_anchors = anchors.get(anchor_key)
    if not isinstance(plan_anchors, dict):
        raise PricingValidationError(
            {"message": "Pricing anchors missing", "code": "anchors_missing"},
            status_code=500,
        )
    parsed: Dict[int, Decimal] = {}
    for volume, price in plan_anchors.items():
        try:
            volume_int = int(volume)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "pricing_v2.anchor_volume_invalid",
                extra={"volume": volume, "error": str(exc)},
            )
            raise PricingValidationError(
                {"message": "Invalid anchor volume", "code": "anchor_volume_invalid"},
                status_code=500,
            ) from exc
        try:
            price_dec = Decimal(str(price))
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "pricing_v2.anchor_price_invalid",
                extra={"volume": volume_int, "price": price, "error": str(exc)},
            )
            raise PricingValidationError(
                {"message": "Invalid anchor price", "code": "anchor_price_invalid"},
                status_code=500,
            ) from exc
        parsed[volume_int] = price_dec
    if len(parsed) < 2:
        raise PricingValidationError(
            {"message": "Insufficient anchor points", "code": "anchors_insufficient"},
            status_code=500,
        )
    return parsed


def _resolve_segment_amounts(config: PricingConfigV2, tier: PricingTierV2) -> tuple[Decimal, Decimal]:
    anchors = _parse_anchor_prices(config, tier.mode, tier.interval)
    volumes = sorted(anchors.keys())
    if not volumes:
        raise PricingValidationError(
            {"message": "Pricing anchors missing", "code": "anchors_missing"},
            status_code=500,
        )
    credits_per_unit = tier.credits_per_unit
    if credits_per_unit <= 0:
        raise PricingValidationError(
            {"message": "Invalid credits per unit", "code": "invalid_credits_per_unit"},
            status_code=500,
        )
    segment_min = _resolve_segment_min_quantity(tier)
    if segment_min < volumes[0]:
        anchor_start = volumes[0]
        if len(volumes) < 2:
            raise PricingValidationError(
                {"message": "Insufficient anchor points", "code": "anchors_insufficient"},
                status_code=500,
            )
        anchor_end = volumes[1]
    else:
        anchor_start = max([volume for volume in volumes if volume <= segment_min], default=None)
        if anchor_start is None:
            logger.error(
                "pricing_v2.anchor_for_tier_missing",
                extra={"segment_min": segment_min, "anchors": volumes},
            )
            raise PricingValidationError(
                {"message": "Tier does not align with anchors", "code": "anchor_mismatch"},
                status_code=500,
            )
        idx = volumes.index(anchor_start)
        if idx + 1 >= len(volumes):
            logger.error(
                "pricing_v2.anchor_next_missing",
                extra={"segment_min": segment_min, "anchors": volumes},
            )
            raise PricingValidationError(
                {"message": "Missing anchor range", "code": "anchor_range_missing"},
                status_code=500,
            )
        anchor_end = volumes[idx + 1]
    if (anchor_end - anchor_start) % credits_per_unit != 0:
        logger.error(
            "pricing_v2.anchor_step_mismatch",
            extra={"anchor_start": anchor_start, "anchor_end": anchor_end, "credits_per_unit": credits_per_unit},
        )
        raise PricingValidationError(
            {"message": "Anchor range misaligned", "code": "anchor_step_mismatch"},
            status_code=500,
        )
    steps = (anchor_end - anchor_start) // credits_per_unit
    if steps <= 0:
        raise PricingValidationError(
            {"message": "Invalid anchor range", "code": "anchor_range_invalid"},
            status_code=500,
        )
    slope = (anchors[anchor_end] - anchors[anchor_start]) / Decimal(steps)
    base_steps = (segment_min - anchor_start) // credits_per_unit
    base_amount = anchors[anchor_start] + slope * Decimal(base_steps)
    return base_amount, slope


def _resolve_segment_min_quantity(tier: PricingTierV2) -> int:
    credits_per_unit = tier.credits_per_unit
    if credits_per_unit <= 0:
        raise PricingValidationError(
            {"message": "Invalid credits per unit", "code": "invalid_credits_per_unit"},
            status_code=500,
        )
    remainder = tier.min_quantity % credits_per_unit
    if remainder == 0:
        return tier.min_quantity
    aligned = tier.min_quantity - remainder
    logger.info(
        "pricing_v2.segment_min_aligned",
        extra={"min_quantity": tier.min_quantity, "aligned_min": aligned, "credits_per_unit": credits_per_unit},
    )
    return aligned


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
