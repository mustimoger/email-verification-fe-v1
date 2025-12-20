import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Optional, Set

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from pydantic import BaseModel

from ..clients.external import (
    BatchFileUploadResponse,
    DownloadedFile,
    ExternalAPIClient,
    ExternalAPIError,
    Task,
    TaskDetailResponse,
    TaskListResponse,
    TaskResponse,
    VerifyEmailResponse,
)
from ..core.auth import AuthContext, get_current_user
from ..core.settings import get_settings
from ..services.file_processing import _column_letters_to_index
from ..services.task_files_store import fetch_task_file, upsert_task_file
from ..services.tasks_store import fetch_tasks_with_counts, upsert_task_from_detail, upsert_tasks_from_list
from ..services.api_keys import INTERNAL_DASHBOARD_KEY_NAME, get_cached_key_by_name
from ..services.usage import record_usage

router = APIRouter(prefix="/api", tags=["tasks"])
logger = logging.getLogger(__name__)


class UploadFileMetadata(BaseModel):
    file_name: str
    email_column: str
    first_row_has_labels: bool = True
    remove_duplicates: bool = True


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


def resolve_task_api_key_id(user_id: str, api_key_id: Optional[str]) -> Optional[str]:
    if api_key_id:
        return api_key_id
    cached = get_cached_key_by_name(user_id, INTERNAL_DASHBOARD_KEY_NAME)
    if cached and cached.get("key_id"):
        return cached["key_id"]
    logger.info("tasks.api_key_id.unavailable", extra={"user_id": user_id})
    return None


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


async def poll_tasks_after_upload(
    client: ExternalAPIClient,
    user_id: str,
    integration: Optional[str],
    attempts: int,
    interval_seconds: float,
    page_size: int,
    baseline_ids: Set[str],
    api_key_id: Optional[str] = None,
    list_user_id: Optional[str] = None,
) -> Optional[TaskListResponse]:
    """
    Poll recent tasks after an upload to capture new task_ids and upsert into Supabase.
    Stops early when a new task id appears beyond the baseline.
    """
    latest: Optional[TaskListResponse] = None
    for attempt in range(1, attempts + 1):
        try:
            latest = await client.list_tasks(limit=page_size, offset=0, user_id=list_user_id)
            tasks = latest.tasks or []
            if tasks:
                upsert_tasks_from_list(user_id, tasks, integration=integration)
            new_ids = {task.id for task in tasks or [] if task and task.id} - baseline_ids
            if api_key_id and new_ids:
                new_tasks = [task for task in tasks if task and task.id in new_ids]
                upsert_tasks_from_list(user_id, new_tasks, integration=integration, api_key_id=api_key_id)
            logger.info(
                "route.tasks.upload.poll",
                extra={
                    "user_id": user_id,
                    "attempt": attempt,
                    "new_tasks": len(new_ids),
                    "returned": len(tasks),
                    "total_count": latest.count,
                },
            )
            if new_ids:
                break
        except ExternalAPIError as exc:
            logger.warning(
                "route.tasks.upload.poll_failed",
                extra={"user_id": user_id, "attempt": attempt, "status_code": exc.status_code, "details": exc.details},
            )
        if attempt < attempts:
            await asyncio.sleep(interval_seconds)
    return latest


@router.post("/verify", response_model=VerifyEmailResponse)
async def verify_email(
    payload: dict,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email is required")
    try:
        result = await client.verify_email(email=email)
        record_usage(user.user_id, path="/verify", count=1, api_key_id=None)
        logger.info("route.verify", extra={"user_id": user.user_id, "email": email})
        return result
    except ExternalAPIError as exc:
        if exc.status_code in (401, 403):
            logger.warning(
                "route.verify.unauthorized",
                extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
            )
            raise HTTPException(status_code=exc.status_code, detail="Not authorized to verify emails")
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
    try:
        target_user_id = user.user_id
        if user_id:
            if user.role != "admin":
                logger.warning(
                    "route.tasks.create.forbidden_user_id",
                    extra={"user_id": user.user_id, "requested_user_id": user_id},
                )
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
            target_user_id = user_id
            logger.info(
                "route.tasks.create.admin_scope",
                extra={"admin_user_id": user.user_id, "target_user_id": target_user_id},
            )
        result = await client.create_task(emails=emails, user_id=target_user_id, webhook_url=webhook_url)
        resolved_api_key_id = resolve_task_api_key_id(target_user_id, api_key_id)
        upsert_tasks_from_list(
            target_user_id,
            [TaskResponse(**result.model_dump())],
            integration=None,
            api_key_id=resolved_api_key_id,
        )
        record_usage(target_user_id, path="/tasks", count=len(emails), api_key_id=None)
        logger.info("route.tasks.create", extra={"user_id": target_user_id, "count": len(emails)})
        return result
    except ExternalAPIError as exc:
        if exc.status_code in (401, 403):
            logger.warning(
                "route.tasks.create.unauthorized",
                extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
            )
            raise HTTPException(status_code=exc.status_code, detail="Not authorized to create tasks")
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


@router.get("/tasks", response_model=TaskListResponse)
async def list_tasks(
    limit: int = 10,
    offset: int = 0,
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
    # Supabase is primary source for history; return cached tasks first
    fallback = fetch_tasks_with_counts(target_user_id, limit=limit, offset=offset, api_key_id=api_key_id)
    tasks_data = fallback.get("tasks") or []
    supa_tasks: list[Task] = []
    for row in tasks_data:
        supa_tasks.append(
            Task(
                id=row.get("task_id"),
                user_id=row.get("user_id"),
                status=row.get("status"),
                email_count=row.get("email_count"),
                valid_count=row.get("valid_count"),
                invalid_count=row.get("invalid_count"),
                catchall_count=row.get("catchall_count"),
                integration=row.get("integration"),
                created_at=row.get("created_at"),
                updated_at=row.get("updated_at"),
            )
        )
    count_value = fallback.get("count") if isinstance(fallback, dict) else None
    if supa_tasks:
        record_usage(target_user_id, path="/tasks", count=len(supa_tasks), api_key_id=api_key_id)
        logger.info(
            "route.tasks.list.supabase_primary",
            extra={
                "user_id": target_user_id,
                "limit": limit,
                "offset": offset,
                "returned": len(supa_tasks),
                "count": count_value,
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        return TaskListResponse(count=count_value or len(supa_tasks), limit=limit, offset=offset, tasks=supa_tasks)

    # If Supabase is empty, sync from external and upsert
    if api_key_id:
        record_usage(
            target_user_id,
            path="/tasks",
            count=0,
            api_key_id=api_key_id,
        )
        logger.info(
            "route.tasks.list.key_scope_empty",
            extra={
                "user_id": target_user_id,
                "api_key_id": api_key_id,
                "limit": limit,
                "offset": offset,
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        return TaskListResponse(count=0, limit=limit, offset=offset, tasks=[])
    try:
        external_result = await client.list_tasks(limit=limit, offset=offset, user_id=list_user_id)
        if external_result.tasks:
            upsert_tasks_from_list(target_user_id, external_result.tasks, integration=None)
        record_usage(target_user_id, path="/tasks", count=len(external_result.tasks or []), api_key_id=api_key_id)
        logger.info(
            "route.tasks.list.external_refresh",
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
        if exc.status_code in (401, 403):
            logger.warning(
                "route.tasks.list.unauthorized",
                extra={
                    "user_id": target_user_id,
                    "status_code": exc.status_code,
                    "details": exc.details,
                    "duration_ms": round((time.time() - start) * 1000, 2),
                },
            )
        else:
            logger.error(
                "route.tasks.list.failed",
                extra={
                    "user_id": target_user_id,
                    "status_code": exc.status_code,
                    "details": exc.details,
                    "duration_ms": round((time.time() - start) * 1000, 2),
                },
            )
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "route.tasks.list.exception",
            extra={"user_id": target_user_id, "duration_ms": round((time.time() - start) * 1000, 2), "error": str(exc)},
        )

    # Nothing in Supabase and external failed/empty
    record_usage(
        target_user_id,
        path="/tasks",
        count=0,
        api_key_id=api_key_id,
    )
    logger.info(
        "route.tasks.list.empty_fallback",
        extra={
            "user_id": target_user_id,
            "limit": limit,
            "offset": offset,
            "duration_ms": round((time.time() - start) * 1000, 2),
        },
    )
    return TaskListResponse(count=0, limit=limit, offset=offset, tasks=[])


@router.get("/tasks/{task_id}", response_model=TaskDetailResponse)
async def get_task_detail(
    task_id: str,
    user: AuthContext = Depends(get_current_user),
    api_key_id: Optional[str] = None,
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    start = time.time()
    try:
        result = await client.get_task_detail(task_id)
        if result.jobs is not None:
            counts = {"valid": 0, "invalid": 0, "catchall": 0}
            for job in result.jobs:
                status = (job.email and job.email.get("status")) or job.status
                if status == "exists":
                    counts["valid"] += 1
                elif status == "catchall":
                    counts["catchall"] += 1
                else:
                    counts["invalid"] += 1
                upsert_task_from_detail(
                    user.user_id,
                    result,
                    counts=counts,
                    integration=None,
                    api_key_id=api_key_id,
                )
        record_usage(user.user_id, path="/tasks/{id}", count=1, api_key_id=api_key_id)
        logger.info(
            "route.tasks.detail",
            extra={
                "user_id": user.user_id,
                "task_id": task_id,
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        return result
    except ExternalAPIError as exc:
        level = logger.warning if exc.status_code in (401, 403) else logger.error
        level(
            "route.tasks.detail.failed",
            extra={
                "user_id": user.user_id,
                "task_id": task_id,
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
                "task_id": task_id,
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Upstream tasks service error") from exc


@router.post("/tasks/upload", response_model=list[BatchFileUploadResponse])
async def upload_task_file(
    files: list[UploadFile] = File(...),
    file_metadata: str = Form(...),
    webhook_url: Optional[str] = Form(default=None),
    api_key_id: Optional[str] = Form(default=None),
    user_id: Optional[str] = None,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    settings = get_settings()
    responses: list[BatchFileUploadResponse] = []
    target_user_id = user.user_id
    if user_id:
        if user.role != "admin":
            logger.warning(
                "route.tasks.upload.forbidden_user_id",
                extra={"user_id": user.user_id, "requested_user_id": user_id},
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
        target_user_id = user_id
        logger.info(
            "route.tasks.upload.admin_scope",
            extra={"admin_user_id": user.user_id, "target_user_id": target_user_id},
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

    resolved_api_key_id = resolve_task_api_key_id(target_user_id, api_key_id)
    for file in files:
        try:
            metadata = metadata_by_name.get(file.filename or "")
            if not metadata:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing file metadata")
            if metadata.remove_duplicates or not metadata.first_row_has_labels:
                logger.info(
                    "route.tasks.upload.flags_ignored",
                    extra={
                        "user_id": target_user_id,
                        "filename": file.filename,
                        "remove_duplicates": metadata.remove_duplicates,
                        "first_row_has_labels": metadata.first_row_has_labels,
                    },
                )
            email_column_value, email_column_index = normalize_email_column_mapping(metadata.email_column)
            data = await file.read()
            result = await client.upload_batch_file(
                filename=file.filename or "upload",
                content=data,
                user_id=target_user_id,
                webhook_url=webhook_url,
                email_column=email_column_value,
            )
            task_id = result.task_id
            if not task_id:
                logger.error(
                    "route.tasks.upload.missing_task_id",
                    extra={"user_id": target_user_id, "filename": file.filename, "upload_id": result.upload_id},
                )
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Task id missing from upload response")
            upsert_tasks_from_list(
                target_user_id,
                [
                    Task(
                        id=task_id,
                        user_id=target_user_id,
                        status=result.status,
                    )
                ],
                integration=None,
                api_key_id=resolved_api_key_id,
            )
            logger.info(
                "route.tasks.upload.usage_skipped",
                extra={"user_id": target_user_id, "task_id": task_id, "reason": "email_count_unknown"},
            )
            task_file_id = upsert_task_file(
                user_id=target_user_id,
                task_id=task_id,
                file_name=file.filename or "upload",
                file_extension=Path(file.filename or "upload").suffix.lower(),
                source_path=None,
                email_column=metadata.email_column,
                email_column_index=email_column_index,
                first_row_has_labels=metadata.first_row_has_labels,
                remove_duplicates=metadata.remove_duplicates,
            )
            logger.info(
                "route.tasks.upload",
                extra={
                    "user_id": target_user_id,
                    "filename": file.filename,
                    "task_id": task_id,
                    "upload_id": result.upload_id,
                },
            )
            responses.append(
                BatchFileUploadResponse(
                    filename=result.filename or file.filename,
                    task_id=task_id,
                    upload_id=result.upload_id,
                    uploaded_at=result.uploaded_at,
                    status=result.status,
                    message=result.message,
                )
            )
        except ExternalAPIError as exc:
            if exc.status_code in (401, 403):
                logger.warning(
                    "route.tasks.upload.unauthorized",
                    extra={"user_id": target_user_id, "status_code": exc.status_code, "details": exc.details},
                )
            raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])

    return responses


@router.get("/tasks/{task_id}/download")
async def download_task_results(
    task_id: str,
    file_format: Optional[str] = Query(default=None, alias="format"),
    user_id: Optional[str] = None,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    target_user_id = user.user_id
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
        task_file = fetch_task_file(target_user_id, task_id)
        if not task_file:
            logger.info("route.tasks.download.missing_file", extra={"user_id": target_user_id, "task_id": task_id})
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task file not found")
        download: DownloadedFile = await client.download_task_results(task_id=task_id, file_format=file_format)
    except ExternalAPIError as exc:
        logger.warning(
            "route.tasks.download.external_failed",
            extra={"user_id": target_user_id, "task_id": task_id, "status_code": exc.status_code, "details": exc.details},
        )
        raise HTTPException(
            status_code=exc.status_code, detail=exc.details or "Unable to fetch task download"
        ) from exc

    content_type = download.content_type
    if not content_type:
        logger.warning(
            "route.tasks.download.missing_content_type",
            extra={"user_id": target_user_id, "task_id": task_id},
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
            "task_id": task_id,
            "content_type": content_type,
            "has_content_disposition": bool(content_disposition),
        },
    )
    logger.info(
        "route.tasks.download",
        extra={"user_id": target_user_id, "task_id": task_id, "format": file_format},
    )
    return Response(content=download.content, media_type=content_type, headers=response_headers)
