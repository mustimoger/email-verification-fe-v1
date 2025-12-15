import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from ..clients.external import (
    BatchFileUploadResponse,
    ExternalAPIClient,
    ExternalAPIError,
    TaskDetailResponse,
    TaskListResponse,
    TaskResponse,
    VerifyEmailResponse,
)
from ..core.auth import AuthContext, get_current_user
from ..core.settings import get_settings
from ..services.storage import persist_upload_file
from ..services.usage import record_usage

router = APIRouter(prefix="/api", tags=["tasks"])
logger = logging.getLogger(__name__)


@router.post("/verify", response_model=VerifyEmailResponse)
async def verify_email(
    payload: dict,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(...),
):
    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="email is required")
    try:
        result = await client.verify_email(email=email)
        record_usage(user.user_id, path="/verify", count=1)
        logger.info("route.verify", extra={"user_id": user.user_id, "email": email})
        return result
    except ExternalAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    payload: dict,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(...),
):
    emails = payload.get("emails")
    webhook_url = payload.get("webhook_url")
    if not emails or not isinstance(emails, list):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="emails array is required")
    try:
        result = await client.create_task(emails=emails, user_id=user.user_id, webhook_url=webhook_url)
        record_usage(user.user_id, path="/tasks", count=len(emails))
        logger.info("route.tasks.create", extra={"user_id": user.user_id, "count": len(emails)})
        return result
    except ExternalAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


@router.get("/tasks", response_model=TaskListResponse)
async def list_tasks(
    limit: int = 10,
    offset: int = 0,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(...),
):
    try:
        result = await client.list_tasks(limit=limit, offset=offset)
        record_usage(user.user_id, path="/tasks", count=1)
        logger.info("route.tasks.list", extra={"user_id": user.user_id, "limit": limit, "offset": offset})
        return result
    except ExternalAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


@router.get("/tasks/{task_id}", response_model=TaskDetailResponse)
async def get_task_detail(
    task_id: str,
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(...),
):
    try:
        result = await client.get_task_detail(task_id)
        record_usage(user.user_id, path="/tasks/{id}", count=1)
        logger.info("route.tasks.detail", extra={"user_id": user.user_id, "task_id": task_id})
        return result
    except ExternalAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


@router.post("/tasks/upload", response_model=BatchFileUploadResponse)
async def upload_task_file(
    file: UploadFile = File(...),
    webhook_url: Optional[str] = Form(default=None),
    user: AuthContext = Depends(get_current_user),
    client: ExternalAPIClient = Depends(...),
):
    settings = get_settings()
    try:
        saved_path, data = await persist_upload_file(
            upload=file, user_id=user.user_id, max_bytes=settings.upload_max_mb * 1024 * 1024
        )
        result = await client.upload_batch_file(
            filename=file.filename or "upload", content=data, user_id=user.user_id, webhook_url=webhook_url
        )
        record_usage(user.user_id, path="/tasks/batch/upload", count=1)
        logger.info(
          "route.tasks.upload",
          extra={"user_id": user.user_id, "filename": file.filename, "saved_path": str(saved_path)},
        )
        return result
    except ExternalAPIError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])
