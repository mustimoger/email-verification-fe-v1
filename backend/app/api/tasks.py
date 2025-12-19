import asyncio
import logging
import time
from typing import Optional, Set

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from ..clients.external import (
    BatchFileUploadResponse,
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
from ..services.storage import persist_upload_file
from ..services.tasks_store import fetch_tasks_with_counts, upsert_task_from_detail, upsert_tasks_from_list
from ..services.usage import record_usage

router = APIRouter(prefix="/api", tags=["tasks"])
logger = logging.getLogger(__name__)


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


async def poll_tasks_after_upload(
    client: ExternalAPIClient,
    user_id: str,
    integration: Optional[str],
    attempts: int,
    interval_seconds: float,
    page_size: int,
    baseline_ids: Set[str],
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
    if not emails or not isinstance(emails, list):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="emails array is required")
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
        upsert_tasks_from_list(target_user_id, [TaskResponse(**result.model_dump())], integration=None)
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
    fallback = fetch_tasks_with_counts(target_user_id, limit=limit, offset=offset)
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
                upsert_task_from_detail(user.user_id, result, counts=counts, integration=None)
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
    webhook_url: Optional[str] = Form(default=None),
    user_id: Optional[str] = None,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(get_user_external_client),
):
    settings = get_settings()
    responses: list[BatchFileUploadResponse] = []
    baseline_ids: Set[str] = set()
    target_user_id = user.user_id
    list_user_id = None
    if user_id:
        if user.role != "admin":
            logger.warning(
                "route.tasks.upload.forbidden_user_id",
                extra={"user_id": user.user_id, "requested_user_id": user_id},
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
        target_user_id = user_id
        list_user_id = user_id
        logger.info(
            "route.tasks.upload.admin_scope",
            extra={"admin_user_id": user.user_id, "target_user_id": target_user_id},
        )

    try:
        baseline = await client.list_tasks(limit=settings.upload_poll_page_size, offset=0, user_id=list_user_id)
        baseline_ids = {task.id for task in baseline.tasks or [] if task and task.id}
        if baseline.tasks:
            upsert_tasks_from_list(target_user_id, baseline.tasks, integration=None)
    except ExternalAPIError as exc:
        logger.warning(
            "route.tasks.upload.baseline_failed",
            extra={"user_id": target_user_id, "status_code": exc.status_code, "details": exc.details},
        )

    for file in files:
        try:
            saved_path, data = await persist_upload_file(
                upload=file, user_id=target_user_id, max_bytes=settings.upload_max_mb * 1024 * 1024
            )
            result = await client.upload_batch_file(
                filename=file.filename or "upload", content=data, user_id=target_user_id, webhook_url=webhook_url
            )
            record_usage(target_user_id, path="/tasks/batch/upload", count=1, api_key_id=None)
            logger.info(
                "route.tasks.upload",
                extra={"user_id": target_user_id, "filename": file.filename, "saved_path": str(saved_path)},
            )
            responses.append(result)
        except ExternalAPIError as exc:
            if exc.status_code in (401, 403):
                logger.warning(
                    "route.tasks.upload.unauthorized",
                    extra={"user_id": target_user_id, "status_code": exc.status_code, "details": exc.details},
                )
            raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])

    await poll_tasks_after_upload(
        client=client,
        user_id=target_user_id,
        integration=None,
        attempts=settings.upload_poll_attempts,
        interval_seconds=settings.upload_poll_interval_seconds,
        page_size=settings.upload_poll_page_size,
        baseline_ids=baseline_ids,
        list_user_id=list_user_id,
    )
    return responses
