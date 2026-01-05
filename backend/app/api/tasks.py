import asyncio
import json
import logging
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional, Set

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
    get_external_api_client_for_key,
)
from ..core.auth import AuthContext, get_current_user
from ..core.settings import get_settings
from ..services.file_processing import FileProcessingError, _column_letters_to_index, parse_emails_from_upload
from ..services.task_files_store import fetch_task_file, upsert_task_file
from ..services.tasks_store import (
    counts_from_metrics,
    email_count_from_metrics,
    fetch_latest_file_task,
    fetch_latest_file_tasks,
    fetch_latest_manual_task,
    fetch_task_credit_reservation,
    fetch_tasks_with_counts,
    upsert_task_from_detail,
    upsert_tasks_from_list,
    update_task_manual_emails,
    update_manual_task_results,
    update_manual_task_results_bulk,
    update_task_reservation,
)
from ..services.api_keys import INTERNAL_DASHBOARD_KEY_NAME, get_cached_key_by_name
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


class LatestManualResponse(BaseModel):
    task_id: str
    created_at: Optional[str] = None
    status: Optional[str] = None
    email_count: Optional[int] = None
    valid_count: Optional[int] = None
    invalid_count: Optional[int] = None
    catchall_count: Optional[int] = None
    job_status: Optional[Dict[str, int]] = None
    manual_emails: Optional[list[str]] = None
    manual_results: Optional[list[Dict[str, object]]] = None


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


def resolve_verify_source_id(email: str, payload: dict, result: VerifyEmailResponse) -> str:
    request_id = payload.get("request_id")
    if isinstance(request_id, str) and request_id.strip():
        return request_id.strip()
    if result.validated_at and email:
        return f"{email}:{result.validated_at}"
    generated = str(uuid.uuid4())
    logger.info("credits.verify.request_id_generated", extra={"email": email})
    return generated


def resolve_dashboard_email_client(user_id: str) -> Optional[ExternalAPIClient]:
    cached = get_cached_key_by_name(user_id, INTERNAL_DASHBOARD_KEY_NAME)
    if not cached:
        logger.warning("tasks.dashboard_key.missing", extra={"user_id": user_id})
        return None
    key_plain = cached.get("key_plain")
    if not isinstance(key_plain, str) or not key_plain.strip():
        logger.warning(
            "tasks.dashboard_key.secret_missing",
            extra={"user_id": user_id, "key_id": cached.get("key_id")},
        )
        return None
    try:
        return get_external_api_client_for_key(key_plain)
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "tasks.dashboard_key.client_failed",
            extra={"user_id": user_id, "error": str(exc)},
        )
        return None


def _coerce_bool(value: object) -> Optional[bool]:
    if isinstance(value, bool):
        return value
    return None


EXPORT_DETAIL_FIELDS = (
    "is_role_based",
    "catchall_domain",
    "email_server",
    "disposable_domain",
    "registered_domain",
    "mx_record",
)


def _extract_email_details(result: VerifyEmailResponse) -> Optional[Dict[str, Any]]:
    steps = result.verification_steps or []
    for step in steps:
        email_data = getattr(step, "email", None)
        if isinstance(email_data, dict) and email_data:
            return email_data
    return None


def _find_mx_record(domain: Dict[str, Any]) -> Optional[str]:
    records = domain.get("dns_records")
    if not isinstance(records, list):
        return None
    for record in records:
        if not isinstance(record, dict):
            continue
        record_type = str(record.get("type") or "").upper()
        if record_type != "MX":
            continue
        value = record.get("value")
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _extract_export_fields_from_email_details(
    email_data: Optional[Dict[str, Any]],
) -> Dict[str, Optional[object]]:
    if not isinstance(email_data, dict):
        return {}
    resolved: Dict[str, Optional[object]] = {}
    resolved["is_role_based"] = _coerce_bool(email_data.get("is_role_based"))
    domain = email_data.get("domain")
    if isinstance(domain, dict):
        resolved["disposable_domain"] = _coerce_bool(domain.get("is_disposable"))
        resolved["registered_domain"] = _coerce_bool(domain.get("is_registered"))
        resolved["mx_record"] = _find_mx_record(domain)
    host = email_data.get("host")
    if isinstance(host, dict):
        resolved["catchall_domain"] = _coerce_bool(host.get("is_catchall"))
        server_type = host.get("server_type")
        if isinstance(server_type, str) and server_type.strip():
            resolved["email_server"] = server_type.strip()
        else:
            resolved["email_server"] = None
    return resolved


def _extract_export_fields(
    result: VerifyEmailResponse,
    email_data: Optional[Dict[str, Any]],
) -> Dict[str, Optional[object]]:
    resolved: Dict[str, Optional[object]] = {"is_role_based": result.is_role_based}
    if not isinstance(email_data, dict):
        return resolved
    if resolved["is_role_based"] is None:
        resolved["is_role_based"] = _coerce_bool(email_data.get("is_role_based"))
    domain = email_data.get("domain")
    if isinstance(domain, dict):
        resolved["disposable_domain"] = _coerce_bool(domain.get("is_disposable"))
        resolved["registered_domain"] = _coerce_bool(domain.get("is_registered"))
        resolved["mx_record"] = _find_mx_record(domain)
    host = email_data.get("host")
    if isinstance(host, dict):
        resolved["catchall_domain"] = _coerce_bool(host.get("is_catchall"))
        server_type = host.get("server_type")
        if isinstance(server_type, str) and server_type.strip():
            resolved["email_server"] = server_type.strip()
        else:
            resolved["email_server"] = None
    return resolved


def _needs_email_detail_fetch(email_data: Optional[Dict[str, Any]]) -> bool:
    if not isinstance(email_data, dict):
        return True
    domain = email_data.get("domain")
    host = email_data.get("host")
    if not isinstance(domain, dict) or not isinstance(host, dict):
        return True
    if "dns_records" not in domain or domain.get("dns_records") is None:
        return True
    for key in ("is_disposable", "is_registered"):
        if key not in domain or domain.get(key) is None:
            return True
    for key in ("is_catchall", "server_type"):
        if key not in host or host.get(key) is None:
            return True
    return False


def _merge_export_fields(
    primary: Dict[str, Optional[object]],
    fallback: Dict[str, Optional[object]],
) -> Dict[str, Optional[object]]:
    merged = dict(primary)
    for key, value in fallback.items():
        if merged.get(key) is None and value is not None:
            merged[key] = value
    return merged


def _manual_result_needs_export_refresh(result: Dict[str, object]) -> bool:
    for key in EXPORT_DETAIL_FIELDS:
        if key not in result:
            return True
        value = result.get(key)
        if value is None:
            return True
        if isinstance(value, str) and not value.strip():
            return True
    return False


async def _refresh_manual_results_export_details(
    user_id: str,
    task_id: str,
    manual_results: object,
    manual_emails: Optional[list[str]],
    client: Optional[ExternalAPIClient],
) -> Optional[list[Dict[str, object]]]:
    if client is None:
        logger.warning(
            "route.tasks.latest_manual.refresh_details.missing_client",
            extra={"user_id": user_id, "task_id": task_id},
        )
        return manual_results if isinstance(manual_results, list) else manual_results
    if not isinstance(manual_results, list):
        logger.warning(
            "route.tasks.latest_manual.refresh_details.invalid_results",
            extra={"user_id": user_id, "task_id": task_id, "type": type(manual_results).__name__},
        )
        return manual_results if manual_results is None else []
    if not manual_results:
        logger.info(
            "route.tasks.latest_manual.refresh_details.empty_results",
            extra={"user_id": user_id, "task_id": task_id},
        )
        return manual_results

    updated_results: list[Dict[str, object]] = []
    missing_count = 0
    updated_count = 0
    for item in manual_results:
        if not isinstance(item, dict):
            logger.warning(
                "route.tasks.latest_manual.refresh_details.invalid_item",
                extra={"user_id": user_id, "task_id": task_id},
            )
            return manual_results
        email = item.get("email")
        if not isinstance(email, str) or not email.strip():
            updated_results.append(item)
            continue
        if not _manual_result_needs_export_refresh(item):
            updated_results.append(item)
            continue
        missing_count += 1
        try:
            email_lookup = await client.get_email_by_address(email.strip())
            fetched_fields = _extract_export_fields_from_email_details(
                email_lookup if isinstance(email_lookup, dict) else None
            )
            existing_fields = {key: item.get(key) for key in EXPORT_DETAIL_FIELDS}
            merged_fields = _merge_export_fields(existing_fields, fetched_fields)
            updated_item = dict(item)
            for key, value in merged_fields.items():
                if value is not None:
                    updated_item[key] = value
            if updated_item != item:
                updated_count += 1
            updated_results.append(updated_item)
        except ExternalAPIError as exc:
            logger.warning(
                "route.tasks.latest_manual.refresh_details.lookup_failed",
                extra={"user_id": user_id, "task_id": task_id, "email": email, "status_code": exc.status_code},
            )
            updated_results.append(item)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "route.tasks.latest_manual.refresh_details.lookup_exception",
                extra={"user_id": user_id, "task_id": task_id, "email": email, "error": str(exc)},
            )
            updated_results.append(item)

    if updated_count:
        update_manual_task_results_bulk(user_id, task_id, updated_results, manual_emails=manual_emails)
    logger.info(
        "route.tasks.latest_manual.refresh_details",
        extra={
            "user_id": user_id,
            "task_id": task_id,
            "missing_count": missing_count,
            "updated_count": updated_count,
        },
    )
    return updated_results


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
    if detail.jobs is None:
        return metrics_counts if metrics_counts else None
    counts = {"valid": 0, "invalid": 0, "catchall": 0}
    for job in detail.jobs:
        job_status = (job.email and job.email.get("status")) or job.status
        if job_status == "exists":
            counts["valid"] += 1
        elif job_status == "catchall":
            counts["catchall"] += 1
        else:
            counts["invalid"] += 1
    return counts


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
    batch_id = payload.get("batch_id")
    batch_emails = payload.get("batch_emails")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email is required")
    if batch_id is not None and (not isinstance(batch_id, str) or not batch_id.strip()):
        logger.warning("route.verify.invalid_batch_id", extra={"user_id": user.user_id, "batch_id": batch_id})
        batch_id = None
    resolved_batch_emails: Optional[list[str]] = None
    if isinstance(batch_emails, list):
        resolved_batch_emails = [item.strip() for item in batch_emails if isinstance(item, str) and item.strip()]
    try:
        result = await client.verify_email(email=email)
        email_details = _extract_email_details(result)
        export_fields = _extract_export_fields(result, email_details)
        if _needs_email_detail_fetch(email_details):
            detail_client = resolve_dashboard_email_client(user.user_id)
            if detail_client is None:
                logger.warning(
                    "route.verify.email_lookup_skipped",
                    extra={"user_id": user.user_id, "email": email, "reason": "dashboard_key_unavailable"},
                )
            else:
                try:
                    email_lookup = await detail_client.get_email_by_address(email)
                    export_fields = _merge_export_fields(
                        export_fields,
                        _extract_export_fields(result, email_lookup if isinstance(email_lookup, dict) else None),
                    )
                    logger.info("route.verify.email_lookup", extra={"user_id": user.user_id, "email": email})
                except ExternalAPIError as exc:
                    logger.warning(
                        "route.verify.email_lookup_failed",
                        extra={
                            "user_id": user.user_id,
                            "email": email,
                            "status_code": exc.status_code,
                            "details": exc.details,
                        },
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.error(
                        "route.verify.email_lookup_exception",
                        extra={"user_id": user.user_id, "email": email, "error": str(exc)},
                    )
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
            manual_payload = {
                "email": email,
                "status": result.status,
                "message": result.message,
                "validated_at": result.validated_at,
            }
            for key, value in export_fields.items():
                if value is not None:
                    manual_payload[key] = value
            update_manual_task_results(user.user_id, batch_id, manual_payload, manual_emails=resolved_batch_emails)
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
        resolved_api_key_id = resolve_task_api_key_id(target_user_id, api_key_id)
        upsert_tasks_from_list(
            target_user_id,
            [TaskResponse(**result.model_dump())],
            integration=None,
            api_key_id=resolved_api_key_id,
        )
        if result.id:
            update_task_manual_emails(target_user_id, result.id, manual_emails)
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
    external_refresh: Optional[TaskListResponse] = None
    if refresh:
        if api_key_id:
            logger.info(
                "route.tasks.list.refresh_unscoped",
                extra={"user_id": target_user_id, "api_key_id": api_key_id},
            )
        try:
            external_refresh = await client.list_tasks(limit=limit, offset=offset, user_id=list_user_id)
            if external_refresh.tasks:
                upsert_tasks_from_list(target_user_id, external_refresh.tasks, integration=None)
            logger.info(
                "route.tasks.list.refresh_external",
                extra={
                    "user_id": target_user_id,
                    "limit": limit,
                    "offset": offset,
                    "count": external_refresh.count,
                    "returned": len(external_refresh.tasks or []),
                },
            )
        except ExternalAPIError as exc:
            logger.warning(
                "route.tasks.list.refresh_failed",
                extra={"user_id": target_user_id, "status_code": exc.status_code, "details": exc.details},
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "route.tasks.list.refresh_exception",
                extra={"user_id": target_user_id, "error": str(exc)},
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
                job_status=row.get("job_status"),
                integration=row.get("integration"),
                file_name=row.get("file_name"),
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
        external_result = external_refresh or await client.list_tasks(limit=limit, offset=offset, user_id=list_user_id)
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


@router.get("/tasks/latest-upload", response_model=LatestUploadResponse)
async def get_latest_upload(
    user: AuthContext = Depends(get_current_user),
):
    settings = get_settings()
    latest = fetch_latest_file_task(user.user_id, limit=settings.upload_poll_page_size)
    if not latest:
        logger.info("route.tasks.latest_upload.empty", extra={"user_id": user.user_id})
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    task_id = latest.get("task_id")
    file_name = latest.get("file_name")
    if not task_id or not file_name:
        logger.warning(
            "route.tasks.latest_upload.invalid_row",
            extra={"user_id": user.user_id, "task_id": task_id, "file_name": file_name},
        )
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    record_usage(user.user_id, path="/tasks/latest-upload", count=1, api_key_id=None)
    return LatestUploadResponse(
        task_id=task_id,
        file_name=file_name,
        created_at=latest.get("created_at"),
        status=latest.get("status"),
        email_count=latest.get("email_count"),
        valid_count=latest.get("valid_count"),
        invalid_count=latest.get("invalid_count"),
        catchall_count=latest.get("catchall_count"),
        job_status=latest.get("job_status"),
    )


@router.get("/tasks/latest-uploads", response_model=list[LatestUploadResponse])
async def get_latest_uploads(
    limit: Optional[int] = Query(default=None),
    user: AuthContext = Depends(get_current_user),
):
    settings = get_settings()
    resolved_limit = limit if limit is not None else settings.latest_uploads_limit
    if resolved_limit <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="limit must be greater than zero")
    if resolved_limit > settings.latest_uploads_limit:
        logger.warning(
            "route.tasks.latest_uploads.limit_clamped",
            extra={
                "user_id": user.user_id,
                "requested": resolved_limit,
                "limit": settings.latest_uploads_limit,
            },
        )
        resolved_limit = settings.latest_uploads_limit
    latest = fetch_latest_file_tasks(user.user_id, limit=resolved_limit)
    if not latest:
        logger.info("route.tasks.latest_uploads.empty", extra={"user_id": user.user_id})
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    payload = []
    for row in latest:
        task_id = row.get("task_id")
        file_name = row.get("file_name")
        if not task_id or not file_name:
            logger.warning(
                "route.tasks.latest_uploads.invalid_row",
                extra={"user_id": user.user_id, "task_id": task_id, "file_name": file_name},
            )
            continue
        payload.append(
            LatestUploadResponse(
                task_id=task_id,
                file_name=file_name,
                created_at=row.get("created_at"),
                status=row.get("status"),
                email_count=row.get("email_count"),
                valid_count=row.get("valid_count"),
                invalid_count=row.get("invalid_count"),
                catchall_count=row.get("catchall_count"),
                job_status=row.get("job_status"),
            )
        )
    if not payload:
        logger.info("route.tasks.latest_uploads.empty", extra={"user_id": user.user_id})
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    record_usage(user.user_id, path="/tasks/latest-uploads", count=len(payload), api_key_id=None)
    return payload


@router.get("/tasks/latest-manual", response_model=LatestManualResponse)
async def get_latest_manual(
    user: AuthContext = Depends(get_current_user),
    refresh_details: bool = Query(False),
):
    settings = get_settings()
    latest = fetch_latest_manual_task(user.user_id, limit=settings.upload_poll_page_size)
    if not latest:
        logger.info("route.tasks.latest_manual.empty", extra={"user_id": user.user_id})
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    task_id = latest.get("task_id")
    if not task_id:
        logger.warning(
            "route.tasks.latest_manual.invalid_row",
            extra={"user_id": user.user_id, "task_id": task_id},
        )
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    manual_results = latest.get("manual_results")
    if refresh_details:
        detail_client = resolve_dashboard_email_client(user.user_id)
        if detail_client is None:
            logger.warning(
                "route.tasks.latest_manual.refresh_details_skipped",
                extra={"user_id": user.user_id, "task_id": task_id, "reason": "dashboard_key_unavailable"},
            )
        else:
            try:
                manual_results = await _refresh_manual_results_export_details(
                    user.user_id,
                    task_id,
                    manual_results,
                    latest.get("manual_emails"),
                    detail_client,
                )
            except ExternalAPIError as exc:
                logger.warning(
                    "route.tasks.latest_manual.refresh_details_failed",
                    extra={
                        "user_id": user.user_id,
                        "task_id": task_id,
                        "status_code": exc.status_code,
                        "details": exc.details,
                    },
                )
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "route.tasks.latest_manual.refresh_details_exception",
                    extra={"user_id": user.user_id, "task_id": task_id, "error": str(exc)},
                )
    record_usage(user.user_id, path="/tasks/latest-manual", count=1, api_key_id=None)
    return LatestManualResponse(
        task_id=task_id,
        created_at=latest.get("created_at"),
        status=latest.get("status"),
        email_count=latest.get("email_count"),
        valid_count=latest.get("valid_count"),
        invalid_count=latest.get("invalid_count"),
        catchall_count=latest.get("catchall_count"),
        job_status=latest.get("job_status"),
        manual_emails=latest.get("manual_emails"),
        manual_results=manual_results,
    )


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
        if result.jobs is not None:
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
    settings = get_settings()
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
        try:
            parsed = parse_emails_from_upload(
                filename=file.filename or "upload",
                data=data,
                email_column=metadata.email_column,
                first_row_has_labels=metadata.first_row_has_labels,
                remove_duplicates=False,
                max_emails=None,
            )
        except FileProcessingError as exc:
            logger.warning(
                "route.tasks.upload.parse_failed",
                extra={"user_id": target_user_id, "file_name": file.filename, "details": exc.details},
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        reserved_count = len(parsed.emails)
        reservation_id = str(uuid.uuid4())
        prepared_uploads.append(
            {
                "file": file,
                "metadata": metadata,
                "data": data,
                "email_column_value": email_column_value,
                "email_column_index": email_column_index,
                "reserved_count": reserved_count,
                "reservation_id": reservation_id,
            }
        )

    reservations = []
    for item in prepared_uploads:
        reservation = apply_credit_debit(
            user_id=target_user_id,
            credits=item["reserved_count"],
            source=CREDIT_SOURCE_TASK_RESERVE,
            source_id=item["reservation_id"],
            meta={
                "requested_count": item["reserved_count"],
                "context": "upload",
                "file_name": item["file"].filename,
            },
        )
        status_value = reservation.get("status")
        if status_value == "insufficient":
            logger.warning(
                "credits.task.reserve_insufficient",
                extra={
                    "user_id": target_user_id,
                    "requested_count": item["reserved_count"],
                    "reservation_id": item["reservation_id"],
                },
            )
            for reserved in reservations:
                try:
                    apply_credit_release(
                        user_id=target_user_id,
                        credits=reserved["reserved_count"],
                        source=CREDIT_SOURCE_TASK_RELEASE,
                        source_id=reserved["reservation_id"],
                        meta={"reason": "upload_reservation_failed", "context": "upload"},
                    )
                except Exception:  # noqa: BLE001
                    logger.exception(
                        "credits.task.reserve_release_failed",
                        extra={"user_id": target_user_id, "reservation_id": reserved["reservation_id"]},
                    )
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits")
        if status_value not in ("applied", "duplicate"):
            logger.error(
                "credits.task.reserve_failed",
                extra={
                    "user_id": target_user_id,
                    "requested_count": item["reserved_count"],
                    "reservation_id": item["reservation_id"],
                    "status": status_value,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to reserve credits for this upload",
            )
        reservations.append(item)

    for item in prepared_uploads:
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
            update_task_reservation(
                target_user_id,
                task_id,
                item["reserved_count"],
                item["reservation_id"],
            )
            logger.info(
                "route.tasks.upload.usage_skipped",
                extra={"user_id": target_user_id, "task_id": task_id, "reason": "email_count_unknown"},
            )
            task_file_id = upsert_task_file(
                user_id=target_user_id,
                task_id=task_id,
                file_name=item["file"].filename or "upload",
                file_extension=Path(item["file"].filename or "upload").suffix.lower(),
                source_path=None,
                email_column=item["metadata"].email_column,
                email_column_index=item["email_column_index"],
                first_row_has_labels=item["metadata"].first_row_has_labels,
                remove_duplicates=item["metadata"].remove_duplicates,
            )
            logger.info(
                "route.tasks.upload",
                extra={
                    "user_id": target_user_id,
                    "file_name": item["file"].filename,
                    "task_id": task_id,
                    "upload_id": result.upload_id,
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
                )
            )
        except HTTPException as exc:
            try:
                apply_credit_release(
                    user_id=target_user_id,
                    credits=item["reserved_count"],
                    source=CREDIT_SOURCE_TASK_RELEASE,
                    source_id=item["reservation_id"],
                    meta={"reason": "upload_http_exception", "context": "upload"},
                )
            except Exception:  # noqa: BLE001
                logger.exception(
                    "credits.task.reserve_release_failed",
                    extra={"user_id": target_user_id, "reservation_id": item["reservation_id"]},
                )
            raise exc
        except ExternalAPIError as exc:
            try:
                apply_credit_release(
                    user_id=target_user_id,
                    credits=item["reserved_count"],
                    source=CREDIT_SOURCE_TASK_RELEASE,
                    source_id=item["reservation_id"],
                    meta={"reason": "upload_failed", "context": "upload"},
                )
            except Exception:  # noqa: BLE001
                logger.exception(
                    "credits.task.reserve_release_failed",
                    extra={"user_id": target_user_id, "reservation_id": item["reservation_id"]},
                )
            if exc.status_code in (401, 403):
                logger.warning(
                    "route.tasks.upload.unauthorized",
                    extra={"user_id": target_user_id, "status_code": exc.status_code, "details": exc.details},
                )
            raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])
        except Exception as exc:  # noqa: BLE001
            try:
                apply_credit_release(
                    user_id=target_user_id,
                    credits=item["reserved_count"],
                    source=CREDIT_SOURCE_TASK_RELEASE,
                    source_id=item["reservation_id"],
                    meta={"reason": "upload_exception", "context": "upload"},
                )
            except Exception:  # noqa: BLE001
                logger.exception(
                    "credits.task.reserve_release_failed",
                    extra={"user_id": target_user_id, "reservation_id": item["reservation_id"]},
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
        task_file = fetch_task_file(target_user_id, task_id_str)
        if not task_file:
            logger.info(
                "route.tasks.download.missing_file",
                extra={"user_id": target_user_id, "task_id": task_id_str},
            )
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task file not found")
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
        if detail.jobs is not None:
            upsert_task_from_detail(
                target_user_id,
                detail,
                counts=counts,
                integration=None,
                api_key_id=None,
            )
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
