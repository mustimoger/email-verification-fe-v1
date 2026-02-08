"""
Probe the external /metrics/verifications endpoint for timing and response checks.

Usage:
    source .venv/bin/activate
    python backend/scripts/test_verification_metrics.py \
        --token "<ACCESS_TOKEN>" \
        --base-url "https://example.com/api/v1" \
        --user-id "<UUID>" \
        --from "2024-01-01T00:00:00Z" \
        --to "2024-02-01T00:00:00Z" \
        --timeout 15

Notes:
- Do NOT hardcode tokens in code. Pass via --token or EXTERNAL_API_TOKEN.
- Authorization uses Bearer token per api-docs.json (ApiKeyAuth).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT_DIR))

from app.clients.external import ExternalAPIClient, ExternalAPIError  # noqa: E402


def log_event(name: str, payload: Dict[str, Any]) -> None:
    output = {"event": name, **payload}
    print(json.dumps(output, indent=2))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test external /metrics/verifications endpoint")
    parser.add_argument("--token", help="Bearer token (Supabase JWT or API key)", required=False)
    parser.add_argument("--base-url", help="External API base URL, e.g. https://.../api/v1", required=False)
    parser.add_argument("--user-id", help="Filter by user_id (admin only)", required=False)
    parser.add_argument("--from", dest="start", help="RFC3339 start timestamp", required=False)
    parser.add_argument("--to", dest="end", help="RFC3339 end timestamp", required=False)
    parser.add_argument("--timeout", type=float, help="Request timeout in seconds", required=False)
    return parser.parse_args()


async def run() -> int:
    args = parse_args()
    token = args.token or os.environ.get("EXTERNAL_API_TOKEN")
    if not token:
        log_event(
            "missing_token",
            {"hint": "Provide --token or set EXTERNAL_API_TOKEN."},
        )
        return 1

    base_url = args.base_url or os.environ.get("EMAIL_API_BASE_URL")
    if not base_url:
        log_event(
            "missing_base_url",
            {"hint": "Provide --base-url or set EMAIL_API_BASE_URL."},
        )
        return 1

    client_kwargs: Dict[str, Any] = {
        "base_url": base_url,
        "bearer_token": token,
    }
    if args.timeout is not None:
        client_kwargs["timeout_seconds"] = args.timeout

    client = ExternalAPIClient(**client_kwargs)
    start_time = time.monotonic()
    params: Dict[str, Optional[str]] = {
        "user_id": args.user_id,
        "from": args.start,
        "to": args.end,
    }

    log_event("verification_metrics.request", {"base_url": base_url, "params": params})

    try:
        metrics = await client.get_verification_metrics(
            user_id=args.user_id,
            start=args.start,
            end=args.end,
        )
    except ExternalAPIError as exc:
        elapsed_ms = round((time.monotonic() - start_time) * 1000, 2)
        log_event(
            "verification_metrics.error",
            {
                "elapsed_ms": elapsed_ms,
                "status_code": exc.status_code,
                "message": str(exc),
                "details": exc.details,
            },
        )
        return 1
    except Exception as exc:
        elapsed_ms = round((time.monotonic() - start_time) * 1000, 2)
        log_event(
            "verification_metrics.exception",
            {"elapsed_ms": elapsed_ms, "error": str(exc)},
        )
        return 1

    elapsed_ms = round((time.monotonic() - start_time) * 1000, 2)
    log_event(
        "verification_metrics.response",
        {"elapsed_ms": elapsed_ms, "data": metrics.model_dump()},
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run()))
