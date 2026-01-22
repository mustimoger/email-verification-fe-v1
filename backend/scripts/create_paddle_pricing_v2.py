"""
Create Paddle v2 base + increment prices for each pricing_v2 tier.

Usage:
    source ../.venv/bin/activate
    PYTHONPATH=backend python backend/scripts/create_paddle_pricing_v2.py

Optional:
    --environment sandbox|production
    --api-url https://sandbox-api.paddle.com
    --api-key pdl_...
    --price-status active,archived
    --catalog pricing_v2
    --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.paddle.client import PaddleAPIClient, PaddleAPIError  # noqa: E402
from app.paddle.config import PaddleEnvironmentConfig  # noqa: E402
from app.services.pricing_v2 import (  # noqa: E402
    PricingTierV2,
    format_decimal,
    get_pricing_config_v2,
    list_pricing_tiers_v2,
    _resolve_segment_amounts,
)
from app.services.supabase_client import get_supabase  # noqa: E402

logger = logging.getLogger("create_paddle_pricing_v2")


@dataclass(frozen=True)
class PriceKey:
    mode: str
    interval: str
    min_quantity: int
    max_quantity: Optional[int]
    role: str


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


def _load_dotenv_file(path: Path) -> int:
    if not path.exists():
        return 0
    loaded = 0
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        key, value = _split_env_line(line)
        if not key:
            continue
        if key not in os.environ:
            os.environ[key] = value
            loaded += 1
    return loaded


def _split_env_line(line: str) -> tuple[Optional[str], str]:
    if "=" not in line:
        return None, ""
    key, raw_value = line.split("=", 1)
    key = key.strip()
    if not key:
        return None, ""
    value = raw_value.strip()
    value = _strip_inline_comment(value)
    if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
        value = value[1:-1]
    return key, value


def _strip_inline_comment(value: str) -> str:
    in_single = False
    in_double = False
    for idx, char in enumerate(value):
        if char == "'" and not in_double:
            in_single = not in_single
        elif char == '"' and not in_single:
            in_double = not in_double
        elif char == "#" and not in_single and not in_double:
            if idx == 0 or value[idx - 1].isspace():
                return value[:idx].rstrip()
    return value


def load_dotenv() -> None:
    loaded = 0
    loaded += _load_dotenv_file(REPO_ROOT / ".env")
    loaded += _load_dotenv_file(BACKEND_ROOT / ".env")
    logger.info("create_paddle_pricing_v2.env_loaded", extra={"loaded": loaded})


def _parse_csv_list(value: Optional[str]) -> Optional[List[str]]:
    if not value:
        return None
    return [item.strip() for item in value.split(",") if item.strip()]


def _extract_list(payload: Dict[str, Any], keys: Iterable[str]) -> List[Dict[str, Any]]:
    for key in keys:
        value = payload.get(key)
        if isinstance(value, list):
            return value
    return []


def _extract_after_from_url(value: str) -> Optional[str]:
    try:
        parsed = urlparse(value)
    except Exception:  # noqa: BLE001
        return None
    qs = parse_qs(parsed.query)
    after_values = qs.get("after")
    if after_values:
        return str(after_values[0])
    return None


def _normalize_next_cursor(value: Any) -> Optional[str]:
    if not value:
        return None
    cursor_str = str(value)
    if cursor_str.startswith("http"):
        return _extract_after_from_url(cursor_str)
    return cursor_str


def _extract_next_cursor(payload: Dict[str, Any]) -> Optional[str]:
    meta = payload.get("meta")
    if isinstance(meta, dict):
        pagination = meta.get("pagination")
        if isinstance(pagination, dict):
            next_cursor = _normalize_next_cursor(pagination.get("next"))
            if next_cursor:
                return next_cursor
        next_cursor = _normalize_next_cursor(meta.get("next"))
        if next_cursor:
            return next_cursor
    return _normalize_next_cursor(payload.get("next"))


def _extract_custom_data(payload: Dict[str, Any]) -> Dict[str, Any]:
    custom = payload.get("custom_data") or payload.get("customData") or {}
    return custom if isinstance(custom, dict) else {}


def _extract_unit_price(payload: Dict[str, Any]) -> Dict[str, Any]:
    unit_price = payload.get("unit_price") or payload.get("unitPrice") or {}
    return unit_price if isinstance(unit_price, dict) else {}


def _extract_price_role(custom_data: Dict[str, Any]) -> Optional[str]:
    value = custom_data.get("price_role") or custom_data.get("priceRole")
    if not value:
        return None
    normalized = str(value).strip().lower()
    if normalized in {"base", "increment"}:
        return normalized
    return None


def _coerce_int(value: Any) -> Optional[int]:
    try:
        return int(value)
    except Exception:  # noqa: BLE001
        return None


async def _fetch_all(
    fetch_fn,
    item_keys: Iterable[str],
    **kwargs: Any,
) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    after: Optional[str] = None
    seen: set[str] = set()
    while True:
        payload = await fetch_fn(after=after, **kwargs)
        batch = _extract_list(payload, item_keys)
        items.extend(batch)
        next_cursor = _extract_next_cursor(payload)
        if not next_cursor or next_cursor in seen:
            break
        seen.add(next_cursor)
        after = next_cursor
    return items


def _resolve_environment(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = value.strip().lower()
    if normalized in {"sandbox", "production"}:
        return normalized
    return None


def _load_api_config(environment: str, api_url: Optional[str], api_key: Optional[str]) -> Optional[PaddleEnvironmentConfig]:
    if (api_url and not api_key) or (api_key and not api_url):
        logger.error(
            "create_paddle_pricing_v2.partial_api_override",
            extra={"api_url": bool(api_url), "api_key": bool(api_key)},
        )
        return None
    if api_url and api_key:
        return PaddleEnvironmentConfig(api_url=api_url, api_key=api_key)
    if environment == "production":
        env_url = os.getenv("PADDLE_BILLING_PRODUCTION_API_URL")
        env_key = os.getenv("PADDLE_BILLING_PRODUCTION_API_KEY")
        return PaddleEnvironmentConfig(api_url=env_url or "", api_key=env_key or "")
    env_url = os.getenv("PADDLE_BILLING_SANDBOX_API_URL")
    env_key = os.getenv("PADDLE_BILLING_SANDBOX_API_KEY")
    return PaddleEnvironmentConfig(api_url=env_url or "", api_key=env_key or "")


def _to_cents(amount: Decimal) -> int:
    return int((amount * Decimal(100)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _tier_key(tier: PricingTierV2, role: str) -> PriceKey:
    return PriceKey(
        mode=tier.mode,
        interval=tier.interval,
        min_quantity=tier.min_quantity,
        max_quantity=tier.max_quantity,
        role=role,
    )


def _price_lookup_key(custom_data: Dict[str, Any], role: str) -> Optional[PriceKey]:
    min_quantity = _coerce_int(custom_data.get("min_quantity"))
    max_quantity = _coerce_int(custom_data.get("max_quantity"))
    if min_quantity is None or max_quantity is None:
        return None
    mode = custom_data.get("mode")
    interval = custom_data.get("interval")
    if not mode or not interval:
        return None
    return PriceKey(
        mode=str(mode),
        interval=str(interval),
        min_quantity=min_quantity,
        max_quantity=max_quantity,
        role=role,
    )


def _load_mode_intervals() -> List[Tuple[str, str]]:
    sb = get_supabase()
    rows = (
        sb.table("billing_pricing_tiers_v2")
        .select("mode,interval")
        .eq("status", "active")
        .execute()
    ).data or []
    combos = {(str(row["mode"]), str(row["interval"])) for row in rows if row.get("mode") and row.get("interval")}
    return sorted(combos)


def _resolve_product_id(price_by_id: Dict[str, Dict[str, Any]], price_id: str) -> Optional[str]:
    price = price_by_id.get(price_id)
    if not price:
        return None
    product_id = price.get("product_id") or price.get("productId")
    return str(product_id) if product_id else None


def _resolve_price_type(price_by_id: Dict[str, Dict[str, Any]], price_id: str) -> Optional[str]:
    price = price_by_id.get(price_id)
    if not price:
        return None
    price_type = price.get("type")
    return str(price_type) if price_type else None


def _resolve_tax_mode(price_by_id: Dict[str, Dict[str, Any]], price_id: str) -> Optional[str]:
    price = price_by_id.get(price_id)
    if not price:
        return None
    tax_mode = price.get("tax_mode") or price.get("taxMode")
    return str(tax_mode) if tax_mode else None


def _resolve_currency(price_by_id: Dict[str, Dict[str, Any]], price_id: str) -> Optional[str]:
    price = price_by_id.get(price_id)
    if not price:
        return None
    unit_price = _extract_unit_price(price)
    currency = unit_price.get("currency_code") or unit_price.get("currencyCode")
    return str(currency) if currency else None


def _build_description(tier: PricingTierV2, role: str) -> str:
    max_display = str(tier.max_quantity) if tier.max_quantity is not None else "plus"
    return f"Pricing v2 {tier.mode} {tier.interval} {role} ({tier.min_quantity}-{max_display})"


def _build_custom_data(
    tier: PricingTierV2,
    role: str,
    catalog: str,
    unit_amount: Decimal,
    unit_amount_cents: int,
    pricing_source: Optional[str],
) -> Dict[str, Any]:
    custom_data: Dict[str, Any] = {
        "catalog": catalog,
        "mode": tier.mode,
        "interval": tier.interval,
        "min_quantity": tier.min_quantity,
        "max_quantity": tier.max_quantity,
        "credits_per_unit": tier.credits_per_unit,
        "price_role": role,
        "unit_amount_raw": format_decimal(unit_amount),
        "unit_amount_cents": unit_amount_cents,
    }
    if pricing_source:
        custom_data["pricing_source"] = pricing_source
    return custom_data


def _build_price_payload(
    tier: PricingTierV2,
    role: str,
    unit_amount: Decimal,
    unit_amount_cents: int,
    product_id: str,
    currency: str,
    catalog: str,
    pricing_source: Optional[str],
    price_type: Optional[str],
    tax_mode: Optional[str],
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "product_id": product_id,
        "description": _build_description(tier, role),
        "unit_price": {"amount": str(unit_amount_cents), "currency_code": currency},
        "custom_data": _build_custom_data(tier, role, catalog, unit_amount, unit_amount_cents, pricing_source),
    }
    if tier.interval != "one_time":
        payload["billing_cycle"] = {"interval": tier.interval, "frequency": 1}
    if price_type:
        payload["type"] = price_type
    if tax_mode:
        payload["tax_mode"] = tax_mode
    return payload


async def run_create(
    environment: str,
    api_url: Optional[str],
    api_key: Optional[str],
    price_status: Optional[List[str]],
    catalog: str,
    dry_run: bool,
) -> int:
    env_config = _load_api_config(environment, api_url, api_key)
    if not env_config or not env_config.api_url or not env_config.api_key:
        logger.error("create_paddle_pricing_v2.missing_api_config", extra={"environment": environment})
        return 1

    logger.info("create_paddle_pricing_v2.start", extra={"env": environment, "catalog": catalog})
    client = PaddleAPIClient(env=env_config)
    try:
        prices = await _fetch_all(
            client.list_prices,
            item_keys=("data", "prices"),
            status=price_status,
        )
    except PaddleAPIError as exc:
        logger.error(
            "create_paddle_pricing_v2.paddle_error",
            extra={"status_code": exc.status_code, "details": exc.details},
        )
        return 1

    price_by_id = {str(price["id"]): price for price in prices if price.get("id")}
    existing: Dict[PriceKey, Dict[str, Any]] = {}
    for price in prices:
        price_id = price.get("id")
        if not price_id:
            continue
        custom_data = _extract_custom_data(price)
        if custom_data.get("catalog") != catalog:
            continue
        role = _extract_price_role(custom_data)
        if not role:
            continue
        key = _price_lookup_key(custom_data, role)
        if not key:
            continue
        existing[key] = price

    config = get_pricing_config_v2()
    pricing_source = config.metadata.get("pricing_source") if isinstance(config.metadata, dict) else None
    mode_intervals = _load_mode_intervals()
    if not mode_intervals:
        logger.error("create_paddle_pricing_v2.no_tiers")
        return 1

    created = 0
    mismatched = 0
    skipped = 0
    for mode, interval in mode_intervals:
        tiers = list_pricing_tiers_v2(mode, interval)
        for tier in tiers:
            base_amount, increment_amount = _resolve_segment_amounts(config, tier)
            base_cents = _to_cents(base_amount)
            increment_cents = _to_cents(increment_amount)

            product_id = _resolve_product_id(price_by_id, tier.paddle_price_id)
            if not product_id:
                logger.error(
                    "create_paddle_pricing_v2.product_missing",
                    extra={"price_id": tier.paddle_price_id, "mode": mode, "interval": interval},
                )
                return 1
            currency = _resolve_currency(price_by_id, tier.paddle_price_id) or config.currency
            price_type = _resolve_price_type(price_by_id, tier.paddle_price_id)
            tax_mode = _resolve_tax_mode(price_by_id, tier.paddle_price_id)

            for role, amount, amount_cents in (
                ("base", base_amount, base_cents),
                ("increment", increment_amount, increment_cents),
            ):
                key = _tier_key(tier, role)
                existing_price = existing.get(key)
                if existing_price:
                    unit_price = _extract_unit_price(existing_price)
                    existing_amount = _coerce_int(unit_price.get("amount"))
                    if existing_amount is not None and existing_amount != amount_cents:
                        logger.error(
                            "create_paddle_pricing_v2.amount_mismatch",
                            extra={
                                "key": key,
                                "existing": existing_amount,
                                "expected": amount_cents,
                            },
                        )
                        mismatched += 1
                    else:
                        skipped += 1
                    continue

                payload = _build_price_payload(
                    tier,
                    role,
                    amount,
                    amount_cents,
                    product_id,
                    currency,
                    catalog,
                    pricing_source,
                    price_type,
                    tax_mode,
                )
                logger.info(
                    "create_paddle_pricing_v2.create_price",
                    extra={"key": key, "amount_cents": amount_cents, "currency": currency},
                )
                if dry_run:
                    continue
                try:
                    response = await client.create_price(payload)
                except PaddleAPIError as exc:
                    logger.error(
                        "create_paddle_pricing_v2.create_failed",
                        extra={"key": key, "status_code": exc.status_code, "details": exc.details},
                    )
                    return 1
                created += 1
                created_id = (response.get("data") or {}).get("id") if isinstance(response, dict) else None
                logger.info(
                    "create_paddle_pricing_v2.created",
                    extra={"key": key, "price_id": created_id},
                )

    if mismatched:
        logger.error("create_paddle_pricing_v2.amount_mismatch_total", extra={"count": mismatched})
        return 1

    logger.info(
        "create_paddle_pricing_v2.complete",
        extra={"created_count": created, "skipped_count": skipped, "dry_run": dry_run},
    )
    return 0


def main() -> None:
    setup_logging()
    load_dotenv()
    parser = argparse.ArgumentParser(description="Create Paddle prices for pricing_v2 tiers (base + increment).")
    parser.add_argument(
        "--environment",
        help="Paddle environment: sandbox or production. Defaults to PADDLE_STATUS env.",
    )
    parser.add_argument("--api-url", help="Override Paddle API base URL (optional).")
    parser.add_argument("--api-key", help="Override Paddle API key (optional).")
    parser.add_argument(
        "--price-status",
        help="Comma-separated price statuses to include when resolving existing prices (e.g., active,archived).",
    )
    parser.add_argument(
        "--catalog",
        default="pricing_v2",
        help="Custom data catalog name to create prices for (default: pricing_v2).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Log payloads without creating Paddle prices.")
    args = parser.parse_args()

    environment = _resolve_environment(args.environment or os.getenv("PADDLE_STATUS"))
    if not environment:
        logger.error("create_paddle_pricing_v2.invalid_environment", extra={"environment": args.environment})
        sys.exit(1)

    price_status = _parse_csv_list(args.price_status)
    if not price_status:
        price_status = ["active", "archived"]
        logger.info("create_paddle_pricing_v2.price_status_default", extra={"status": ",".join(price_status)})

    exit_code = asyncio.run(
        run_create(environment, args.api_url, args.api_key, price_status, args.catalog, args.dry_run)
    )
    if exit_code != 0:
        logger.error("create_paddle_pricing_v2.failed", extra={"exit_code": exit_code})
        sys.exit(exit_code)


if __name__ == "__main__":
    main()
