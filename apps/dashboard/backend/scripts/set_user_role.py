"""
Set Supabase app_metadata.role for a user (admin/user) using the service role key.

Usage:
    source ../.venv/bin/activate
    python backend/scripts/set_user_role.py --email mkural2016@gmail.com --role admin
"""

import argparse
import sys
from typing import Optional

from supabase import Client, create_client


def find_user_id_by_email(client: Client, email: str, per_page: int = 100) -> Optional[str]:
    page = 1
    target = email.lower()
    while True:
        res = client.auth.admin.list_users(page=page, per_page=per_page)
        users = getattr(res, "users", []) or []
        for user in users:
            if getattr(user, "email", "").lower() == target:
                return user.id
        if len(users) < per_page:
            break
        page += 1
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Set Supabase app_metadata.role for a user.")
    parser.add_argument("--email", required=True, help="User email to update")
    parser.add_argument("--role", choices=["admin", "user"], default="user", help="Role to set in app_metadata.role")
    args = parser.parse_args()

    import os

    supabase_url = os.environ.get("SUPABASE_URL")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_role_key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.", file=sys.stderr)
        return 1

    client = create_client(supabase_url, service_role_key)

    user_id = find_user_id_by_email(client, args.email)
    if not user_id:
        print(f"User not found for email: {args.email}", file=sys.stderr)
        return 1

    try:
        resp = client.auth.admin.update_user_by_id(user_id, user_attributes={"app_metadata": {"role": args.role}})
        updated_role = getattr(resp.user, "app_metadata", {}).get("role") if hasattr(resp, "user") else None
        print(
            f"Updated user {args.email} ({user_id}) role to {args.role}.",
        )
        if updated_role != args.role:
            print("Warning: response did not confirm role; verify in dashboard.", file=sys.stderr)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to update role: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
