import argparse
import json
import sys
from typing import Any, Dict, List, Optional

import httpx


def log(message: str, **extra: Any) -> None:
    payload = {"msg": message, **extra}
    print(json.dumps(payload))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check external email verification API endpoints with the configured bearer."
    )
    parser.add_argument(
        "--base-url",
        default=None,
        help="External API base URL (defaults to EMAIL_API_BASE_URL env). Example: https://email-verification.islamsaka.com/api/v1",
    )
    parser.add_argument(
        "--api-key",
        default=None,
        help="External API key (defaults to EMAIL_API_KEY env). Required for auth.",
    )
    parser.add_argument(
        "--verify-email",
        default=None,
        help="Optional email to call /verify. Skipped if not provided to avoid consuming credits.",
    )
    parser.add_argument(
        "--task-id",
        default=None,
        help="Optional task id to fetch /tasks/{id}. Skipped if not provided.",
    )
    parser.add_argument(
        "--include-api-keys",
        action="store_true",
        help="Include /api-keys check. Only runs a GET (no creation/revoke).",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=10.0,
        help="Timeout in seconds for each request (default: 10.0).",
    )
    return parser.parse_args()


async def run_checks(base_url: str, api_key: str, opts: argparse.Namespace) -> int:
    headers = {"Authorization": f"Bearer {api_key}"}
    client = httpx.AsyncClient(base_url=base_url.rstrip("/"), headers=headers, timeout=opts.timeout)
    failures: List[str] = []

    async def check(path: str, method: str = "GET", json_payload: Optional[Dict[str, Any]] = None) -> None:
        try:
            response = await client.request(method, path, json=json_payload)
            ok = response.status_code < 400
            snippet = response.text[:500]
            log(
                "external.check",
                path=path,
                method=method,
                status=response.status_code,
                ok=ok,
                snippet=snippet,
            )
            if not ok:
                failures.append(f"{method} {path} -> {response.status_code}")
        except Exception as exc:  # noqa: BLE001
            log("external.check_exception", path=path, method=method, error=str(exc))
            failures.append(f"{method} {path} -> exception {exc}")

    # Always test /tasks (list)
    await check("/tasks")

    # Optional task detail
    if opts.task_id:
        await check(f"/tasks/{opts.task_id}")

    # Optional verify (may consume credits)
    if opts.verify_email:
        await check("/verify", method="POST", json_payload={"email": opts.verify_email})
    else:
        log("external.skip_verify", reason="no verify email provided")

    # Optional api-keys list
    if opts.include_api_keys:
        await check("/api-keys")
    else:
        log("external.skip_api_keys", reason="include_api-keys flag not set")

    await client.aclose()
    return 0 if not failures else 1


def main() -> int:
    args = parse_args()
    base_url = args.base_url or ""
    api_key = args.api_key or ""

    if not base_url or not api_key:
        log(
            "external.missing_config",
            error="EMAIL_API_BASE_URL and EMAIL_API_KEY must be provided via args or env",
        )
        return 1

    try:
        import anyio

        return anyio.run(run_checks, base_url, api_key, args)
    except KeyboardInterrupt:
        log("external.aborted")
        return 1


if __name__ == "__main__":
    sys.exit(main())
