import json
import logging
import time
import uuid
from typing import Dict, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
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
from ..services.task_credit_reservations import fetch_task_credit_reservation, update_task_reservation
from ..services.task_metrics import counts_from_metrics, email_count_from_metrics
from ..services.credits import (
    apply_credit_debit,
    apply_credit_release,
    CREDIT_SOURCE_TASK,
    CREDIT_SOURCE_TASK_FINALIZE,
    CREDIT_SOURCE_TASK_RELEASE,
    CREDIT_SOURCE_TASK_RESERVE,
    CREDIT_SOURCE_VERIFY,
)
from ..services.usage import record_usage

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


def resolve_verify_source_id(email: str, payload: dict, result: VerifyEmailResponse) -> str:
    request_id = payload.get("request_id")
    if isinstance(request_id, str) and request_id.strip():
        return request_id.strip()
    if result.validated_at and email:
        return f"{email}:{result.validated_at}"
    generated = str(uuid.uuid4())
    logger.info("credits.verify.request_id_generated", extra={"email": email})
    return generated




def task_is_complete(detail: TaskDetailResponse) -> bool:
    if detail.finished_at:
        return True
    metrics = detail.metrics
    if not metrics:
        return False
    if metrics.progress_percent is not None and metrics.progress_percent >= 100:
        return True
    if metrics.progress is not None and metrics.progress >= 1:
        return True
    job_status = metrics.job_status
    if isinstance(job_status, dict) and job_status:
        pending = int(job_status.get("pending") or 0)
        processing = int(job_status.get("processing") or 0)
        if pending + processing == 0:
            return True
    return False


def resolve_counts_from_detail(detail: TaskDetailResponse) -> Optional[Dict[str, int]]:
    metrics_counts = counts_from_metrics(detail.metrics)
    if metrics_counts:
        total = sum(value for value in metrics_counts.values() if isinstance(value, int))
        if total > 0:
            return metrics_counts
    return metrics_counts if metrics_counts else None


def resolve_processed_count(detail: TaskDetailResponse, counts: Optional[Dict[str, int]]) -> Optional[int]:
    if counts:
        total = sum(value for value in counts.values() if isinstance(value, int))
        if total > 0:
            return total
    metrics = detail.metrics
    total_from_metrics = email_count_from_metrics(metrics)
    if total_from_metrics is not None and total_from_metrics > 0:
        return total_from_metrics
    metrics_counts = counts_from_metrics(metrics)
    if metrics_counts:
        total = sum(value for value in metrics_counts.values() if isinstance(value, int))
        if total > 0:
            return total
    return None


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
        source_id = resolve_verify_source_id(email, payload, result)
        debit = apply_credit_debit(
            user_id=user.user_id,
            credits=1,
            source=CREDIT_SOURCE_VERIFY,
            source_id=source_id,
            meta={"email": email, "status": result.status, "validated_at": result.validated_at},
        )
        if debit.get("status") == "insufficient":
            logger.warning(
                "credits.verify.insufficient",
                extra={"user_id": user.user_id, "email": email, "source_id": source_id},
            )
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits")
        record_usage(user.user_id, path="/verify", count=1, api_key_id=None)
        logger.info("route.verify", extra={"user_id": user.user_id, "email": email, "credit_status": debit.get("status")})
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
        reserved_count = len(emails)
        reservation_id = str(uuid.uuid4())
        reservation = apply_credit_debit(
            user_id=target_user_id,
            credits=reserved_count,
            source=CREDIT_SOURCE_TASK_RESERVE,
            source_id=reservation_id,
            meta={"requested_count": reserved_count, "context": "manual"},
        )
        reservation_status = reservation.get("status")
        reservation_applied = reservation_status in ("applied", "duplicate")
        if reservation_status == "insufficient":
            logger.warning(
                "credits.task.reserve_insufficient",
                extra={"user_id": target_user_id, "requested_count": reserved_count, "reservation_id": reservation_id},
            )
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits")
        if reservation_status not in ("applied", "duplicate"):
            logger.error(
                "credits.task.reserve_failed",
                extra={
                    "user_id": target_user_id,
                    "requested_count": reserved_count,
                    "reservation_id": reservation_id,
                    "status": reservation_status,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to reserve credits for this task",
            )
        result = await client.create_task(emails=emails, webhook_url=webhook_url)
        if result.id:
            logger.info(
                "route.tasks.create.manual_emails_skipped",
                extra={"user_id": target_user_id, "task_id": result.id, "email_count": len(manual_emails)},
            )
        if result.id:
            update_task_reservation(target_user_id, result.id, reserved_count, reservation_id)
        record_usage(target_user_id, path="/tasks", count=len(emails), api_key_id=None)
        logger.info("route.tasks.create", extra={"user_id": target_user_id, "count": len(emails)})
        return result
    except HTTPException:
        raise
    except ExternalAPIError as exc:
        if "reservation_applied" in locals() and reservation_applied:
            try:
                apply_credit_release(
                    user_id=user.user_id,
                    credits=reserved_count,
                    source=CREDIT_SOURCE_TASK_RELEASE,
                    source_id=reservation_id,
                    meta={"reason": "task_create_failed", "context": "manual"},
                )
            except Exception:  # noqa: BLE001
                logger.exception(
                    "credits.task.reserve_release_failed",
                    extra={"user_id": user.user_id, "reservation_id": reservation_id},
                )
        if exc.status_code in (401, 403):
            logger.warning(
                "route.tasks.create.unauthorized",
                extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
            )
            raise HTTPException(status_code=exc.status_code, detail="Not authorized to create tasks")
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])
    except Exception as exc:  # noqa: BLE001
        if "reservation_applied" in locals() and reservation_applied:
            try:
                apply_credit_release(
                    user_id=user.user_id,
                    credits=reserved_count,
                    source=CREDIT_SOURCE_TASK_RELEASE,
                    source_id=reservation_id,
                    meta={"reason": "task_create_exception", "context": "manual"},
                )
            except Exception:  # noqa: BLE001
                logger.exception(
                    "credits.task.reserve_release_failed",
                    extra={"user_id": user.user_id, "reservation_id": reservation_id},
                )
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
        record_usage(target_user_id, path="/tasks", count=len(external_result.tasks or []), api_key_id=api_key_id)
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
):
    logger.info(
        "route.tasks.latest_upload.unavailable",
        extra={"user_id": user.user_id, "reason": "ext_api_missing_file_name"},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/tasks/latest-uploads", response_model=list[LatestUploadResponse])
async def get_latest_uploads(
    limit: Optional[int] = Query(default=None),
    user: AuthContext = Depends(get_current_user),
):
    if limit is not None and limit <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="limit must be greater than zero")
    logger.info(
        "route.tasks.latest_uploads.unavailable",
        extra={"user_id": user.user_id, "reason": "ext_api_missing_file_name"},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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
        record_usage(user.user_id, path="/tasks/{id}/jobs", count=len(result.jobs or []), api_key_id=None)
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
        counts = resolve_counts_from_detail(result)
        credit_status = None
        reservation = fetch_task_credit_reservation(user.user_id, task_id_str)
        reserved_count = None
        if reservation and reservation.get("credit_reserved_count") is not None:
            reserved_count = int(reservation.get("credit_reserved_count"))
        if task_is_complete(result):
            processed_count = resolve_processed_count(result, counts)
            if processed_count is None:
                logger.error(
                    "credits.task.count_missing",
                    extra={"user_id": user.user_id, "task_id": task_id_str},
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Unable to determine credit usage for this task",
                )
            if reserved_count is not None:
                delta = processed_count - reserved_count
                if delta > 0:
                    debit = apply_credit_debit(
                        user_id=user.user_id,
                        credits=delta,
                        source=CREDIT_SOURCE_TASK_FINALIZE,
                        source_id=task_id_str,
                        meta={
                            "processed_count": processed_count,
                            "reserved_count": reserved_count,
                            "finished_at": result.finished_at,
                        },
                    )
                    credit_status = debit.get("status")
                    if debit.get("status") == "insufficient":
                        logger.warning(
                            "credits.task.insufficient",
                        extra={"user_id": user.user_id, "task_id": task_id_str, "required": delta},
                        )
                        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits")
                elif delta < 0:
                    release = apply_credit_release(
                        user_id=user.user_id,
                        credits=abs(delta),
                        source=CREDIT_SOURCE_TASK_RELEASE,
                        source_id=task_id_str,
                        meta={
                            "processed_count": processed_count,
                            "reserved_count": reserved_count,
                            "finished_at": result.finished_at,
                        },
                    )
                    credit_status = release.get("status")
                else:
                    credit_status = "settled"
            else:
                debit = apply_credit_debit(
                    user_id=user.user_id,
                    credits=processed_count,
                    source=CREDIT_SOURCE_TASK,
                    source_id=task_id_str,
                    meta={
                        "processed_count": processed_count,
                        "valid": counts.get("valid") if counts else None,
                        "invalid": counts.get("invalid") if counts else None,
                        "catchall": counts.get("catchall") if counts else None,
                        "finished_at": result.finished_at,
                    },
                )
                credit_status = debit.get("status")
                if debit.get("status") == "insufficient":
                    logger.warning(
                        "credits.task.insufficient",
                        extra={"user_id": user.user_id, "task_id": task_id_str, "required": processed_count},
                    )
                    raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits")
        record_usage(user.user_id, path="/tasks/{id}", count=1, api_key_id=api_key_id)
        logger.info(
            "route.tasks.detail",
            extra={
                "user_id": user.user_id,
                "task_id": task_id_str,
                "credit_status": credit_status,
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
        reservation_id = None
        reserved_count = None
        reservation_applied = False
        try:
            result = await client.upload_batch_file(
                filename=item["file"].filename or "upload",
                content=item["data"],
                webhook_url=webhook_url,
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
            reserved_count = int(result.email_count)
            reservation_id = str(uuid.uuid4())
            reservation = apply_credit_debit(
                user_id=target_user_id,
                credits=reserved_count,
                source=CREDIT_SOURCE_TASK_RESERVE,
                source_id=reservation_id,
                meta={
                    "requested_count": reserved_count,
                    "context": "upload",
                    "file_name": item["file"].filename,
                },
            )
            status_value = reservation.get("status")
            reservation_applied = status_value in ("applied", "duplicate")
            if status_value == "insufficient":
                logger.warning(
                    "credits.task.reserve_insufficient",
                    extra={
                        "user_id": target_user_id,
                        "requested_count": reserved_count,
                        "reservation_id": reservation_id,
                        "task_id": task_id,
                    },
                )
                raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits")
            if status_value not in ("applied", "duplicate"):
                logger.error(
                    "credits.task.reserve_failed",
                    extra={
                        "user_id": target_user_id,
                        "requested_count": reserved_count,
                        "reservation_id": reservation_id,
                        "task_id": task_id,
                        "status": status_value,
                    },
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Unable to reserve credits for this upload",
                )
            update_task_reservation(
                target_user_id,
                task_id,
                reserved_count,
                reservation_id,
            )
            record_usage(target_user_id, path="/tasks/upload", count=reserved_count, api_key_id=None)
            logger.info(
                "route.tasks.upload",
                extra={
                    "user_id": target_user_id,
                    "file_name": item["file"].filename,
                    "task_id": task_id,
                    "upload_id": result.upload_id,
                    "email_count": reserved_count,
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
                    email_count=reserved_count,
                )
            )
        except HTTPException as exc:
            if reservation_applied and reservation_id is not None and reserved_count is not None:
                try:
                    apply_credit_release(
                        user_id=target_user_id,
                        credits=reserved_count,
                        source=CREDIT_SOURCE_TASK_RELEASE,
                        source_id=reservation_id,
                        meta={"reason": "upload_http_exception", "context": "upload"},
                    )
                except Exception:  # noqa: BLE001
                    logger.exception(
                        "credits.task.reserve_release_failed",
                        extra={"user_id": target_user_id, "reservation_id": reservation_id},
                    )
            raise exc
        except ExternalAPIError as exc:
            if reservation_applied and reservation_id is not None and reserved_count is not None:
                try:
                    apply_credit_release(
                        user_id=target_user_id,
                        credits=reserved_count,
                        source=CREDIT_SOURCE_TASK_RELEASE,
                        source_id=reservation_id,
                        meta={"reason": "upload_failed", "context": "upload"},
                    )
                except Exception:  # noqa: BLE001
                    logger.exception(
                        "credits.task.reserve_release_failed",
                        extra={"user_id": target_user_id, "reservation_id": reservation_id},
                    )
            if exc.status_code in (401, 403):
                logger.warning(
                    "route.tasks.upload.unauthorized",
                    extra={"user_id": target_user_id, "status_code": exc.status_code, "details": exc.details},
                )
            raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])
        except Exception as exc:  # noqa: BLE001
            if reservation_applied and reservation_id is not None and reserved_count is not None:
                try:
                    apply_credit_release(
                        user_id=target_user_id,
                        credits=reserved_count,
                        source=CREDIT_SOURCE_TASK_RELEASE,
                        source_id=reservation_id,
                        meta={"reason": "upload_exception", "context": "upload"},
                    )
                except Exception:  # noqa: BLE001
                    logger.exception(
                        "credits.task.reserve_release_failed",
                        extra={"user_id": target_user_id, "reservation_id": reservation_id},
                    )
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
        detail = await client.get_task_detail(task_id_str)
        counts = resolve_counts_from_detail(detail)
        reservation = fetch_task_credit_reservation(target_user_id, task_id_str)
        reserved_count = None
        if reservation and reservation.get("credit_reserved_count") is not None:
            reserved_count = int(reservation.get("credit_reserved_count"))
        if task_is_complete(detail):
            processed_count = resolve_processed_count(detail, counts)
            if processed_count is None:
                logger.error(
                    "credits.task.count_missing",
                    extra={"user_id": target_user_id, "task_id": task_id_str},
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Unable to determine credit usage for this task",
                )
            if reserved_count is not None:
                delta = processed_count - reserved_count
                if delta > 0:
                    debit = apply_credit_debit(
                        user_id=target_user_id,
                        credits=delta,
                        source=CREDIT_SOURCE_TASK_FINALIZE,
                        source_id=task_id_str,
                        meta={
                            "processed_count": processed_count,
                            "reserved_count": reserved_count,
                            "finished_at": detail.finished_at,
                        },
                    )
                    if debit.get("status") == "insufficient":
                        logger.warning(
                            "credits.task.insufficient",
                            extra={"user_id": target_user_id, "task_id": task_id_str, "required": delta},
                        )
                        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits")
                elif delta < 0:
                    apply_credit_release(
                        user_id=target_user_id,
                        credits=abs(delta),
                        source=CREDIT_SOURCE_TASK_RELEASE,
                        source_id=task_id_str,
                        meta={
                            "processed_count": processed_count,
                            "reserved_count": reserved_count,
                            "finished_at": detail.finished_at,
                        },
                    )
            else:
                debit = apply_credit_debit(
                    user_id=target_user_id,
                    credits=processed_count,
                    source=CREDIT_SOURCE_TASK,
                    source_id=task_id_str,
                    meta={
                        "processed_count": processed_count,
                        "valid": counts.get("valid") if counts else None,
                        "invalid": counts.get("invalid") if counts else None,
                        "catchall": counts.get("catchall") if counts else None,
                        "finished_at": detail.finished_at,
                    },
                )
                if debit.get("status") == "insufficient":
                    logger.warning(
                        "credits.task.insufficient",
                        extra={"user_id": target_user_id, "task_id": task_id_str, "required": processed_count},
                    )
                    raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits")
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
