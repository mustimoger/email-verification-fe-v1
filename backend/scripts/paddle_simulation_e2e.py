"""
Run a simulation-based Paddle E2E verification flow.

This script:
1) Resolves a user by email.
2) Resolves a plan by price_id or plan_key/plan_name.
3) Creates a Paddle transaction through the backend route logic.
4) Sends a Paddle webhook simulation to the configured notification setting.
5) Polls Supabase to confirm purchase + credit grant.

Usage:
    source ../.venv/bin/activate
    PYTHONPATH=backend python backend/scripts/paddle_simulation_e2e.py \
        --user-email dmktadimiz@gmail.com \
        --plan-key enterprise \
        --notification-description ngrok2
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
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import parse_qs, urlparse

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.api.billing import CheckoutRequest, create_transaction  # noqa: E402
from app.core.auth import AuthContext  # noqa: E402
from app.paddle.client import PaddleAPIError, get_paddle_client  # noqa: E402
from app.paddle.config import get_paddle_config  # noqa: E402
from app.services.billing_plans import (  # noqa: E402
    get_billing_plan_by_key,
    get_billing_plan_by_name,
    get_billing_plan_by_price_id,
)
from app.services.paddle_store import get_paddle_ids  # noqa: E402
from app.services.supabase_client import (  # noqa: E402
    fetch_credits,
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


async def _find_notification_setting_id(description: str, override_id: Optional[str]) -> str:
    if override_id:
        return override_id
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
        raise RuntimeError(f"Notification setting with description '{description}' not found")
    if len(matches) > 1:
        raise RuntimeError(f"Multiple notification settings matched description '{description}'")
    setting = matches[0]
    setting_id = setting.get("id")
    if not setting_id:
        raise RuntimeError("Notification setting missing id")
    if setting.get("active") is False:
        raise RuntimeError(f"Notification setting '{description}' is inactive")
    return str(setting_id)


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
            totals["total"] = amount
        if currency:
            totals["currency_code"] = currency
        transaction["details"] = {"totals": totals}
    return {
        "event_id": f"evt_{uuid.uuid4().hex}",
        "event_type": "transaction.completed",
        "data": {"transaction": transaction},
    }


def _fetch_purchase(transaction_id: str) -> Optional[Dict[str, Any]]:
    sb = get_supabase()
    res = sb.table("billing_purchases").select("*").eq("transaction_id", transaction_id).limit(1).execute()
    data = res.data or []
    return data[0] if data else None


async def run_flow(args: argparse.Namespace) -> int:
    setup_logging()
    load_dotenv()
    get_paddle_config()

    description = _normalize_description(args.notification_description)
    if not description and not args.notification_setting_id:
        raise RuntimeError("Notification description or notification setting id is required")

    profile = fetch_profile_by_email(args.user_email)
    if not profile:
        raise RuntimeError(f"No profile found for email {args.user_email}")
    user_id = profile.get("user_id")
    if not user_id:
        raise RuntimeError("Profile missing user_id")

    plan = _resolve_plan(args.price_id, args.plan_key, args.plan_name, args.include_inactive)
    plan_price_id = str(plan.get("paddle_price_id"))
    if not plan_price_id:
        raise RuntimeError("Resolved plan missing paddle_price_id")

    quantity = args.quantity
    credits_per_unit = int(plan.get("credits") or 0)
    expected_credits = credits_per_unit * max(quantity, 1)
    amount = plan.get("amount")
    currency = plan.get("currency")

    run_id = uuid.uuid4().hex
    auth_ctx = AuthContext(
        user_id=user_id,
        claims={"email": profile.get("email") or args.user_email},
        token=f"e2e-{run_id}",
    )
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
    if not customer_id:
        ids = get_paddle_ids(user_id)
        if ids:
            customer_id = ids[0]

    notification_setting_id = await _find_notification_setting_id(description or "", args.notification_setting_id)
    billed_at = datetime.now(timezone.utc).isoformat()
    webhook_payload = _build_transaction_payload(
        transaction_id=transaction_id,
        customer_id=customer_id,
        user_id=user_id,
        price_id=plan_price_id,
        quantity=quantity,
        amount=amount,
        currency=currency,
        billed_at=billed_at,
        run_id=run_id,
    )

    credits_before = fetch_credits(user_id)

    client = get_paddle_client()
    simulation_payload = {
        "name": f"e2e-{run_id}",
        "notificationSettingId": notification_setting_id,
        "type": "transaction.completed",
        "payload": webhook_payload,
    }
    logger.info(
        "paddle_simulation_e2e.simulation.create",
        extra={"notification_setting_id": notification_setting_id, "run_id": run_id},
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

    purchase = None
    credits_after = credits_before
    while time.monotonic() < deadline:
        purchase = _fetch_purchase(transaction_id)
        credits_after = fetch_credits(user_id)
        if purchase and credits_after >= credits_before + expected_credits:
            break
        time.sleep(poll_interval)

    if not purchase:
        raise RuntimeError("Timed out waiting for billing_purchases record")
    if credits_after < credits_before + expected_credits:
        raise RuntimeError(
            f"Credits did not increment as expected (before={credits_before}, after={credits_after})"
        )

    checkout_email = purchase.get("checkout_email")
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
            "credits_before": credits_before,
            "credits_after": credits_after,
            "expected_delta": expected_credits,
            "purchase_id": purchase.get("transaction_id"),
        },
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run Paddle simulation-based E2E flow.")
    parser.add_argument("--user-email", required=True, help="Supabase user email to map to a user_id.")
    parser.add_argument("--price-id", help="Paddle price id to purchase.")
    parser.add_argument("--plan-key", help="Plan key from billing_plans (e.g., enterprise).")
    parser.add_argument("--plan-name", help="Plan name from billing_plans.")
    parser.add_argument("--quantity", type=int, default=1, help="Quantity to purchase.")
    parser.add_argument(
        "--notification-description",
        default="ngrok2",
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
    if not (args.price_id or args.plan_key or args.plan_name):
        parser.error("One of --price-id, --plan-key, or --plan-name is required.")
    if args.quantity <= 0:
        parser.error("--quantity must be greater than zero.")
    try:
        return asyncio.run(run_flow(args))
    except PaddleAPIError as exc:
        logger.error("paddle_simulation_e2e.paddle_error", extra={"status_code": exc.status_code, "details": exc.details})
        return 1
    except Exception as exc:  # noqa: BLE001
        logger.error("paddle_simulation_e2e.failed", extra={"error": str(exc)})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
