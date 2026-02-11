import json
import logging
import time
import uuid
from typing import Dict, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from pydantic import BaseModel

from ..clients.external import (
    BatchFileUploadResponse,
    DownloadedFile,
    ExternalAPIClient,
    ExternalAPIError,
    TaskDetailResponse,
    TaskJobsResponse,
    TaskListResponse,
    TaskResponse,
    VerifyEmailResponse,
)
from ..core.auth import AuthContext, get_current_user
from ..core.settings import get_settings
from ..services.file_processing import _column_letters_to_index
from ..services.upload_notifications import process_bulk_upload_webhook

router = APIRouter(prefix="/api", tags=["tasks"])
logger = logging.getLogger(__name__)


class UploadFileMetadata(BaseModel):
    file_name: str
    email_column: str
    first_row_has_labels: bool = True
    remove_duplicates: bool = True


class LatestUploadResponse(BaseModel):
    task_id: str
    file_name: str
    created_at: Optional[str] = None
    status: Optional[str] = None
    email_count: Optional[int] = None
    valid_count: Optional[int] = None
    invalid_count: Optional[int] = None
    catchall_count: Optional[int] = None
    job_status: Optional[Dict[str, int]] = None


def _normalize_text(value: object) -> Optional[str]:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    return trimmed or None


def _is_file_backed_task(task: object) -> bool:
    if bool(getattr(task, "is_file_backed", False)):
        return True
    file_metadata = getattr(task, "file", None)
    if file_metadata is None:
        return False
    upload_id = _normalize_text(getattr(file_metadata, "upload_id", None))
    filename = _normalize_text(getattr(file_metadata, "filename", None))
    return bool(upload_id or filename)


def _task_created_sort_key(task: object) -> str:
    file_metadata = getattr(task, "file", None)
    file_created = _normalize_text(getattr(file_metadata, "created_at", None)) if file_metadata else None
    return file_created or _normalize_text(getattr(task, "created_at", None)) or ""


async def _resolve_upload_status_for_task(task: object, client: ExternalAPIClient, user_id: str):
    file_metadata = getattr(task, "file", None)
    upload_id = _normalize_text(getattr(file_metadata, "upload_id", None)) if file_metadata else None
    if not upload_id:
        return None
    try:
        return await client.get_upload_status(upload_id)
    except ExternalAPIError as exc:
        logger.info(
            "route.tasks.latest_upload.upload_status_unavailable",
            extra={
                "user_id": user_id,
                "task_id": getattr(task, "id", None),
                "upload_id": upload_id,
                "status_code": exc.status_code,
                "details": exc.details,
            },
        )
        return None
    except Exception:  # noqa: BLE001
        logger.exception(
            "route.tasks.latest_upload.upload_status_exception",
            extra={"user_id": user_id, "task_id": getattr(task, "id", None), "upload_id": upload_id},
        )
        return None


def _build_latest_upload_response(task: object, upload_status: object | None) -> Optional[LatestUploadResponse]:
    task_id = _normalize_text(getattr(task, "id", None))
    if not task_id:
        return None

    file_metadata = getattr(task, "file", None)
    file_name = (
        _normalize_text(getattr(upload_status, "filename", None))
        or _normalize_text(getattr(file_metadata, "filename", None))
        or _normalize_text(getattr(task, "file_name", None))
    )
    if not file_name:
        return None

    created_at = (
        _normalize_text(getattr(upload_status, "created_at", None))
        or _normalize_text(getattr(file_metadata, "created_at", None))
        or _normalize_text(getattr(task, "created_at", None))
    )
    status_value = _normalize_text(getattr(upload_status, "status", None)) or _normalize_text(getattr(task, "status", None))

    email_count = getattr(upload_status, "email_count", None)
    if email_count is None:
        email_count = getattr(file_metadata, "email_count", None) if file_metadata else None
    if email_count is None:
        email_count = getattr(task, "email_count", None)

    metrics = getattr(task, "metrics", None)
    job_status = getattr(metrics, "job_status", None) if metrics else None
    if job_status is None:
        job_status = getattr(task, "job_status", None)

    return LatestUploadResponse(
        task_id=task_id,
        file_name=file_name,
        created_at=created_at,
        status=status_value,
        email_count=email_count,
        valid_count=getattr(task, "valid_count", None),
        invalid_count=getattr(task, "invalid_count", None),
        catchall_count=getattr(task, "catchall_count", None),
        job_status=job_status,
    )


async def _resolve_latest_upload_rows(
    *,
    client: ExternalAPIClient,
    user: AuthContext,
    limit: int,
) -> list[LatestUploadResponse]:
    external_result = await client.list_tasks(limit=limit, offset=0)
    tasks = list(external_result.tasks or [])
    if not tasks:
        return []

    tasks.sort(key=_task_created_sort_key, reverse=True)

    latest_uploads: list[LatestUploadResponse] = []
    for task in tasks:
        if not _is_file_backed_task(task):
            continue
        upload_status = await _resolve_upload_status_for_task(task, client=client, user_id=user.user_id)
        latest_upload = _build_latest_upload_response(task, upload_status)
        if latest_upload is None:
            logger.info(
                "route.tasks.latest_upload.metadata_incomplete",
                extra={"user_id": user.user_id, "task_id": getattr(task, "id", None)},
            )
            continue
        latest_uploads.append(latest_upload)
        if len(latest_uploads) >= limit:
            break
    return latest_uploads


def get_user_external_client(user: AuthContext = Depends(get_current_user)) -> ExternalAPIClient:
    """
    Build an external API client using the caller's Supabase JWT.
    """
    settings = get_settings()
    return ExternalAPIClient(
        base_url=settings.email_api_base_url,
        bearer_token=user.token,
        max_upload_bytes=settings.upload_max_mb * 1024 * 1024,
    )


def _resolve_bulk_upload_webhook_url(
    *,
    request: Request,
    user_supplied_webhook_url: Optional[str],
) -> Optional[str]:
    explicit = _normalize_text(user_supplied_webhook_url)
    if explicit:
        return explicit

    settings = get_settings()
    configured = _normalize_text(settings.bulk_upload_webhook_url)
    if configured:
        return configured

    return str(request.url_for("bulk_upload_tasks_webhook"))


def normalize_email_column_mapping(email_column: str) -> tuple[str, int]:
    if not email_column:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email column is required")
    trimmed = email_column.strip()
    if not trimmed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email column is required")
    index = _column_letters_to_index(trimmed)
    if index is None or index < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email column must be a column letter or 1-based index",
        )
    return str(index + 1), index


@router.post("/tasks/webhooks/bulk-upload", name="bulk_upload_tasks_webhook")
async def bulk_upload_tasks_webhook(request: Request):
    raw_body = await request.body()
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        logger.warning("route.tasks.bulk_upload_webhook.invalid_json", extra={"error": str(exc)})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook payload") from exc

    result = await process_bulk_upload_webhook(payload=payload, raw_body=raw_body, headers=request.headers)
    return result


@router.post("/verify", response_model=VerifyEmailResponse)
async def verify_email(
    payload: dict,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    email = payload.get("email")
    batch_id = payload.get("batch_id")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email is required")
    if batch_id is not None and (not isinstance(batch_id, str) or not batch_id.strip()):
        logger.warning("route.verify.invalid_batch_id", extra={"user_id": user.user_id, "batch_id": batch_id})
        batch_id = None
    try:
        result = await client.verify_email(email=email)
        logger.info("route.verify", extra={"user_id": user.user_id, "email": email})
        if batch_id:
            logger.info(
                "route.verify.manual_persist_skipped",
                extra={"user_id": user.user_id, "task_id": batch_id, "email": email},
            )
        return result
    except ExternalAPIError as exc:
        if exc.status_code in (401, 403):
            logger.warning(
                "route.verify.unauthorized",
                extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
            )
            raise HTTPException(status_code=exc.status_code, detail="Not authorized to verify emails")
        logger.error(
            "route.verify.external_error",
            extra={
                "user_id": user.user_id,
                "email": email,
                "status_code": exc.status_code,
                "details": exc.details,
            },
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    payload: dict,
    user_id: Optional[str] = None,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    emails = payload.get("emails")
    webhook_url = payload.get("webhook_url")
    api_key_id = payload.get("api_key_id")
    if not emails or not isinstance(emails, list):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="emails array is required")
    if api_key_id:
        logger.info(
            "route.tasks.create.api_key_ignored",
            extra={"user_id": user.user_id, "api_key_id": api_key_id},
        )
    settings = get_settings()
    if len(emails) > settings.manual_max_emails:
        logger.warning(
            "route.tasks.create.limit_exceeded",
            extra={"user_id": user.user_id, "count": len(emails), "limit": settings.manual_max_emails},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Manual verification limit exceeded. Maximum is {settings.manual_max_emails} emails.",
        )
    if user_id:
        logger.warning(
            "route.tasks.create.user_id_not_supported",
            extra={"user_id": user.user_id, "requested_user_id": user_id, "role": user.role},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id is not supported for manual task creation.",
        )
    try:
        target_user_id = user.user_id
        manual_emails = [email.strip() for email in emails if isinstance(email, str) and email.strip()]
        result = await client.create_task(emails=emails, webhook_url=webhook_url)
        if result.id:
            logger.info(
                "route.tasks.create.manual_emails_skipped",
                extra={"user_id": target_user_id, "task_id": result.id, "email_count": len(manual_emails)},
            )
        logger.info("route.tasks.create", extra={"user_id": target_user_id, "count": len(emails)})
        return result
    except HTTPException:
        raise
    except ExternalAPIError as exc:
        if exc.status_code in (401, 403):
            logger.warning(
                "route.tasks.create.unauthorized",
                extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
            )
            raise HTTPException(status_code=exc.status_code, detail="Not authorized to create tasks")
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])
    except Exception as exc:  # noqa: BLE001
        logger.exception("route.tasks.create.exception", extra={"user_id": user.user_id, "error": str(exc)})
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to create task") from exc


@router.get("/tasks", response_model=TaskListResponse)
async def list_tasks(
    limit: int = 10,
    offset: int = 0,
    refresh: bool = False,
    api_key_id: Optional[str] = None,
    user_id: Optional[str] = None,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    start = time.time()
    target_user_id = user.user_id
    list_user_id = None
    if user_id:
        if user.role != "admin":
            logger.warning(
                "route.tasks.list.forbidden_user_id",
                extra={"user_id": user.user_id, "requested_user_id": user_id},
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
        target_user_id = user_id
        list_user_id = user_id
        logger.info(
            "route.tasks.list.admin_scope",
            extra={"admin_user_id": user.user_id, "target_user_id": target_user_id},
        )
    if api_key_id:
        logger.info(
            "route.tasks.list.api_key_filter_ignored",
            extra={"user_id": target_user_id, "api_key_id": api_key_id},
        )
    if refresh:
        logger.info(
            "route.tasks.list.refresh_ignored",
            extra={"user_id": target_user_id, "limit": limit, "offset": offset},
        )
    try:
        external_result = await client.list_tasks(limit=limit, offset=offset, user_id=list_user_id)
        logger.info(
            "route.tasks.list.external",
            extra={
                "user_id": target_user_id,
                "limit": limit,
                "offset": offset,
                "count": external_result.count,
                "returned": len(external_result.tasks or []),
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        return external_result
    except ExternalAPIError as exc:
        level = logger.warning if exc.status_code in (401, 403) else logger.error
        level(
            "route.tasks.list.failed",
            extra={
                "user_id": target_user_id,
                "status_code": exc.status_code,
                "details": exc.details,
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or "Unable to fetch tasks")
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "route.tasks.list.exception",
            extra={"user_id": target_user_id, "duration_ms": round((time.time() - start) * 1000, 2), "error": str(exc)},
        )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Upstream tasks service error") from exc


@router.get("/tasks/latest-upload", response_model=LatestUploadResponse)
async def get_latest_upload(
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    settings = get_settings()
    try:
        latest_uploads = await _resolve_latest_upload_rows(client=client, user=user, limit=settings.latest_uploads_limit)
        if not latest_uploads:
            logger.info(
                "route.tasks.latest_upload.no_content",
                extra={"user_id": user.user_id},
            )
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        return latest_uploads[0]
    except ExternalAPIError as exc:
        level = logger.warning if exc.status_code in (401, 403) else logger.error
        level(
            "route.tasks.latest_upload.failed",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or "Unable to fetch latest upload")
    except Exception as exc:  # noqa: BLE001
        logger.exception("route.tasks.latest_upload.exception", extra={"user_id": user.user_id})
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Upstream tasks service error") from exc


@router.get("/tasks/latest-uploads", response_model=list[LatestUploadResponse])
async def get_latest_uploads(
    limit: Optional[int] = Query(default=None),
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    if limit is not None and limit <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="limit must be greater than zero")
    settings = get_settings()
    resolved_limit = limit if limit is not None else settings.latest_uploads_limit
    try:
        latest_uploads = await _resolve_latest_upload_rows(client=client, user=user, limit=resolved_limit)
        if not latest_uploads:
            logger.info(
                "route.tasks.latest_uploads.no_content",
                extra={"user_id": user.user_id, "limit": resolved_limit},
            )
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        return latest_uploads
    except ExternalAPIError as exc:
        level = logger.warning if exc.status_code in (401, 403) else logger.error
        level(
            "route.tasks.latest_uploads.failed",
            extra={
                "user_id": user.user_id,
                "limit": resolved_limit,
                "status_code": exc.status_code,
                "details": exc.details,
            },
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or "Unable to fetch latest uploads")
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "route.tasks.latest_uploads.exception",
            extra={"user_id": user.user_id, "limit": resolved_limit},
        )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Upstream tasks service error") from exc


@router.get("/tasks/{task_id}/jobs", response_model=TaskJobsResponse)
async def list_task_jobs(
    task_id: uuid.UUID,
    limit: int = 10,
    offset: int = 0,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    start = time.time()
    if limit <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="limit must be greater than zero")
    if offset < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="offset must be greater than or equal to zero")
    task_id_str = str(task_id)
    try:
        result = await client.list_task_jobs(task_id_str, limit=limit, offset=offset)
        logger.info(
            "route.tasks.jobs",
            extra={
                "user_id": user.user_id,
                "task_id": task_id_str,
                "limit": limit,
                "offset": offset,
                "returned": len(result.jobs or []),
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        return result
    except ExternalAPIError as exc:
        level = logger.warning if exc.status_code in (401, 403) else logger.error
        level(
            "route.tasks.jobs.failed",
            extra={
                "user_id": user.user_id,
                "task_id": task_id_str,
                "status_code": exc.status_code,
                "details": exc.details,
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or "Unable to fetch task jobs")
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "route.tasks.jobs.exception",
            extra={
                "user_id": user.user_id,
                "task_id": task_id_str,
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Upstream tasks service error") from exc


@router.get("/tasks/{task_id}", response_model=TaskDetailResponse)
async def get_task_detail(
    task_id: uuid.UUID,
    user: AuthContext = Depends(get_current_user),
    api_key_id: Optional[str] = None,
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    start = time.time()
    task_id_str = str(task_id)
    try:
        result = await client.get_task_detail(task_id_str)
        logger.info(
            "route.tasks.detail",
            extra={
                "user_id": user.user_id,
                "task_id": task_id_str,
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        return result
    except HTTPException:
        raise
    except ExternalAPIError as exc:
        level = logger.warning if exc.status_code in (401, 403) else logger.error
        level(
            "route.tasks.detail.failed",
            extra={
                "user_id": user.user_id,
                "task_id": task_id_str,
                "status_code": exc.status_code,
                "details": exc.details,
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or "Unable to fetch task detail")
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "route.tasks.detail.exception",
            extra={
                "user_id": user.user_id,
                "task_id": task_id_str,
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Upstream tasks service error") from exc


@router.post("/tasks/upload", response_model=list[BatchFileUploadResponse])
async def upload_task_file(
    request: Request,
    files: list[UploadFile] = File(...),
    file_metadata: str = Form(...),
    webhook_url: Optional[str] = Form(default=None),
    api_key_id: Optional[str] = Form(default=None),
    user_id: Optional[str] = None,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    responses: list[BatchFileUploadResponse] = []
    target_user_id = user.user_id
    resolved_webhook_url = _resolve_bulk_upload_webhook_url(
        request=request,
        user_supplied_webhook_url=webhook_url,
    )

    if _normalize_text(webhook_url):
        logger.info(
            "route.tasks.upload.custom_webhook_url",
            extra={
                "user_id": target_user_id,
                "custom_webhook_url": _normalize_text(webhook_url),
                "internal_notification_webhook_used": False,
            },
        )
    if user_id:
        logger.warning(
            "route.tasks.upload.user_id_not_supported",
            extra={"user_id": user.user_id, "requested_user_id": user_id, "role": user.role},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id is not supported for batch uploads.",
        )
    if api_key_id:
        logger.info(
            "route.tasks.upload.api_key_ignored",
            extra={"user_id": target_user_id, "api_key_id": api_key_id},
        )

    try:
        metadata_payload = json.loads(file_metadata)
        if not isinstance(metadata_payload, list):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="file_metadata must be a list")
        metadata_items = [UploadFileMetadata(**item) for item in metadata_payload]
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        logger.warning("route.tasks.upload.invalid_metadata", extra={"error": str(exc)})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file metadata payload") from exc

    metadata_by_name = {}
    for item in metadata_items:
        if item.file_name in metadata_by_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate file metadata entries")
        metadata_by_name[item.file_name] = item

    upload_names = [upload.filename or "" for upload in files]
    if any(not name for name in upload_names):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="All uploaded files must have names")
    if len(set(upload_names)) != len(upload_names):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate file names detected")

    prepared_uploads = []
    for file in files:
        metadata = metadata_by_name.get(file.filename or "")
        if not metadata:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing file metadata")
        if metadata.remove_duplicates or not metadata.first_row_has_labels:
            logger.info(
                "route.tasks.upload.flags_ignored",
                extra={
                    "user_id": target_user_id,
                    "file_name": file.filename,
                    "remove_duplicates": metadata.remove_duplicates,
                    "first_row_has_labels": metadata.first_row_has_labels,
                },
            )
        email_column_value, email_column_index = normalize_email_column_mapping(metadata.email_column)
        data = await file.read()
        prepared_uploads.append(
            {
                "file": file,
                "metadata": metadata,
                "data": data,
                "email_column_value": email_column_value,
                "email_column_index": email_column_index,
            }
        )

    for item in prepared_uploads:
        try:
            result = await client.upload_batch_file(
                filename=item["file"].filename or "upload",
                content=item["data"],
                webhook_url=resolved_webhook_url,
                email_column=item["email_column_value"],
            )
            task_id = result.task_id
            if not task_id:
                logger.error(
                    "route.tasks.upload.missing_task_id",
                    extra={
                        "user_id": target_user_id,
                        "file_name": item["file"].filename,
                        "upload_id": result.upload_id,
                    },
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY, detail="Task id missing from upload response"
                )
            if result.email_count is None:
                logger.error(
                    "route.tasks.upload.missing_email_count",
                    extra={
                        "user_id": target_user_id,
                        "file_name": item["file"].filename,
                        "task_id": task_id,
                        "upload_id": result.upload_id,
                    },
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Email count missing from upload response",
                )
            email_count = int(result.email_count)
            logger.info(
                "route.tasks.upload",
                extra={
                    "user_id": target_user_id,
                    "file_name": item["file"].filename,
                    "task_id": task_id,
                    "upload_id": result.upload_id,
                    "email_count": email_count,
                },
            )
            responses.append(
                BatchFileUploadResponse(
                    filename=result.filename or item["file"].filename,
                    task_id=task_id,
                    upload_id=result.upload_id,
                    uploaded_at=result.uploaded_at,
                    status=result.status,
                    message=result.message,
                    email_count=email_count,
                )
            )
        except HTTPException as exc:
            raise exc
        except ExternalAPIError as exc:
            if exc.status_code in (401, 403):
                logger.warning(
                    "route.tasks.upload.unauthorized",
                    extra={"user_id": target_user_id, "status_code": exc.status_code, "details": exc.details},
                )
            raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])
        except Exception as exc:  # noqa: BLE001
            logger.exception(
                "route.tasks.upload.exception",
                extra={"user_id": target_user_id, "file_name": item["file"].filename, "error": str(exc)},
            )
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to upload file") from exc

    return responses


@router.get("/tasks/{task_id}/download")
async def download_task_results(
    task_id: uuid.UUID,
    file_format: Optional[str] = Query(default=None, alias="format"),
    user_id: Optional[str] = None,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    target_user_id = user.user_id
    task_id_str = str(task_id)
    if user_id:
        if user.role != "admin":
            logger.warning(
                "route.tasks.download.forbidden_user_id",
                extra={"user_id": user.user_id, "requested_user_id": user_id},
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
        target_user_id = user_id
        logger.info(
            "route.tasks.download.admin_scope",
            extra={"admin_user_id": user.user_id, "target_user_id": target_user_id},
        )

    try:
        download: DownloadedFile = await client.download_task_results(task_id=task_id_str, file_format=file_format)
    except ExternalAPIError as exc:
        logger.warning(
            "route.tasks.download.external_failed",
            extra={
                "user_id": target_user_id,
                "task_id": task_id_str,
                "status_code": exc.status_code,
                "details": exc.details,
            },
        )
        raise HTTPException(
            status_code=exc.status_code, detail=exc.details or "Unable to fetch task download"
        ) from exc

    content_type = download.content_type
    if not content_type:
        logger.warning(
            "route.tasks.download.missing_content_type",
            extra={"user_id": target_user_id, "task_id": task_id_str},
        )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Upstream download missing content type")

    response_headers: dict[str, str] = {}
    content_disposition = download.content_disposition
    if content_disposition:
        response_headers["Content-Disposition"] = content_disposition
    logger.debug(
        "route.tasks.download.headers",
        extra={
            "user_id": target_user_id,
            "task_id": task_id_str,
            "content_type": content_type,
            "has_content_disposition": bool(content_disposition),
        },
    )
    logger.info(
        "route.tasks.download",
        extra={"user_id": target_user_id, "task_id": task_id_str, "format": file_format},
    )
    return Response(content=download.content, media_type=content_type, headers=response_headers)
