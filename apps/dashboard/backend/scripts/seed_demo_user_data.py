#!/usr/bin/env python3
import argparse
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple
import uuid

import psycopg2
from psycopg2.extras import execute_values


DATASET_DEFAULT = Path(__file__).with_name("demo_seed_dataset.json")
ENV_DEFAULT = Path(__file__).resolve().parents[2] / ".env.ext-api"


@dataclass(frozen=True)
class DbConfig:
    host: str
    port: int
    dbname: str
    user: str
    password: str
    sslmode: str


def parse_env_file(path: Path) -> Dict[str, str]:
    if not path.exists():
        return {}
    values: Dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line and "=" not in line:
            key, value = line.split(":", 1)
        else:
            key, value = line.split("=", 1)
        key = key.strip().strip('"')
        value = value.strip().strip('"')
        values[key] = value
    return values


def resolve_db_config(args: argparse.Namespace) -> DbConfig:
    env_values = parse_env_file(Path(args.env_file))
    host = args.db_host or env_values.get("HOST") or env_values.get("DB_HOST")
    port_raw = args.db_port or env_values.get("PORT") or env_values.get("DB_PORT")
    user = args.db_user or env_values.get("DB_USER")
    password = args.db_password or env_values.get("DB_PASSWORD")
    dbname = args.db_name or env_values.get("DB_NAME")
    sslmode = args.db_sslmode or env_values.get("DB_SSLMODE") or "require"

    missing = [
        key
        for key, value in {
            "host": host,
            "port": port_raw,
            "user": user,
            "password": password,
            "dbname": dbname,
        }.items()
        if not value
    ]
    if missing:
        raise SystemExit(f"Missing DB config values: {', '.join(missing)}")
    return DbConfig(
        host=host,
        port=int(port_raw),
        dbname=dbname,
        user=user,
        password=password,
        sslmode=sslmode,
    )


def load_dataset(path: Path) -> Dict[str, object]:
    if not path.exists():
        raise SystemExit(f"Dataset file not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def parse_datetime(date_str: str, time_str: str, tz: timezone = timezone.utc) -> datetime:
    dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
    return dt.replace(tzinfo=tz)


def parse_date(date_str: str) -> datetime.date:
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def ensure_dataset_consistency(dataset: Dict[str, object]) -> None:
    tasks = dataset["tasks"]
    verification = dataset["verification"]
    totals = [t["total"] for t in tasks if t.get("status") == "completed"]
    valid = [t["valid"] for t in tasks if t.get("status") == "completed"]
    invalid = [t["invalid"] for t in tasks if t.get("status") == "completed"]
    catchall = [t["catchall"] for t in tasks if t.get("status") == "completed"]

    total_sum = sum(totals)
    valid_sum = sum(valid)
    invalid_sum = sum(invalid)
    catchall_sum = sum(catchall)

    expected_total = verification["total_verifications"]
    status_totals = verification["verification_status"]
    status_sum = sum(status_totals.values())

    if total_sum != expected_total:
        raise SystemExit(f"Task totals {total_sum} do not match verification total {expected_total}.")
    if valid_sum + invalid_sum + catchall_sum != expected_total:
        raise SystemExit("Task valid/invalid/catchall totals do not match verification total.")
    if status_sum != expected_total:
        raise SystemExit("Verification status totals do not match verification total.")

    series_total = sum(point["total_verifications"] for point in verification["series"])
    if series_total != expected_total:
        raise SystemExit("Verification series total does not match verification total.")

    usage = dataset["api_usage"]
    usage_total = sum(point["usage_count"] for point in usage["series"])
    if usage_total != usage["total_requests"]:
        raise SystemExit("API usage series total does not match total_requests.")
    if sum(usage["requests_by_purpose"].values()) != usage["total_requests"]:
        raise SystemExit("API usage purpose totals do not match total_requests.")


def build_daily_usage_allocations(usage_series: List[Dict[str, object]],
                                  key_totals: Dict[str, int]) -> Dict[str, List[int]]:
    days = [point["usage_count"] for point in usage_series]
    total_requests = sum(days)
    keys = list(key_totals.keys())
    if total_requests <= 0:
        raise SystemExit("Total API usage must be positive.")

    allocations: Dict[str, List[int]] = {key: [] for key in keys}
    remainders: Dict[str, List[Tuple[int, float]]] = {key: [] for key in keys}

    for day_index, day_total in enumerate(days):
        if day_total <= 0:
            for key in keys:
                allocations[key].append(0)
                remainders[key].append((day_index, 0.0))
            continue
        for key in keys:
            raw = day_total * (key_totals[key] / total_requests)
            value = int(raw)
            allocations[key].append(value)
            remainders[key].append((day_index, raw - value))

        allocated = sum(allocations[key][day_index] for key in keys)
        remainder = day_total - allocated
        if remainder:
            order = sorted(keys, key=lambda k: remainders[k][day_index][1], reverse=True)
            for i in range(remainder):
                allocations[order[i % len(order)]][day_index] += 1

    achieved = {key: sum(allocations[key]) for key in keys}
    deltas = {key: key_totals[key] - achieved[key] for key in keys}

    if all(delta == 0 for delta in deltas.values()):
        return allocations

    surplus = {key: -delta for key, delta in deltas.items() if delta < 0}
    deficit = {key: delta for key, delta in deltas.items() if delta > 0}

    for deficit_key, deficit_count in list(deficit.items()):
        remaining = deficit_count
        if remaining <= 0:
            continue
        for surplus_key, surplus_count in list(surplus.items()):
            if remaining <= 0:
                break
            if surplus_count <= 0:
                continue
            for day_index in range(len(days)):
                if remaining <= 0 or surplus_count <= 0:
                    break
                if allocations[surplus_key][day_index] <= 0:
                    continue
                allocations[surplus_key][day_index] -= 1
                allocations[deficit_key][day_index] += 1
                remaining -= 1
                surplus_count -= 1
            surplus[surplus_key] = surplus_count
        deficit[deficit_key] = remaining

    final = {key: sum(values) for key, values in allocations.items()}
    if final != key_totals:
        raise SystemExit("Failed to balance API usage allocations.")

    for day_index, day_total in enumerate(days):
        if sum(allocations[key][day_index] for key in keys) != day_total:
            raise SystemExit("API usage daily allocation mismatch.")

    return allocations


def allocate_invalid_breakdown(task_invalid: int,
                               remaining: Dict[str, int]) -> Dict[str, int]:
    remaining_total = sum(remaining.values())
    if remaining_total == 0:
        return {key: 0 for key in remaining}

    allocations: Dict[str, int] = {}
    for key, value in remaining.items():
        raw = task_invalid * (value / remaining_total)
        allocations[key] = int(raw)

    allocated = sum(allocations.values())
    remainder = task_invalid - allocated
    if remainder:
        order = sorted(remaining.keys(), key=lambda k: remaining[k], reverse=True)
        for i in range(remainder):
            allocations[order[i % len(order)]] += 1

    for key in allocations:
        if allocations[key] > remaining[key]:
            allocations[key] = remaining[key]

    diff = task_invalid - sum(allocations.values())
    if diff:
        for key in sorted(remaining.keys(), key=lambda k: remaining[k] - allocations[k], reverse=True):
            if diff == 0:
                break
            available = remaining[key] - allocations[key]
            if available <= 0:
                continue
            take = min(available, diff)
            allocations[key] += take
            diff -= take

    return allocations


def allocate_role_based(total_emails: int, total_role_based: int, task_totals: List[int]) -> List[int]:
    if total_role_based <= 0:
        return [0] * len(task_totals)
    allocations = []
    for total in task_totals:
        raw = total_role_based * (total / total_emails)
        allocations.append(int(raw))
    allocated = sum(allocations)
    remainder = total_role_based - allocated
    if remainder:
        order = sorted(range(len(task_totals)), key=lambda i: task_totals[i], reverse=True)
        for i in range(remainder):
            allocations[order[i % len(order)]] += 1
    return allocations


def build_email_address(index: int, domain: str) -> str:
    return f"user{index:05d}@{domain}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo user data into ext API Postgres.")
    parser.add_argument("--user-id", required=True, help="Supabase user UUID for the demo account")
    parser.add_argument("--dataset", default=str(DATASET_DEFAULT), help="Path to demo dataset JSON")
    parser.add_argument("--env-file", default=str(ENV_DEFAULT), help="Path to .env.ext-api")
    parser.add_argument("--db-host")
    parser.add_argument("--db-port")
    parser.add_argument("--db-user")
    parser.add_argument("--db-password")
    parser.add_argument("--db-name")
    parser.add_argument("--db-sslmode")
    parser.add_argument("--apply", action="store_true", help="Apply inserts (default is dry-run)")
    parser.add_argument("--allow-existing", action="store_true", help="Allow seeding when user data exists")
    args = parser.parse_args()

    dataset = load_dataset(Path(args.dataset))
    ensure_dataset_consistency(dataset)

    db_config = resolve_db_config(args)

    conn = psycopg2.connect(
        host=db_config.host,
        port=db_config.port,
        dbname=db_config.dbname,
        user=db_config.user,
        password=db_config.password,
        sslmode=db_config.sslmode,
    )
    conn.autocommit = False
    cur = conn.cursor()

    user_id = args.user_id

    cur.execute("select count(*) from tasks where user_id = %s", (user_id,))
    existing_tasks = cur.fetchone()[0]
    cur.execute("select count(*) from credit_transactions where user_id = %s", (user_id,))
    existing_credits = cur.fetchone()[0]
    cur.execute("select count(*) from api_keys where user_id = %s", (user_id,))
    existing_keys = cur.fetchone()[0]
    cur.execute("select count(*) from batch_uploads where user_id = %s", (user_id,))
    existing_uploads = cur.fetchone()[0]

    if not args.allow_existing and any([existing_tasks, existing_credits, existing_keys, existing_uploads]):
        conn.rollback()
        cur.close()
        conn.close()
        raise SystemExit(
            "Existing demo data found for this user. Use --allow-existing to override."
        )

    tasks = dataset["tasks"]
    verification = dataset["verification"]
    usage = dataset["api_usage"]

    task_rows = []
    upload_rows = []
    task_lookup = []

    for task in tasks:
        task_id = uuid.uuid4()
        created_at = parse_datetime(task["date"], task["time"])
        updated_at = created_at
        is_file_backed = bool(task.get("is_file_backed"))
        task_rows.append(
            (
                str(task_id),
                user_id,
                None,
                created_at,
                updated_at,
                None,
                "frontend",
                is_file_backed,
                int(task.get("total", 0)),
                int(task.get("total", 0)) if task.get("status") == "completed" else 0,
                task.get("status") == "completed",
                None,
                None,
            )
        )
        task_lookup.append({**task, "id": str(task_id), "created_at": created_at})

        if is_file_backed:
            upload_id = uuid.uuid4()
            upload_created = created_at.replace(tzinfo=None)
            upload_updated = (created_at.replace(tzinfo=None))
            upload_rows.append(
                (
                    str(upload_id),
                    str(task_id),
                    task["file_name"],
                    user_id,
                    "completed",
                    upload_created,
                    upload_updated,
                    None,
                    None,
                    "email",
                    int(task["total"]),
                )
            )

    if not args.apply:
        print(f"Dry run: would insert {len(task_rows)} tasks and {len(upload_rows)} uploads.")
        cur.close()
        conn.close()
        return

    try:
        execute_values(
            cur,
            """
            insert into tasks (
                id, user_id, webhook_url, created_at, updated_at, deleted_at,
                source, is_file_backed, credit_reserved, credit_charged,
                credit_finalized, credit_reservation_tx_id, credit_refund_tx_id
            ) values %s
            """,
            task_rows,
        )

        if upload_rows:
            execute_values(
                cur,
                """
                insert into batch_uploads (
                    upload_id, task_id, filename, user_id, status, created_at,
                    updated_at, original_file_data, original_headers, email_column, email_count
                ) values %s
                """,
                upload_rows,
            )

        completed_tasks = [t for t in task_lookup if t.get("status") == "completed"]
        completed_totals = [t["total"] for t in completed_tasks]

        role_based_total = verification["total_role_based"]
        role_based_allocations = allocate_role_based(
            verification["total_verifications"],
            role_based_total,
            completed_totals,
        )

        invalid_remaining = {
            "invalid": verification["verification_status"]["not_exists"],
            "invalid_syntax": verification["verification_status"]["invalid_syntax"],
            "unknown": verification["verification_status"]["unknown"],
            "disposable_domain": verification["verification_status"]["disposable_domain_emails"],
        }

        verification_series = verification["series"]
        date_pool = []
        for point in verification_series:
            date_pool.extend([point["date"]] * point["total_verifications"])
        if len(date_pool) != verification["total_verifications"]:
            raise SystemExit("Verification date pool mismatch.")

        domains = ["acme.io", "lumen.co", "northwind.io", "skylab.ai", "quartzmail.com"]
        email_rows = []
        job_rows = []
        email_index = 1
        date_index = 0

        for task_index, task in enumerate(completed_tasks):
            task_id = task["id"]
            task_total = task["total"]
            valid_count = task["valid"]
            invalid_count = task["invalid"]
            catchall_count = task["catchall"]
            role_based_count = role_based_allocations[task_index]

            invalid_breakdown = allocate_invalid_breakdown(invalid_count, invalid_remaining)
            for key, value in invalid_breakdown.items():
                invalid_remaining[key] -= value

            status_plan = (
                ["valid"] * valid_count
                + ["catchall"] * catchall_count
                + ["invalid"] * invalid_breakdown["invalid"]
                + ["invalid_syntax"] * invalid_breakdown["invalid_syntax"]
                + ["unknown"] * invalid_breakdown["unknown"]
                + ["disposable_domain"] * invalid_breakdown["disposable_domain"]
            )

            if len(status_plan) != task_total:
                raise SystemExit("Status plan length mismatch for task.")

            for idx, status in enumerate(status_plan):
                if date_index >= len(date_pool):
                    raise SystemExit("Verification date pool exhausted.")
                date_value = date_pool[date_index]
                date_index += 1
                domain = domains[email_index % len(domains)]
                email_address = build_email_address(email_index, domain)
                email_index += 1

                validated_at = parse_datetime(date_value, "12:00:00")
                is_role_based = role_based_count > 0
                if is_role_based:
                    role_based_count -= 1

                email_id = uuid.uuid4()
                catchall_status = "valid" if status == "catchall" else "unknown"

                email_rows.append(
                    (
                        str(email_id),
                        status,
                        None,
                        None,
                        email_address,
                        is_role_based,
                        None,
                        None,
                        None,
                        0,
                        None,
                        validated_at,
                        validated_at,
                        validated_at,
                        None,
                        False,
                        None,
                        catchall_status,
                        None,
                    )
                )

                job_rows.append(
                    (
                        str(uuid.uuid4()),
                        str(task_id),
                        str(email_id),
                        email_address,
                        "completed",
                        validated_at,
                        validated_at,
                        None,
                    )
                )

        for task in task_lookup:
            if task.get("status") == "completed":
                continue
            task_id = task["id"]
            job_status = task.get("job_status", {})
            for status, count in job_status.items():
                for _ in range(int(count)):
                    created_at = task["created_at"]
                    domain = domains[email_index % len(domains)]
                    email_address = build_email_address(email_index, domain)
                    email_index += 1
                    job_rows.append(
                        (
                            str(uuid.uuid4()),
                            str(task_id),
                            None,
                            email_address,
                            status,
                            created_at,
                            created_at,
                            None,
                        )
                    )

        if invalid_remaining != {"invalid": 0, "invalid_syntax": 0, "unknown": 0, "disposable_domain": 0}:
            raise SystemExit("Invalid status allocation mismatch.")

        execute_values(
            cur,
            """
            insert into emails (
                id, status, domain_id, host_id, email_address, is_role_based,
                smtp_response_code, smtp_response_message, unknown_reason,
                failure_count, last_failure_at, validated_at,
                created_at, updated_at, deleted_at, needs_physical_verify,
                metadata, catchall_status, catchall_verification_sent_at
            ) values %s
            """,
            email_rows,
            page_size=1000,
        )

        execute_values(
            cur,
            """
            insert into task_email_jobs (
                id, task_id, email_id, email_address, status,
                created_at, updated_at, deleted_at
            ) values %s
            """,
            job_rows,
            page_size=1000,
        )

        grants = dataset["credits"]["grants"]
        credit_events = []
        for grant in grants:
            created_at = parse_datetime(grant["date"], grant["time"])
            credit_events.append(
                {
                    "type": "grant",
                    "amount": int(grant["amount"]),
                    "reason": grant.get("reason"),
                    "metadata": {"source": "seed"},
                    "created_at": created_at,
                }
            )

        for task in completed_tasks:
            created_at = task["created_at"]
            credit_events.append(
                {
                    "type": "deduction",
                    "amount": int(task["total"]),
                    "reason": f"Verification task {task.get('file_name', task['id'])}",
                    "metadata": {"task_id": task["id"], "source": "seed"},
                    "created_at": created_at,
                }
            )

        credit_events.sort(key=lambda item: item["created_at"])
        balance = 0
        credit_rows = []
        for event in credit_events:
            if event["type"] == "grant":
                balance += event["amount"]
            else:
                balance -= event["amount"]
            credit_rows.append(
                (
                    str(uuid.uuid4()),
                    user_id,
                    event["type"],
                    event["amount"],
                    balance,
                    event["reason"],
                    json.dumps(event["metadata"]),
                    event["created_at"],
                    event["created_at"],
                    None,
                )
            )

        execute_values(
            cur,
            """
            insert into credit_transactions (
                id, user_id, type, amount, balance_after, reason, metadata,
                created_at, updated_at, deleted_at
            ) values %s
            """,
            credit_rows,
        )

        api_keys = []
        usage_keys = dataset["api_usage"]["keys"]
        purpose_totals = dataset["api_usage"]["requests_by_purpose"]
        for key in usage_keys:
            key_id = str(uuid.uuid4())
            created_at = parse_datetime(key["created_date"], "09:00:00")
            api_keys.append(
                {
                    "id": key_id,
                    "user_id": user_id,
                    "key_hash": uuid.uuid4().hex,
                    "name": key["name"],
                    "purpose": key["purpose"],
                    "last_used_at": parse_datetime("2026-02-02", "10:15:00"),
                    "created_at": created_at,
                    "updated_at": parse_datetime("2026-02-02", "10:15:00"),
                    "is_active": True,
                    "usage_count": int(purpose_totals[key["purpose"]]),
                    "key_encrypted": None,
                    "key_preview": key["preview"],
                }
            )

        api_key_rows = [
            (
                item["id"],
                item["user_id"],
                item["key_hash"],
                item["name"],
                item["purpose"],
                item["last_used_at"],
                item["created_at"],
                item["updated_at"],
                None,
                item["is_active"],
                item["usage_count"],
                item["key_encrypted"],
                item["key_preview"],
            )
            for item in api_keys
        ]

        execute_values(
            cur,
            """
            insert into api_keys (
                id, user_id, key_hash, name, purpose, last_used_at,
                created_at, updated_at, deleted_at, is_active, usage_count,
                key_encrypted, key_preview
            ) values %s
            """,
            api_key_rows,
        )

        key_totals = {item["purpose"]: purpose_totals[item["purpose"]] for item in usage_keys}
        usage_allocations = build_daily_usage_allocations(
            usage["series"],
            key_totals,
        )

        usage_rows = []
        purpose_to_key_id = {item["purpose"]: item["id"] for item in api_keys}
        for idx, point in enumerate(usage["series"]):
            date_value = parse_date(point["date"])
            for purpose, allocations in usage_allocations.items():
                usage_rows.append(
                    (
                        purpose_to_key_id[purpose],
                        date_value,
                        allocations[idx],
                        parse_datetime(point["date"], "10:00:00"),
                        parse_datetime(point["date"], "10:00:00"),
                    )
                )

        execute_values(
            cur,
            """
            insert into api_key_usage_daily (
                api_key_id, date, usage_count, created_at, updated_at
            ) values %s
            """,
            usage_rows,
            page_size=500,
        )

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

    print("Seed complete.")


if __name__ == "__main__":
    main()
