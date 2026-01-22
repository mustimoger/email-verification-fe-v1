"""
Sync Paddle v2 pricing catalog into Supabase billing_pricing_tiers_v2.

Usage:
    source ../.venv/bin/activate
    PYTHONPATH=backend python backend/scripts/sync_paddle_pricing_v2.py

Optional:
    --environment sandbox|production
    --api-url https://sandbox-api.paddle.com
    --api-key pdl_...
    --price-status active,archived
    --catalog pricing_v2
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.paddle.client import PaddleAPIClient, PaddleAPIError  # noqa: E402
from app.paddle.config import PaddleEnvironmentConfig  # noqa: E402
from app.services.pricing_v2 import format_decimal  # noqa: E402
from app.services.supabase_client import get_supabase  # noqa: E402

logger = logging.getLogger("sync_paddle_pricing_v2")


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
    logger.info("sync_paddle_pricing_v2.env_loaded", extra={"loaded": loaded})


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
        extracted = _extract_after_from_url(cursor_str)
        if not extracted:
            logger.warning("sync_paddle_pricing_v2.next_cursor_unparsed", extra={"value": cursor_str})
            return None
        return extracted
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


def _coerce_int(value: Any, field: str, price_id: str) -> Optional[int]:
    try:
        return int(value)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "sync_paddle_pricing_v2.invalid_int",
            extra={"field": field, "price_id": price_id, "value": value, "error": str(exc)},
        )
        return None


def _coerce_decimal(value: Any, field: str, price_id: str) -> Optional[Decimal]:
    try:
        return Decimal(str(value)).quantize(Decimal("0.0001"))
    except (InvalidOperation, TypeError) as exc:
        logger.error(
            "sync_paddle_pricing_v2.invalid_decimal",
            extra={"field": field, "price_id": price_id, "value": value, "error": str(exc)},
        )
        return None


def _resolve_unit_amount_decimal(payload: Dict[str, Any], custom_data: Dict[str, Any], price_id: str) -> Optional[Decimal]:
    unit_amount_raw = custom_data.get("unit_amount_raw") or custom_data.get("unitAmountRaw")
    if unit_amount_raw is not None:
        unit_amount_decimal = _coerce_decimal(unit_amount_raw, "unit_amount_raw", price_id)
        if unit_amount_decimal is not None:
            return unit_amount_decimal
    unit_amount_cents = custom_data.get("unit_amount_cents") or custom_data.get("unitAmountCents")
    if unit_amount_cents is not None:
        amount_cents = _coerce_int(unit_amount_cents, "unit_amount_cents", price_id)
        if amount_cents is not None:
            return (Decimal(amount_cents) / Decimal(100)).quantize(Decimal("0.0001"))
    unit_price = _extract_unit_price(payload)
    amount = _coerce_int(unit_price.get("amount"), "amount", price_id)
    if amount is None:
        return None
    return (Decimal(amount) / Decimal(100)).quantize(Decimal("0.0001"))


def _resolve_unit_amount_cents(payload: Dict[str, Any], custom_data: Dict[str, Any], price_id: str) -> Optional[int]:
    unit_amount_cents = custom_data.get("unit_amount_cents") or custom_data.get("unitAmountCents")
    if unit_amount_cents is not None:
        return _coerce_int(unit_amount_cents, "unit_amount_cents", price_id)
    unit_price = _extract_unit_price(payload)
    return _coerce_int(unit_price.get("amount"), "amount", price_id)


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
        logger.error("sync_paddle_pricing_v2.partial_api_override", extra={"api_url": bool(api_url), "api_key": bool(api_key)})
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


def _tier_key(mode: str, interval: str, min_qty: int, max_qty: Optional[int]) -> Tuple[str, str, int, Optional[int]]:
    return (mode, interval, min_qty, max_qty)


def _load_existing_tiers() -> Dict[Tuple[str, str, int, Optional[int]], Dict[str, Any]]:
    sb = get_supabase()
    result = (
        sb.table("billing_pricing_tiers_v2")
        .select("mode,interval,min_quantity,max_quantity,unit_amount,currency,credits_per_unit,sort_order,metadata")
        .execute()
    )
    rows = result.data or []
    existing: Dict[Tuple[str, str, int, Optional[int]], Dict[str, Any]] = {}
    for row in rows:
        key = _tier_key(row["mode"], row["interval"], row["min_quantity"], row.get("max_quantity"))
        existing[key] = row
    logger.info("sync_paddle_pricing_v2.existing_tiers_loaded", extra={"count": len(existing)})
    return existing


async def run_sync(
    environment: str,
    api_url: Optional[str],
    api_key: Optional[str],
    price_status: Optional[List[str]],
    catalog: str,
) -> int:
    env_config = _load_api_config(environment, api_url, api_key)
    if not env_config or not env_config.api_url or not env_config.api_key:
        logger.error("sync_paddle_pricing_v2.missing_api_config", extra={"environment": environment})
        return 1

    logger.info("sync_paddle_pricing_v2.start", extra={"env": environment, "catalog": catalog})
    client = PaddleAPIClient(env=env_config)
    try:
        prices = await _fetch_all(
            client.list_prices,
            item_keys=("data", "prices"),
            status=price_status,
        )
    except PaddleAPIError as exc:
        logger.error(
            "sync_paddle_pricing_v2.paddle_error",
            extra={"status_code": exc.status_code, "details": exc.details},
        )
        return 1

    existing = _load_existing_tiers()
    rows: List[Dict[str, Any]] = []
    skipped_prices = 0
    catalog_prices = 0
    role_skipped = 0
    duplicate_roles = 0
    missing_base = 0
    missing_increment = 0
    tier_updates: Dict[Tuple[str, str, int, Optional[int]], Dict[str, Optional[Dict[str, Any]]]] = {}

    for price in prices:
        price_id = price.get("id")
        if not price_id:
            logger.warning("sync_paddle_pricing_v2.price_missing_id", extra={"price": price})
            skipped_prices += 1
            continue

        price_custom = _extract_custom_data(price)
        if price_custom.get("catalog") != catalog:
            continue
        catalog_prices += 1

        price_role = _extract_price_role(price_custom)
        if not price_role:
            logger.info(
                "sync_paddle_pricing_v2.price_role_missing",
                extra={"price_id": price_id, "custom_data": price_custom},
            )
            role_skipped += 1
            continue

        mode = price_custom.get("mode")
        interval = price_custom.get("interval")
        if not mode or not interval:
            logger.error(
                "sync_paddle_pricing_v2.missing_mode_interval",
                extra={"price_id": price_id, "custom_data": price_custom},
            )
            skipped_prices += 1
            continue

        min_quantity = _coerce_int(price_custom.get("min_quantity"), "min_quantity", str(price_id))
        max_quantity = _coerce_int(price_custom.get("max_quantity"), "max_quantity", str(price_id))
        credits_per_unit = _coerce_int(price_custom.get("credits_per_unit"), "credits_per_unit", str(price_id))
        if min_quantity is None or max_quantity is None or credits_per_unit is None:
            skipped_prices += 1
            continue

        key = _tier_key(str(mode), str(interval), min_quantity, max_quantity)
        unit_amount_decimal = _resolve_unit_amount_decimal(price, price_custom, str(price_id))
        if unit_amount_decimal is None:
            skipped_prices += 1
            continue
        unit_amount_cents = _resolve_unit_amount_cents(price, price_custom, str(price_id))
        if unit_amount_cents is None:
            skipped_prices += 1
            continue

        unit_price = _extract_unit_price(price)
        currency = unit_price.get("currency_code") or unit_price.get("currencyCode")
        if not currency:
            logger.error("sync_paddle_pricing_v2.missing_currency", extra={"price_id": price_id})
            skipped_prices += 1
            continue

        status = price.get("status")
        if not status:
            logger.error("sync_paddle_pricing_v2.missing_status", extra={"price_id": price_id})
            skipped_prices += 1
            continue

        entry = tier_updates.setdefault(key, {"base": None, "increment": None})
        if entry.get(price_role):
            logger.warning(
                "sync_paddle_pricing_v2.duplicate_role",
                extra={"price_id": price_id, "role": price_role, "key": key},
            )
            duplicate_roles += 1
        entry[price_role] = {
            "price_id": str(price_id),
            "unit_amount": unit_amount_decimal,
            "unit_amount_cents": unit_amount_cents,
            "currency": str(currency),
            "credits_per_unit": credits_per_unit,
            "status": str(status),
            "custom_data": price_custom,
        }

    if catalog_prices == 0:
        logger.error("sync_paddle_pricing_v2.no_catalog_prices", extra={"catalog": catalog})
        return 1

    missing_tiers = [key for key in existing.keys() if key not in tier_updates]
    if missing_tiers:
        logger.error("sync_paddle_pricing_v2.missing_tier_prices", extra={"count": len(missing_tiers)})
        return 1

    for key, entry in tier_updates.items():
        existing_row = existing.get(key)
        if not existing_row:
            logger.error("sync_paddle_pricing_v2.tier_not_found", extra={"key": key})
            skipped_prices += 1
            continue

        base = entry.get("base")
        increment = entry.get("increment")
        if not base:
            logger.error("sync_paddle_pricing_v2.base_price_missing", extra={"key": key})
            missing_base += 1
            continue
        if not increment:
            logger.error("sync_paddle_pricing_v2.increment_price_missing", extra={"key": key})
            missing_increment += 1
            continue

        if base["currency"] != increment["currency"]:
            logger.error(
                "sync_paddle_pricing_v2.currency_mismatch",
                extra={"key": key, "base": base["currency"], "increment": increment["currency"]},
            )
            skipped_prices += 1
            continue

        existing_credits = existing_row.get("credits_per_unit")
        if existing_credits and existing_credits != base["credits_per_unit"]:
            logger.warning(
                "sync_paddle_pricing_v2.credits_per_unit_mismatch",
                extra={"key": key, "existing": existing_credits, "base": base["credits_per_unit"]},
            )

        sort_order = existing_row.get("sort_order")
        if sort_order is None:
            sort_order = _coerce_int(base["custom_data"].get("tier"), "tier", base["price_id"]) or key[2]

        metadata = dict(existing_row.get("metadata") or {})
        metadata["paddle_custom_data"] = base["custom_data"]
        metadata["increment_price_id"] = increment["price_id"]
        metadata["increment_unit_amount_cents"] = increment["unit_amount_cents"]
        now = datetime.now(timezone.utc).isoformat()
        rows.append(
            {
                "mode": key[0],
                "interval": key[1],
                "min_quantity": key[2],
                "max_quantity": key[3],
                "unit_amount": format_decimal(base["unit_amount"]),
                "currency": base["currency"],
                "credits_per_unit": existing_row.get("credits_per_unit") or base["credits_per_unit"],
                "paddle_price_id": base["price_id"],
                "status": base["status"],
                "sort_order": sort_order,
                "metadata": metadata,
                "updated_at": now,
            }
        )

    if not rows:
        logger.error("sync_paddle_pricing_v2.no_prices_to_sync")
        return 1

    if skipped_prices:
        logger.warning("sync_paddle_pricing_v2.skipped_prices", extra={"count": skipped_prices})
    if role_skipped:
        logger.info("sync_paddle_pricing_v2.price_role_skipped", extra={"count": role_skipped})
    if duplicate_roles:
        logger.warning("sync_paddle_pricing_v2.duplicate_roles", extra={"count": duplicate_roles})
    if missing_base or missing_increment:
        logger.error(
            "sync_paddle_pricing_v2.missing_roles",
            extra={"missing_base": missing_base, "missing_increment": missing_increment},
        )
        return 1

    sb = get_supabase()
    result = (
        sb.table("billing_pricing_tiers_v2")
        .upsert(rows, on_conflict="mode,interval,min_quantity,max_quantity")
        .execute()
    )
    synced = len(rows)
    logger.info("sync_paddle_pricing_v2.complete", extra={"synced": synced})
    logger.debug("sync_paddle_pricing_v2.supabase_result", extra={"result": result.data})
    return 0


def main() -> None:
    setup_logging()
    load_dotenv()
    parser = argparse.ArgumentParser(
        description="Sync Paddle catalog into Supabase billing_pricing_tiers_v2."
    )
    parser.add_argument(
        "--environment",
        help="Paddle environment: sandbox or production. Defaults to PADDLE_STATUS env.",
    )
    parser.add_argument("--api-url", help="Override Paddle API base URL (optional).")
    parser.add_argument("--api-key", help="Override Paddle API key (optional).")
    parser.add_argument(
        "--price-status",
        help="Comma-separated price statuses to include (e.g., active,archived).",
    )
    parser.add_argument(
        "--catalog",
        default="pricing_v2",
        help="Custom data catalog name to sync (default: pricing_v2).",
    )
    args = parser.parse_args()

    environment = _resolve_environment(args.environment or os.getenv("PADDLE_STATUS"))
    if not environment:
        logger.error("sync_paddle_pricing_v2.invalid_environment", extra={"environment": args.environment})
        sys.exit(1)

    price_status = _parse_csv_list(args.price_status)
    if not price_status:
        logger.info("sync_paddle_pricing_v2.price_status_default", extra={"status": "api_default"})

    exit_code = asyncio.run(
        run_sync(environment, args.api_url, args.api_key, price_status, args.catalog)
    )
    if exit_code != 0:
        logger.error("sync_paddle_pricing_v2.failed", extra={"exit_code": exit_code})
        sys.exit(exit_code)


if __name__ == "__main__":
    main()
