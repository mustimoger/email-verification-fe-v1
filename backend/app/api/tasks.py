import asyncio
import logging
import time
from typing import NamedTuple, Optional, Set

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from ..clients.external import (
    BatchFileUploadResponse,
    ExternalAPIClient,
    ExternalAPIError,
    get_external_api_client_for_key,
    get_external_api_client,
    Task,
    TaskDetailResponse,
    TaskListResponse,
    TaskResponse,
    VerifyEmailResponse,
)
from ..core.auth import AuthContext, get_current_user
from ..core.settings import get_settings
from ..services.api_keys import (
    INTERNAL_DASHBOARD_KEY_NAME,
    get_cached_key_by_id,
    resolve_user_api_key,
)
from ..services.storage import persist_upload_file
from ..services.tasks_store import fetch_tasks_with_counts, upsert_task_from_detail, upsert_tasks_from_list
from ..services.usage import record_usage

router = APIRouter(prefix="/api", tags=["tasks"])
logger = logging.getLogger(__name__)


class ResolvedClient(NamedTuple):
    client: ExternalAPIClient
    key_id: str


async def get_user_external_client(
    api_key_id: Optional[str] = None, user: AuthContext = Depends(get_current_user)
) -> ResolvedClient:
    """
    Resolve an external API client. Use a specific cached key when api_key_id is provided; otherwise fallback to the per-user dashboard key.
    """
    if api_key_id:
        cached = get_cached_key_by_id(user.user_id, api_key_id)
        if not cached or not cached.get("key_plain"):
            logger.error(
                "route.tasks.resolve_key_missing",
                extra={"user_id": user.user_id, "api_key_id": api_key_id, "found": bool(cached)},
            )
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found for user")
        return ResolvedClient(client=get_external_api_client_for_key(cached["key_plain"]), key_id=api_key_id)

    master_client = get_external_api_client()
    try:
        key_secret, key_id = await resolve_user_api_key(
            user_id=user.user_id, desired_name=INTERNAL_DASHBOARD_KEY_NAME, master_client=master_client
        )
    except ExternalAPIError as exc:
        logger.error(
            "route.tasks.resolve_key_failed",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])
    client = get_external_api_client_for_key(key_secret)
    return ResolvedClient(client=client, key_id=key_id)


async def poll_tasks_after_upload(
    client: ExternalAPIClient,
    user_id: str,
    integration: str,
    attempts: int,
    interval_seconds: float,
    page_size: int,
    baseline_ids: Set[str],
) -> Optional[TaskListResponse]:
    """
    Poll recent tasks after an upload to capture new task_ids and upsert into Supabase.
    Stops early when a new task id appears beyond the baseline.
    """
    latest: Optional[TaskListResponse] = None
    for attempt in range(1, attempts + 1):
        try:
            latest = await client.list_tasks(limit=page_size, offset=0)
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
    resolved: ResolvedClient = Depends(get_user_external_client),
):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email is required")
    try:
        result = await resolved.client.verify_email(email=email)
        record_usage(user.user_id, path="/verify", count=1, api_key_id=resolved.key_id)
        logger.info("route.verify", extra={"user_id": user.user_id, "email": email})
        return result
    except ExternalAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    payload: dict,
    user: AuthContext = Depends(get_current_user),
    resolved: ResolvedClient = Depends(get_user_external_client),
):
    emails = payload.get("emails")
    webhook_url = payload.get("webhook_url")
    if not emails or not isinstance(emails, list):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="emails array is required")
    try:
        result = await resolved.client.create_task(emails=emails, user_id=user.user_id, webhook_url=webhook_url)
        upsert_tasks_from_list(
            user.user_id,
            [TaskResponse(**result.model_dump())],
            integration=INTERNAL_DASHBOARD_KEY_NAME,
        )
        record_usage(user.user_id, path="/tasks", count=len(emails), api_key_id=resolved.key_id)
        logger.info("route.tasks.create", extra={"user_id": user.user_id, "count": len(emails)})
        return result
    except ExternalAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


@router.get("/tasks", response_model=TaskListResponse)
async def list_tasks(
    limit: int = 10,
    offset: int = 0,
    api_key_id: Optional[str] = None,
    user: AuthContext = Depends(get_current_user),
):
    start = time.time()
    resolved_client: Optional[ResolvedClient] = None
    # Supabase is primary source for history; return cached tasks first
    fallback = fetch_tasks_with_counts(user.user_id, limit=limit, offset=offset)
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
        record_usage(user.user_id, path="/tasks", count=len(supa_tasks), api_key_id=api_key_id)
        logger.info(
            "route.tasks.list.supabase_primary",
            extra={
                "user_id": user.user_id,
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
        resolved_client = await get_user_external_client(api_key_id=api_key_id, user=user)
        external_result = await resolved_client.client.list_tasks(limit=limit, offset=offset)
        if external_result.tasks:
            upsert_tasks_from_list(user.user_id, external_result.tasks, integration=INTERNAL_DASHBOARD_KEY_NAME)
        record_usage(
            user.user_id, path="/tasks", count=len(external_result.tasks or []), api_key_id=resolved_client.key_id
        )
        logger.info(
            "route.tasks.list.external_refresh",
            extra={
                "user_id": user.user_id,
                "limit": limit,
                "offset": offset,
                "count": external_result.count,
                "returned": len(external_result.tasks or []),
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        return external_result
    except ExternalAPIError as exc:
        logger.error(
            "route.tasks.list.failed",
            extra={
                "user_id": user.user_id,
                "status_code": exc.status_code,
                "details": exc.details,
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "route.tasks.list.exception",
            extra={"user_id": user.user_id, "duration_ms": round((time.time() - start) * 1000, 2)},
        )

    # Nothing in Supabase and external failed/empty
    record_usage(
        user.user_id,
        path="/tasks",
        count=0,
        api_key_id=resolved_client.key_id if resolved_client else api_key_id,
    )
    logger.info(
        "route.tasks.list.empty_fallback",
        extra={
            "user_id": user.user_id,
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
    resolved: ResolvedClient = Depends(get_user_external_client),
):
    start = time.time()
    try:
        result = await resolved.client.get_task_detail(task_id)
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
            upsert_task_from_detail(user.user_id, result, counts=counts, integration=INTERNAL_DASHBOARD_KEY_NAME)
        record_usage(user.user_id, path="/tasks/{id}", count=1, api_key_id=resolved.key_id)
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
        logger.error(
            "route.tasks.detail.failed",
            extra={
                "user_id": user.user_id,
                "task_id": task_id,
                "status_code": exc.status_code,
                "details": exc.details,
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])
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
    user: AuthContext = Depends(get_current_user),
    resolved: ResolvedClient = Depends(get_user_external_client),
):
    settings = get_settings()
    responses: list[BatchFileUploadResponse] = []
    baseline_ids: Set[str] = set()

    try:
        baseline = await resolved.client.list_tasks(limit=settings.upload_poll_page_size, offset=0)
        baseline_ids = {task.id for task in baseline.tasks or [] if task and task.id}
        if baseline.tasks:
            upsert_tasks_from_list(user.user_id, baseline.tasks, integration=INTERNAL_DASHBOARD_KEY_NAME)
    except ExternalAPIError as exc:
        logger.warning(
            "route.tasks.upload.baseline_failed",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )

    for file in files:
        try:
            saved_path, data = await persist_upload_file(
                upload=file, user_id=user.user_id, max_bytes=settings.upload_max_mb * 1024 * 1024
            )
            result = await resolved.client.upload_batch_file(
                filename=file.filename or "upload", content=data, user_id=user.user_id, webhook_url=webhook_url
            )
            record_usage(user.user_id, path="/tasks/batch/upload", count=1, api_key_id=resolved.key_id)
            logger.info(
                "route.tasks.upload",
                extra={"user_id": user.user_id, "filename": file.filename, "saved_path": str(saved_path)},
            )
            responses.append(result)
        except ExternalAPIError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])

    await poll_tasks_after_upload(
        client=resolved.client,
        user_id=user.user_id,
        integration=INTERNAL_DASHBOARD_KEY_NAME,
        attempts=settings.upload_poll_attempts,
        interval_seconds=settings.upload_poll_interval_seconds,
        page_size=settings.upload_poll_page_size,
        baseline_ids=baseline_ids,
    )
    return responses
