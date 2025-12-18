"""
External API smoke test using a Supabase user JWT as Bearer auth.

Usage:
    source ../.venv/bin/activate
    python backend/scripts/test_external_api.py --token "<ACCESS_TOKEN>" --base-url https://email-verification.islamsaka.com/api/v1

Notes:
- Do NOT hardcode tokens in code. Pass via --token or env TOKEN.
- By default the script only calls list endpoints (tasks, api-keys) to avoid consuming credits.
- Optionally pass --verify-email to exercise POST /verify (may consume credits).
"""

import argparse
import json
import sys
from typing import Any, Dict, Optional

import httpx


def log(title: str, data: Dict[str, Any]) -> None:
    print(f"\n=== {title} ===")
    print(json.dumps(data, indent=2, ensure_ascii=False))


def request(client: httpx.Client, method: str, url: str, json_body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    resp = client.request(method, url, json=json_body, timeout=10)
    content: Any
    try:
        content = resp.json()
    except Exception:
        content = resp.text
    return {"status": resp.status_code, "ok": resp.is_success, "url": str(resp.url), "body": content}


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke test external API with Supabase JWT")
    parser.add_argument("--token", help="Supabase access token (Bearer)", required=False)
    parser.add_argument("--base-url", help="External API base, e.g. https://.../api/v1", required=True)
    parser.add_argument("--verify-email", help="Optional email to POST /verify (may consume credits)", required=False)
    args = parser.parse_args()

    token = args.token or ""
    if not token:
        print("ERROR: --token is required (Supabase user access token).", file=sys.stderr)
        sys.exit(1)

    headers = {"Authorization": f"Bearer {token}"}

    with httpx.Client(headers=headers) as client:
        log("tasks.list", request(client, "GET", f"{args.base_url}/tasks"))
        log("api_keys.list", request(client, "GET", f"{args.base_url}/api-keys"))

        if args.verify_email:
            payload = {"email": args.verify_email}
            log("verify.post", request(client, "POST", f"{args.base_url}/verify", json_body=payload))
        else:
            print("\nSkipping /verify (no --verify-email provided).")


if __name__ == "__main__":
    main()
