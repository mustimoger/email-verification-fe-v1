"""
Run a simulation-based Paddle E2E verification flow.

This script:
1) Resolves a user by email.
2) Resolves a v1 plan (billing_plans) or a v2 tier (pricing_v2).
3) Creates a Paddle transaction through backend route logic.
4) Sends a Paddle webhook simulation to the configured notification setting.
5) Polls Supabase to confirm purchase + credit grant.

Usage (v1):
    source ../.venv/bin/activate
    PYTHONPATH=backend python backend/scripts/paddle_simulation_e2e.py \
        --user-email dmktadimiz@gmail.com \
        --plan-key enterprise \
        --notification-description ngrok2

Usage (v2):
    source ../.venv/bin/activate
    PYTHONPATH=backend python backend/scripts/paddle_simulation_e2e.py \
        --pricing-version v2 \
        --user-email dmktadimiz@gmail.com \
        --quantity 2000 \
        --mode payg \
        --interval one_time \
        --notification-description ngrok2-all
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import parse_qs, urlparse

import httpx
BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.api.billing import CheckoutRequest, _parse_int, create_transaction  # noqa: E402
from app.api.billing_v2 import (  # noqa: E402
    PricingTransactionRequest,
    _validate_mode_interval,
    create_transaction_v2,
)
from app.core.auth import AuthContext  # noqa: E402
from app.paddle.client import PaddleAPIError, get_paddle_client  # noqa: E402
from app.paddle.config import get_paddle_config  # noqa: E402
from app.services.billing_plans import (  # noqa: E402
    get_billing_plan_by_key,
    get_billing_plan_by_name,
    get_billing_plan_by_price_id,
)
from app.services.paddle_store import get_paddle_ids  # noqa: E402
from app.services.pricing_v2 import (  # noqa: E402
    PricingConfigV2,
    PricingTierV2,
    PricingValidationError,
    compute_pricing_totals_v2,
    get_pricing_config_v2,
    get_pricing_tier_by_price_id_v2,
    select_pricing_tier_v2,
    validate_quantity_v2,
)
from app.services.supabase_client import (  # noqa: E402
    fetch_profile_by_email,
    get_supabase,
)

logger = logging.getLogger("paddle_simulation_e2e")


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
    logger.info("paddle_simulation_e2e.env_loaded", extra={"loaded": loaded})


def _extract_data(payload: Dict[str, Any]) -> Dict[str, Any]:
    if isinstance(payload, dict) and isinstance(payload.get("data"), dict):
        return payload["data"]
    return payload


def _normalize_description(value: Optional[str]) -> Optional[str]:
    return value.strip() if value else None


def _normalize_next_cursor(value: Any) -> Optional[str]:
    if not value:
        return None
    cursor = str(value)
    if cursor.startswith("http"):
        parsed = urlparse(cursor)
        after_values = parse_qs(parsed.query).get("after")
        if after_values:
            return str(after_values[0])
        return None
    return cursor


async def _find_notification_setting(description: str, override_id: Optional[str]) -> Dict[str, Any]:
    client = get_paddle_client()
    after: Optional[str] = None
    matches: list[Dict[str, Any]] = []
    seen: set[str] = set()
    while True:
        payload = await client.list_notification_settings(after=after)
        settings = payload.get("data") if isinstance(payload, dict) else None
        if not isinstance(settings, list):
            settings = []
        for setting in settings:
            if not isinstance(setting, dict):
                continue
            if override_id:
                if setting.get("id") == override_id:
                    matches.append(setting)
            else:
                if setting.get("description") == description:
                    matches.append(setting)
        meta = payload.get("meta") if isinstance(payload, dict) else None
        next_cursor = None
        if isinstance(meta, dict):
            pagination = meta.get("pagination")
            if isinstance(pagination, dict):
                next_cursor = _normalize_next_cursor(pagination.get("next"))
            if not next_cursor:
                next_cursor = _normalize_next_cursor(meta.get("next"))
        if not next_cursor or next_cursor in seen:
            break
        seen.add(next_cursor)
        after = next_cursor
    if not matches:
        if override_id:
            raise RuntimeError(f"Notification setting with id '{override_id}' not found")
        raise RuntimeError(f"Notification setting with description '{description}' not found")
    if len(matches) > 1:
        if override_id:
            raise RuntimeError(f"Multiple notification settings matched id '{override_id}'")
        raise RuntimeError(f"Multiple notification settings matched description '{description}'")
    setting = matches[0]
    setting_id = setting.get("id")
    if not setting_id:
        raise RuntimeError("Notification setting missing id")
    if setting.get("active") is False:
        label = setting.get("description") or setting_id
        raise RuntimeError(f"Notification setting '{label}' is inactive")
    return setting


def _preflight_notification_setting(setting: Dict[str, Any]) -> None:
    description = setting.get("description") or setting.get("id")
    traffic_source = setting.get("traffic_source") or setting.get("trafficSource")
    if traffic_source and traffic_source not in {"simulation", "all"}:
        raise RuntimeError(
            f"Notification setting '{description}' is not configured for simulation traffic"
        )
    destination = setting.get("destination")
    if not destination:
        logger.warning("paddle_simulation_e2e.destination_missing", extra={"notification_description": description})
        return
    if not str(destination).endswith("/api/billing/webhook"):
        logger.warning(
            "paddle_simulation_e2e.destination_unexpected",
            extra={"destination": destination, "notification_description": description},
        )
    try:
        response = httpx.get(str(destination), timeout=5.0)
    except httpx.RequestError as exc:
        raise RuntimeError(f"Webhook destination unreachable: {destination}") from exc
    if response.status_code >= 500:
        raise RuntimeError(f"Webhook destination returned {response.status_code}")
    if response.status_code >= 400:
        logger.warning(
            "paddle_simulation_e2e.destination_non_success",
            extra={"status_code": response.status_code, "destination": destination},
        )
    else:
        logger.info(
            "paddle_simulation_e2e.destination_reachable",
            extra={"status_code": response.status_code, "destination": destination},
        )


def _resolve_plan(
    price_id: Optional[str],
    plan_key: Optional[str],
    plan_name: Optional[str],
    include_inactive: bool,
) -> Dict[str, Any]:
    status = None if include_inactive else "active"
    if price_id:
        plan = get_billing_plan_by_price_id(price_id, status=status)
        if plan:
            return plan
    if plan_key:
        plan = get_billing_plan_by_key(plan_key, status=status)
        if plan:
            return plan
    if plan_name:
        plan = get_billing_plan_by_name(plan_name, status=status)
        if plan:
            return plan
    raise RuntimeError("No matching billing plan found for the provided selectors")


def _resolve_quantity(requested: Optional[int], default_value: int) -> int:
    if requested is None:
        return default_value
    if requested <= 0:
        raise RuntimeError("Quantity must be greater than zero")
    return requested


def _resolve_v2_tier(
    price_id: Optional[str],
    mode: Optional[str],
    interval: Optional[str],
    quantity: int,
    config: PricingConfigV2,
) -> tuple[PricingTierV2, str, str]:
    if price_id:
        tier = get_pricing_tier_by_price_id_v2(price_id)
        if not tier:
            raise RuntimeError(f"No v2 tier found for price_id {price_id}")
        if mode and mode != tier.mode:
            raise RuntimeError("Provided mode does not match price_id tier")
        if interval and interval != tier.interval:
            raise RuntimeError("Provided interval does not match price_id tier")
        return tier, tier.mode, tier.interval
    if not mode or not interval:
        raise RuntimeError("For v2, provide --mode and --interval when --price-id is not supplied")
    _validate_mode_interval(mode, interval)
    tier = select_pricing_tier_v2(quantity, mode, interval, config)
    return tier, mode, interval


def _resolve_annual_multiplier(config: PricingConfigV2) -> int:
    multiplier = _parse_int(config.metadata.get("annual_credit_multiplier"))
    if multiplier is None or multiplier <= 0:
        raise RuntimeError("Missing or invalid annual_credit_multiplier in pricing config metadata")
    return multiplier


def _decimal_to_cents(value: Decimal) -> int:
    return int((value * Decimal(100)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _build_transaction_payload(
    transaction_id: str,
    customer_id: Optional[str],
    user_id: str,
    price_id: str,
    quantity: int,
    amount: Optional[int],
    currency: Optional[str],
    billed_at: str,
    run_id: str,
) -> Dict[str, Any]:
    transaction: Dict[str, Any] = {
        "id": transaction_id,
        "items": [{"price_id": price_id, "quantity": quantity}],
        "custom_data": {"supabase_user_id": user_id, "e2e_run_id": run_id},
        "billed_at": billed_at,
    }
    if customer_id:
        transaction["customer_id"] = customer_id
    if currency:
        transaction["currency_code"] = currency
    if amount is not None or currency:
        totals: Dict[str, Any] = {}
        if amount is not None:
            totals["total"] = str(amount)
        if currency:
            totals["currency_code"] = currency
        transaction["details"] = {"totals": totals}
    return transaction


def _fetch_credit_grant(user_id: str, transaction_id: str) -> Optional[Dict[str, Any]]:
    sb = get_supabase()
    res = (
        sb.table("credit_grants")
        .select("*")
        .eq("user_id", user_id)
        .eq("source", "purchase")
        .eq("source_id", transaction_id)
        .limit(1)
        .execute()
    )
    data = res.data or []
    return data[0] if data else None


async def run_flow(args: argparse.Namespace) -> int:
    setup_logging()
    load_dotenv()
    config = get_paddle_config()
    if config.status != "sandbox":
        logger.warning(
            "paddle_simulation_e2e.non_sandbox_mode",
            extra={"paddle_status": config.status},
        )

    description = _normalize_description(args.notification_description)
    if not description and not args.notification_setting_id:
        raise RuntimeError("Notification description or notification setting id is required")

    profile = fetch_profile_by_email(args.user_email)
    if not profile:
        raise RuntimeError(f"No profile found for email {args.user_email}")
    user_id = profile.get("user_id")
    if not user_id:
        raise RuntimeError("Profile missing user_id")

    pricing_version = args.pricing_version
    expected_credits: int
    amount: Optional[int] = None
    currency: Optional[str] = None
    transaction_id: str
    customer_id: Optional[str] = None
    price_id: str
    item_quantity: int

    notification_setting = await _find_notification_setting(description or "", args.notification_setting_id)
    _preflight_notification_setting(notification_setting)
    notification_setting_id = str(notification_setting.get("id"))

    run_id = uuid.uuid4().hex
    auth_ctx = AuthContext(
        user_id=user_id,
        claims={"email": profile.get("email") or args.user_email},
        token=f"e2e-{run_id}",
    )

    if pricing_version == "v1":
        plan = _resolve_plan(args.price_id, args.plan_key, args.plan_name, args.include_inactive)
        plan_price_id = str(plan.get("paddle_price_id"))
        if not plan_price_id:
            raise RuntimeError("Resolved plan missing paddle_price_id")
        quantity = _resolve_quantity(args.quantity, 1)
        credits_per_unit = int(plan.get("credits") or 0)
        expected_credits = credits_per_unit * max(quantity, 1)
        amount = plan.get("amount")
        currency = plan.get("currency")
        checkout_payload = CheckoutRequest(
            price_id=plan_price_id,
            quantity=quantity,
            custom_data={"e2e_run_id": run_id},
        )
        logger.info(
            "paddle_simulation_e2e.transaction.start",
            extra={"user_id": user_id, "price_id": plan_price_id, "quantity": quantity, "run_id": run_id},
        )
        transaction = await create_transaction(checkout_payload, user=auth_ctx)
        transaction_id = transaction.id
        customer_id = transaction.customer_id
        price_id = plan_price_id
        item_quantity = quantity
    else:
        config_v2 = get_pricing_config_v2()
        quantity = _resolve_quantity(args.quantity, config_v2.min_volume)
        validate_quantity_v2(quantity, config_v2)
        tier, mode, interval = _resolve_v2_tier(
            args.price_id,
            args.mode,
            args.interval,
            quantity,
            config_v2,
        )
        totals = compute_pricing_totals_v2(quantity, tier)
        multiplier = 1
        if tier.mode == "subscription" and tier.interval == "year":
            multiplier = _resolve_annual_multiplier(config_v2)
        expected_credits = tier.credits_per_unit * totals.units * multiplier
        amount = _decimal_to_cents(totals.rounded_total)
        currency = tier.currency
        price_id = tier.paddle_price_id
        item_quantity = totals.units
        checkout_payload = PricingTransactionRequest(
            quantity=quantity,
            mode=mode,
            interval=interval,
            price_id=price_id,
            custom_data={"e2e_run_id": run_id},
        )
        logger.info(
            "paddle_simulation_e2e.transaction.start",
            extra={
                "user_id": user_id,
                "price_id": price_id,
                "quantity": quantity,
                "units": totals.units,
                "mode": mode,
                "interval": interval,
                "run_id": run_id,
            },
        )
        transaction = await create_transaction_v2(checkout_payload, user=auth_ctx)
        transaction_id = transaction.id

    if not customer_id:
        ids = get_paddle_ids(user_id)
        if ids:
            customer_id = ids[0]

    billed_at = datetime.now(timezone.utc).isoformat()
    webhook_payload = _build_transaction_payload(
        transaction_id=transaction_id,
        customer_id=customer_id,
        user_id=user_id,
        price_id=price_id,
        quantity=item_quantity,
        amount=amount,
        currency=currency,
        billed_at=billed_at,
        run_id=run_id,
    )

    client = get_paddle_client()
    simulation_payload = {
        "name": f"e2e-{run_id}",
        "notification_setting_id": notification_setting_id,
        "type": "transaction.completed",
        "payload": webhook_payload,
    }
    logger.info(
        "paddle_simulation_e2e.simulation.create",
        extra={
            "notification_setting_id": notification_setting_id,
            "run_id": run_id,
            "transaction_id": transaction_id,
        },
    )
    simulation_response = await client.create_simulation(simulation_payload)
    simulation = _extract_data(simulation_response)
    simulation_id = simulation.get("id")
    if not simulation_id:
        raise RuntimeError("Simulation creation failed: missing id")

    run_response = await client.create_simulation_run(str(simulation_id))
    run_data = _extract_data(run_response)
    simulation_run_id = run_data.get("id")
    logger.info(
        "paddle_simulation_e2e.simulation.run",
        extra={"simulation_id": simulation_id, "simulation_run_id": simulation_run_id, "transaction_id": transaction_id},
    )
    timeout_seconds = args.timeout_seconds
    poll_interval = args.poll_interval_seconds
    deadline = time.monotonic() + timeout_seconds

    credit_grant = None
    credits_granted = None
    while time.monotonic() < deadline:
        credit_grant = _fetch_credit_grant(user_id, transaction_id)
        credits_granted = credit_grant.get("credits_granted") if credit_grant else None
        if credit_grant and credits_granted is not None:
            break
        time.sleep(poll_interval)

    if not credit_grant:
        raise RuntimeError("Timed out waiting for credit_grants record")
    if credits_granted is None:
        raise RuntimeError("credit_grants record missing credits_granted")
    if expected_credits > 0 and int(credits_granted) != expected_credits:
        raise RuntimeError(
            "Credits granted did not match expected value "
            f"(expected={expected_credits}, actual={credits_granted})"
        )

    checkout_email = credit_grant.get("checkout_email")
    if checkout_email and str(checkout_email).lower() != str(args.user_email).lower():
        logger.warning(
            "paddle_simulation_e2e.checkout_email_mismatch",
            extra={"expected": args.user_email, "actual": checkout_email},
        )

    logger.info(
        "paddle_simulation_e2e.success",
        extra={
            "transaction_id": transaction_id,
            "simulation_id": simulation_id,
            "simulation_run_id": simulation_run_id,
            "credits_granted": credits_granted,
            "expected_credits": expected_credits,
            "credit_grant_id": credit_grant.get("id"),
        },
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run Paddle simulation-based E2E flow.")
    parser.add_argument("--user-email", required=True, help="Supabase user email to map to a user_id.")
    parser.add_argument(
        "--pricing-version",
        choices=["v1", "v2"],
        default="v1",
        help="Pricing flow to test: v1 (billing_plans) or v2 (pricing tiers).",
    )
    parser.add_argument("--price-id", help="Paddle price id to purchase.")
    parser.add_argument("--plan-key", help="Plan key from billing_plans (e.g., enterprise).")
    parser.add_argument("--plan-name", help="Plan name from billing_plans.")
    parser.add_argument(
        "--mode",
        choices=["payg", "subscription"],
        help="v2 mode (required unless --price-id is provided).",
    )
    parser.add_argument(
        "--interval",
        choices=["one_time", "month", "year"],
        help="v2 interval (required unless --price-id is provided).",
    )
    parser.add_argument(
        "--quantity",
        type=int,
        default=None,
        help="Quantity to purchase. v1 defaults to 1, v2 defaults to min_volume.",
    )
    parser.add_argument(
        "--notification-description",
        default="ngrok2-all",
        help="Notification setting description to match when id not provided.",
    )
    parser.add_argument(
        "--notification-setting-id",
        help="Override notification setting id (skips description lookup).",
    )
    parser.add_argument(
        "--timeout-seconds",
        type=int,
        default=90,
        help="Seconds to wait for webhook processing.",
    )
    parser.add_argument(
        "--poll-interval-seconds",
        type=float,
        default=2.0,
        help="Polling interval while waiting for webhook processing.",
    )
    parser.add_argument(
        "--include-inactive",
        action="store_true",
        help="Allow resolving inactive plans in billing_plans.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.pricing_version == "v1":
        if not (args.price_id or args.plan_key or args.plan_name):
            parser.error("For v1, one of --price-id, --plan-key, or --plan-name is required.")
    else:
        if not args.price_id and (not args.mode or not args.interval):
            parser.error("For v2, provide --price-id or both --mode and --interval.")
    if args.quantity is not None and args.quantity <= 0:
        parser.error("--quantity must be greater than zero.")
    try:
        return asyncio.run(run_flow(args))
    except PaddleAPIError as exc:
        logger.error(
            "paddle_simulation_e2e.paddle_error status=%s details=%s",
            exc.status_code,
            exc.details,
        )
        return 1
    except PricingValidationError as exc:
        logger.error("paddle_simulation_e2e.validation_failed", extra={"detail": exc.detail})
        return 1
    except Exception as exc:  # noqa: BLE001
        logger.error("paddle_simulation_e2e.failed", extra={"error": str(exc)})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
