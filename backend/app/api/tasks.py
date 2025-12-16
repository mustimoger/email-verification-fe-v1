import logging
import time
from typing import NamedTuple, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from ..clients.external import (
    BatchFileUploadResponse,
    ExternalAPIClient,
    ExternalAPIError,
    get_external_api_client_for_key,
    get_external_api_client,
    TaskDetailResponse,
    TaskListResponse,
    TaskResponse,
    VerifyEmailResponse,
)
from ..core.auth import AuthContext, get_current_user
from ..core.settings import get_settings
from ..services.api_keys import INTERNAL_DASHBOARD_KEY_NAME, resolve_user_api_key
from ..services.storage import persist_upload_file
from ..services.usage import record_usage

router = APIRouter(prefix="/api", tags=["tasks"])
logger = logging.getLogger(__name__)


class ResolvedClient(NamedTuple):
    client: ExternalAPIClient
    key_id: str


async def get_user_external_client(user: AuthContext = Depends(get_current_user)) -> ResolvedClient:
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
        record_usage(user.user_id, path="/tasks", count=len(emails), api_key_id=resolved.key_id)
        logger.info("route.tasks.create", extra={"user_id": user.user_id, "count": len(emails)})
        return result
    except ExternalAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


@router.get("/tasks", response_model=TaskListResponse)
async def list_tasks(
    limit: int = 10,
    offset: int = 0,
    user: AuthContext = Depends(get_current_user),
    resolved: ResolvedClient = Depends(get_user_external_client),
):
    start = time.time()
    try:
        result = await resolved.client.list_tasks(limit=limit, offset=offset)
        record_usage(user.user_id, path="/tasks", count=1, api_key_id=resolved.key_id)
        logger.info(
            "route.tasks.list",
            extra={
                "user_id": user.user_id,
                "limit": limit,
                "offset": offset,
                "count": result.count,
                "duration_ms": round((time.time() - start) * 1000, 2),
            },
        )
        return result
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
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "route.tasks.list.exception",
            extra={"user_id": user.user_id, "duration_ms": round((time.time() - start) * 1000, 2)},
        )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Upstream tasks service error") from exc


@router.get("/tasks/{task_id}", response_model=TaskDetailResponse)
async def get_task_detail(
    task_id: str,
    user: AuthContext = Depends(get_current_user),
    resolved: ResolvedClient = Depends(get_user_external_client),
):
    start = time.time()
    try:
        result = await resolved.client.get_task_detail(task_id)
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
    return responses
