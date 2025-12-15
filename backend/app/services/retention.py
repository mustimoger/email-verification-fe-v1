import logging
import os
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Tuple

from ..core.settings import get_settings
from .supabase_client import fetch_credits

logger = logging.getLogger(__name__)


def _uploads_root() -> Path:
    return Path(__file__).resolve().parents[3] / "uploads"


def purge_expired_uploads(now: datetime | None = None) -> List[Tuple[str, str]]:
    """
    Purge uploads older than retention_days. If upload_retention_when_credits is \"non_zero\"
    and the user has credits_remaining > 0, we retain files newer than retention_days.
    Returns list of (user_id, filename) deleted.
    """
    settings = get_settings()
    retention_days = settings.upload_retention_days
    cutoff = (now or datetime.now(timezone.utc)) - timedelta(days=retention_days)

    deleted: List[Tuple[str, str]] = []
    root = _uploads_root()
    if not root.exists():
        return deleted

    for user_dir in root.iterdir():
        if not user_dir.is_dir():
            continue
        user_id = user_dir.name
        credits = fetch_credits(user_id)
        for file_path in user_dir.iterdir():
            if not file_path.is_file():
                continue
            try:
                mtime = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc)
            except Exception as exc:
                logger.warning("retention.stat_failed", extra={"file": str(file_path), "error": str(exc)})
                continue

            if mtime > cutoff and settings.upload_retention_when_credits == "non_zero" and credits > 0:
                continue

            try:
                file_path.unlink()
                deleted.append((user_id, file_path.name))
                logger.info(
                    "retention.deleted",
                    extra={"user_id": user_id, "file": file_path.name, "mtime": mtime.isoformat(), "credits": credits},
                )
            except Exception as exc:
                logger.error("retention.delete_failed", extra={"file": str(file_path), "error": str(exc)})

        # Clean up empty user directories
        if not any(user_dir.iterdir()):
            try:
                shutil.rmtree(user_dir)
            except Exception as exc:
                logger.warning("retention.rmdir_failed", extra={"dir": str(user_dir), "error": str(exc)})

    return deleted
