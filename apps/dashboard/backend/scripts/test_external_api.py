"""
External API smoke test using a Supabase user JWT as Bearer auth.

Usage:
    source ../.venv/bin/activate
    python backend/scripts/test_external_api.py --token "<ACCESS_TOKEN>" --base-url https://email-verification.islamsaka.com/api/v1 --csv test-emails.csv

Notes:
- Do NOT hardcode tokens in code. Pass via --token or env TOKEN.
- Token should include app_metadata.role (user/admin) since external API enforces roles.
- This script will POST /verify for each email in the CSV (consumes credits).
"""

import argparse
import csv
import json
import runpy
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx


def log(title: str, data: Dict[str, Any]) -> None:
    print(f"\n=== {title} ===")
    print(json.dumps(data, indent=2, ensure_ascii=False))


def request(client: httpx.Client, method: str, url: str, json_body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    resp = client.request(method, url, json=json_body, timeout=60)
    content: Any
    try:
        content = resp.json()
    except Exception:
        content = resp.text
    return {"status": resp.status_code, "ok": resp.is_success, "url": str(resp.url), "body": content}


def main() -> None:
    parser = argparse.ArgumentParser(description="Smoke test external API with Supabase JWT")
    parser.add_argument(
        "--use-config",
        action="store_true",
        help="Run the config-driven test runner in backend/tests instead of this legacy CLI.",
    )
    parser.add_argument("--token", help="Supabase access token (Bearer)", required=False)
    parser.add_argument("--base-url", help="External API base, e.g. https://.../api/v1", required=True)
    parser.add_argument("--verify-email", help="Single email to POST /verify (optional)", required=False)
    parser.add_argument("--csv", help="CSV with column 'email' to POST /verify for each row", required=False)
    args = parser.parse_args()

    if args.use_config:
        runner_path = Path(__file__).resolve().parents[1] / "tests" / "external_api_test_runner.py"
        if not runner_path.exists():
            print(f"ERROR: test runner not found at {runner_path}", file=sys.stderr)
            sys.exit(1)
        runpy.run_path(str(runner_path), run_name="__main__")
        return

    token = args.token or ""
    if not token:
        print("ERROR: --token is required (Supabase user access token).", file=sys.stderr)
        sys.exit(1)

    headers = {"Authorization": f"Bearer {token}"}

    with httpx.Client(headers=headers) as client:
        log("tasks.list", request(client, "GET", f"{args.base_url}/tasks"))
        log("api_keys.list", request(client, "GET", f"{args.base_url}/api-keys"))

        emails: List[str] = []
        if args.csv:
            try:
                with open(args.csv, newline="", encoding="utf-8-sig") as fh:
                    reader = csv.DictReader(fh)
                    for row in reader:
                        email = row.get("email")
                        if email:
                            emails.append(email.strip())
            except Exception as exc:
                print(f"ERROR: failed to read CSV {args.csv}: {exc}", file=sys.stderr)
        if args.verify_email:
            emails.append(args.verify_email.strip())

        if emails:
            for email in emails:
                payload = {"email": email}
                log(f"verify.post.{email}", request(client, "POST", f"{args.base_url}/verify", json_body=payload))
        else:
            print("\nNo emails provided for /verify (use --csv or --verify-email).")


if __name__ == "__main__":
    main()
