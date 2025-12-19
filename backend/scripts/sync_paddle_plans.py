"""
Sync Paddle catalog (products/prices) into Supabase billing_plans.

Usage:
    source ../.venv/bin/activate
    PYTHONPATH=backend python backend/scripts/sync_paddle_plans.py

Optional:
    --environment sandbox|production
    --api-url https://sandbox-api.paddle.com
    --api-key pdl_...
    --product-status active,archived
    --price-status active,archived
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.paddle.client import PaddleAPIClient, PaddleAPIError  # noqa: E402
from app.paddle.config import PaddleEnvironmentConfig  # noqa: E402
from app.services.supabase_client import get_supabase  # noqa: E402

logger = logging.getLogger("sync_paddle_plans")


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


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


def _extract_next_cursor(payload: Dict[str, Any]) -> Optional[str]:
    meta = payload.get("meta")
    if isinstance(meta, dict):
        pagination = meta.get("pagination")
        if isinstance(pagination, dict):
            next_cursor = pagination.get("next")
            if next_cursor:
                return str(next_cursor)
        next_cursor = meta.get("next")
        if next_cursor:
            return str(next_cursor)
    next_cursor = payload.get("next")
    if next_cursor:
        return str(next_cursor)
    return None


def _extract_custom_data(payload: Dict[str, Any]) -> Dict[str, Any]:
    custom = payload.get("custom_data") or payload.get("customData") or {}
    return custom if isinstance(custom, dict) else {}


def _extract_unit_price(payload: Dict[str, Any]) -> Dict[str, Any]:
    unit_price = payload.get("unit_price") or payload.get("unitPrice") or {}
    return unit_price if isinstance(unit_price, dict) else {}


def _coerce_int(value: Any, field: str, price_id: str) -> Optional[int]:
    try:
        return int(value)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "sync_paddle_plans.invalid_int",
            extra={"field": field, "price_id": price_id, "value": value, "error": str(exc)},
        )
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
        logger.error("sync_paddle_plans.partial_api_override", extra={"api_url": bool(api_url), "api_key": bool(api_key)})
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


async def run_sync(
    environment: str,
    api_url: Optional[str],
    api_key: Optional[str],
    product_status: Optional[List[str]],
    price_status: Optional[List[str]],
) -> int:
    env_config = _load_api_config(environment, api_url, api_key)
    if not env_config or not env_config.api_url or not env_config.api_key:
        logger.error("sync_paddle_plans.missing_api_config", extra={"environment": environment})
        return 1

    logger.info("sync_paddle_plans.start", extra={"env": environment})
    client = PaddleAPIClient(env=env_config)
    try:
        products = await _fetch_all(
            client.list_products,
            item_keys=("data", "products"),
            status=product_status,
        )
        prices = await _fetch_all(
            client.list_prices,
            item_keys=("data", "prices"),
            status=price_status,
        )
    except PaddleAPIError as exc:
        logger.error(
            "sync_paddle_plans.paddle_error",
            extra={"status_code": exc.status_code, "details": exc.details},
        )
        return 1

    product_map: Dict[str, Dict[str, Any]] = {}
    for product in products:
        product_id = product.get("id")
        if not product_id:
            logger.warning("sync_paddle_plans.product_missing_id", extra={"product": product})
            continue
        product_map[str(product_id)] = product

    rows: List[Dict[str, Any]] = []
    invalid_prices = 0
    for price in prices:
        price_id = price.get("id")
        if not price_id:
            logger.warning("sync_paddle_plans.price_missing_id", extra={"price": price})
            invalid_prices += 1
            continue

        product_id = price.get("product_id") or price.get("productId")
        if not product_id:
            logger.error("sync_paddle_plans.price_missing_product", extra={"price_id": price_id})
            invalid_prices += 1
            continue

        product = product_map.get(str(product_id), {})
        price_custom = _extract_custom_data(price)
        product_custom = _extract_custom_data(product)

        plan_key = price_custom.get("plan_key") or product_custom.get("plan_key")
        if not plan_key:
            logger.error("sync_paddle_plans.missing_plan_key", extra={"price_id": price_id, "product_id": product_id})
            invalid_prices += 1
            continue

        credits = _coerce_int(price_custom.get("credits"), "credits", str(price_id))
        if credits is None or credits < 0:
            invalid_prices += 1
            continue

        unit_price = _extract_unit_price(price)
        amount = _coerce_int(unit_price.get("amount"), "amount", str(price_id))
        currency = unit_price.get("currency_code") or unit_price.get("currencyCode")
        if amount is None or not currency:
            logger.error(
                "sync_paddle_plans.missing_price_fields",
                extra={"price_id": price_id, "amount": unit_price.get("amount"), "currency": currency},
            )
            invalid_prices += 1
            continue

        status = price.get("status")
        if not status:
            logger.error("sync_paddle_plans.missing_status", extra={"price_id": price_id})
            invalid_prices += 1
            continue

        plan_name = product.get("name") or price.get("name")
        if not plan_name:
            logger.error("sync_paddle_plans.missing_plan_name", extra={"price_id": price_id, "product_id": product_id})
            invalid_prices += 1
            continue

        description = price.get("description") or product.get("description")
        now = datetime.now(timezone.utc).isoformat()
        rows.append(
            {
                "paddle_price_id": str(price_id),
                "paddle_product_id": str(product_id),
                "plan_key": str(plan_key),
                "plan_name": str(plan_name),
                "description": str(description) if description is not None else None,
                "credits": credits,
                "amount": amount,
                "currency": str(currency),
                "status": str(status),
                "custom_data": price_custom,
                "updated_at": now,
            }
        )

    if invalid_prices:
        logger.error("sync_paddle_plans.invalid_prices", extra={"count": invalid_prices})
        return 1
    if not rows:
        logger.error("sync_paddle_plans.no_prices_to_sync")
        return 1

    sb = get_supabase()
    result = sb.table("billing_plans").upsert(rows, on_conflict="paddle_price_id").execute()
    synced = len(rows)
    logger.info("sync_paddle_plans.complete", extra={"synced": synced})
    logger.debug("sync_paddle_plans.supabase_result", extra={"result": result.data})
    return 0


def main() -> None:
    setup_logging()
    parser = argparse.ArgumentParser(description="Sync Paddle catalog into Supabase billing_plans.")
    parser.add_argument(
        "--environment",
        help="Paddle environment: sandbox or production. Defaults to PADDLE_STATUS env.",
    )
    parser.add_argument("--api-url", help="Override Paddle API base URL (optional).")
    parser.add_argument("--api-key", help="Override Paddle API key (optional).")
    parser.add_argument(
        "--product-status",
        help="Comma-separated product statuses to include (e.g., active,archived).",
    )
    parser.add_argument(
        "--price-status",
        help="Comma-separated price statuses to include (e.g., active,archived).",
    )
    args = parser.parse_args()

    environment = _resolve_environment(args.environment or os.getenv("PADDLE_STATUS"))
    if not environment:
        logger.error("sync_paddle_plans.invalid_environment", extra={"environment": args.environment})
        sys.exit(1)

    product_status = _parse_csv_list(args.product_status)
    price_status = _parse_csv_list(args.price_status)
    if not product_status:
        logger.info("sync_paddle_plans.product_status_default", extra={"status": "api_default"})
    if not price_status:
        logger.info("sync_paddle_plans.price_status_default", extra={"status": "api_default"})

    exit_code = asyncio.run(
        run_sync(environment, args.api_url, args.api_key, product_status, price_status)
    )
    if exit_code != 0:
        logger.error("sync_paddle_plans.failed", extra={"exit_code": exit_code})
        sys.exit(exit_code)


if __name__ == "__main__":
    main()
