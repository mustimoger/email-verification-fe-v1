import logging
import os
from pathlib import Path
from typing import Tuple

from slugify import slugify

from fastapi import HTTPException, UploadFile, status

logger = logging.getLogger(__name__)


def _uploads_root() -> Path:
    return Path(__file__).resolve().parents[3] / "uploads"


def uploads_root() -> Path:
    return _uploads_root()


def relative_upload_path(path: Path) -> str:
    return str(path.relative_to(_uploads_root()))


def absolute_upload_path(relative_path: str) -> Path:
    return _uploads_root() / relative_path


def build_output_path(user_id: str, original_name: str, task_id: str) -> Tuple[Path, str]:
    root = _uploads_root() / user_id / "outputs"
    root.mkdir(parents=True, exist_ok=True)
    base = Path(original_name)
    safe_stem = slugify(base.stem)
    if not safe_stem:
        safe_stem = f"task-{task_id}"
    filename = f"{safe_stem}-verified-{task_id}{base.suffix}"
    return root / filename, filename


async def persist_upload_file(upload: UploadFile, user_id: str, max_bytes: int) -> Tuple[Path, bytes]:
    filename = upload.filename or "upload"
    safe_name = os.path.basename(filename)
    data = await upload.read()
    if len(data) > max_bytes:
        logger.warning(
            "upload.too_large",
            extra={"filename": safe_name, "size": len(data), "max_bytes": max_bytes, "user_id": user_id},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size ({max_bytes} bytes)",
        )

    root = _uploads_root() / user_id
    root.mkdir(parents=True, exist_ok=True)
    target = root / safe_name
    target.write_bytes(data)
    logger.info(
        "upload.saved",
        extra={"filename": safe_name, "bytes": len(data), "path": str(target), "user_id": user_id},
    )
    return target, data
