import logging
from typing import Dict, List, Optional

from supabase import Client

from .supabase_client import get_supabase

logger = logging.getLogger(__name__)


def upsert_task_file(
    *,
    user_id: str,
    task_id: str,
    file_name: str,
    file_extension: str,
    source_path: Optional[str],
    email_column: str,
    email_column_index: int,
    first_row_has_labels: bool,
    remove_duplicates: bool,
    output_path: Optional[str] = None,
) -> Optional[str]:
    sb: Client = get_supabase()
    payload = {
        "user_id": user_id,
        "task_id": task_id,
        "file_name": file_name,
        "file_extension": file_extension,
        "source_path": source_path,
        "output_path": output_path,
        "email_column": email_column,
        "email_column_index": email_column_index,
        "first_row_has_labels": first_row_has_labels,
        "remove_duplicates": remove_duplicates,
    }
    try:
        res = sb.table("task_files").upsert(payload, on_conflict="task_id").execute()
        record = (res.data or [{}])[0]
        logger.info("task_files.upsert", extra={"user_id": user_id, "task_id": task_id})
        return record.get("id")
    except Exception as exc:  # noqa: BLE001
        logger.error("task_files.upsert_failed", extra={"user_id": user_id, "task_id": task_id, "error": str(exc)})
        return None


def fetch_task_files(user_id: str, task_ids: List[str]) -> Dict[str, str]:
    if not task_ids:
        return {}
    sb: Client = get_supabase()
    try:
        res = (
            sb.table("task_files")
            .select("task_id,file_name")
            .eq("user_id", user_id)
            .in_("task_id", task_ids)
            .execute()
        )
        rows = res.data or []
        return {row.get("task_id"): row.get("file_name") for row in rows if row.get("task_id")}
    except Exception as exc:  # noqa: BLE001
        logger.error("task_files.fetch_failed", extra={"user_id": user_id, "error": str(exc)})
        return {}


def fetch_task_file(user_id: str, task_id: str) -> Optional[dict]:
    sb: Client = get_supabase()
    try:
        res = (
            sb.table("task_files")
            .select("*")
            .eq("user_id", user_id)
            .eq("task_id", task_id)
            .limit(1)
            .execute()
        )
        return (res.data or [None])[0]
    except Exception as exc:  # noqa: BLE001
        logger.error("task_files.fetch_one_failed", extra={"user_id": user_id, "task_id": task_id, "error": str(exc)})
        return None


def update_task_file_output(user_id: str, task_id: str, output_path: str) -> None:
    sb: Client = get_supabase()
    try:
        sb.table("task_files").update({"output_path": output_path}).eq("user_id", user_id).eq("task_id", task_id).execute()
        logger.info("task_files.output_updated", extra={"user_id": user_id, "task_id": task_id})
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "task_files.output_update_failed",
            extra={"user_id": user_id, "task_id": task_id, "error": str(exc)},
        )
