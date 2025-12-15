import logging
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel, Field

from ..core.settings import get_settings

logger = logging.getLogger(__name__)


class ExternalAPIError(Exception):
    def __init__(self, status_code: int, message: str, details: Optional[Any] = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details


class EmailStatus(str):
    exists = "exists"
    not_exists = "not_exists"
    catchall = "catchall"
    invalid_syntax = "invalid_syntax"
    unknown = "unknown"


class StepStatus(str):
    pending = "pending"
    started = "started"
    completed = "completed"
    failed = "failed"


class VerificationStepType(str):
    syntax = "syntax"
    domain = "domain"
    smtp = "smtp"
    inbox = "inbox"


class VerificationStep(BaseModel):
    id: Optional[str] = None
    email_id: Optional[str] = None
    email: Optional[Dict[str, Any]] = None
    step: Optional[str] = Field(default=None, description="VerificationStepType")
    status: Optional[str] = Field(default=None, description="StepStatus")
    error_message: Optional[str] = None
    metadata: Optional[str] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    updated_at: Optional[str] = None


class VerifyEmailResponse(BaseModel):
    email: Optional[str] = None
    is_role_based: Optional[bool] = None
    message: Optional[str] = None
    status: Optional[str] = Field(default=None, description="EmailStatus")
    validated_at: Optional[str] = None
    verification_steps: Optional[List[VerificationStep]] = None


class TaskResponse(BaseModel):
    created_at: Optional[str] = None
    domain_count: Optional[int] = None
    email_count: Optional[int] = None
    id: Optional[str] = None
    user_id: Optional[str] = None
    webhook_url: Optional[str] = None


class Task(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    webhook_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TaskEmailJob(BaseModel):
    id: Optional[str] = None
    email_id: Optional[str] = None
    email_address: Optional[str] = None
    status: Optional[str] = Field(default=None, description="TaskEmailJobStatus")
    task_id: Optional[str] = None
    task: Optional[Task] = None
    email: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TaskDetailResponse(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    updated_at: Optional[str] = None
    jobs: Optional[List[TaskEmailJob]] = None


class TaskListResponse(BaseModel):
    count: Optional[int] = None
    limit: Optional[int] = None
    offset: Optional[int] = None
    tasks: Optional[List[Task]] = None


class BatchFileUploadResponse(BaseModel):
    filename: Optional[str] = None
    message: Optional[str] = None
    status: Optional[str] = None
    upload_id: Optional[str] = None
    uploaded_at: Optional[str] = None


class BatchFileUploadError(BaseModel):
    error: Optional[str] = None
    details: Optional[str] = None


class APIKeySummary(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    created_at: Optional[str] = None
    is_active: Optional[bool] = None
    last_used_at: Optional[str] = None


class ListAPIKeysResponse(BaseModel):
    count: Optional[int] = None
    keys: Optional[List[APIKeySummary]] = None


class CreateAPIKeyResponse(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    key: Optional[str] = None
    user_id: Optional[str] = None
    created_at: Optional[str] = None


class RevokeAPIKeyResponse(BaseModel):
    message: Optional[str] = None


class ExternalAPIClient:
    def __init__(self, base_url: str, api_key: str, timeout_seconds: float = 30.0, max_upload_bytes: int = 10 * 1024 * 1024):
        if not base_url:
            raise ValueError("External API base_url is required")
        if not api_key:
            raise ValueError("External API key is required")
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.max_upload_bytes = max_upload_bytes

    async def verify_email(self, email: str) -> VerifyEmailResponse:
        payload = {"email": email}
        return await self._post("/verify", payload, VerifyEmailResponse)

    async def create_task(self, emails: List[str], user_id: Optional[str] = None, webhook_url: Optional[str] = None) -> TaskResponse:
        payload: Dict[str, Any] = {"emails": emails}
        if user_id:
            payload["user_id"] = user_id
        if webhook_url:
            payload["webhook_url"] = webhook_url
        return await self._post("/tasks", payload, TaskResponse)

    async def list_tasks(self, limit: int = 10, offset: int = 0) -> TaskListResponse:
        return await self._get("/tasks", TaskListResponse, params={"limit": limit, "offset": offset})

    async def get_task_detail(self, task_id: str) -> TaskDetailResponse:
        return await self._get(f"/tasks/{task_id}", TaskDetailResponse)

    async def upload_batch_file(
        self,
        filename: str,
        content: bytes,
        user_id: Optional[str] = None,
        webhook_url: Optional[str] = None,
    ) -> BatchFileUploadResponse:
        if len(content) > self.max_upload_bytes:
            logger.warning(
                "external_api.upload_file_too_large",
                extra={"file_name": filename, "file_size": len(content), "max_bytes": self.max_upload_bytes},
            )
            raise ExternalAPIError(
                status_code=400,
                message="File exceeds maximum allowed size",
                details={"filename": filename, "size": len(content), "max_bytes": self.max_upload_bytes},
            )

        files = {"file": (filename, content, "application/octet-stream")}
        data: Dict[str, Any] = {}
        if webhook_url:
            data["webhook_url"] = webhook_url
        if user_id:
            data["user_id"] = user_id

        return await self._post_multipart("/tasks/batch/upload", data=data, files=files, model=BatchFileUploadResponse)

    async def list_api_keys(self) -> ListAPIKeysResponse:
        return await self._get("/api/v1/api-keys", ListAPIKeysResponse)

    async def create_api_key(self, name: str) -> CreateAPIKeyResponse:
        return await self._post("/api/v1/api-keys", {"name": name}, CreateAPIKeyResponse)

    async def revoke_api_key(self, api_key_id: str) -> RevokeAPIKeyResponse:
        return await self._delete(f"/api/v1/api-keys/{api_key_id}", RevokeAPIKeyResponse)

    async def get_email_by_address(self, address: str) -> Dict[str, Any]:
        response = await self._request("GET", f"/emails/{address}")
        return self._parse_response_generic(response)

    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        url = f"{self.base_url}{path}"
        headers = kwargs.pop("headers", {})
        merged_headers = {"Authorization": f"Bearer {self.api_key}", **headers}
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.request(method=method, url=url, headers=merged_headers, **kwargs)
        logger.info(
            "external_api.request",
            extra={"method": method, "path": path, "status_code": response.status_code},
        )
        return response

    async def _get(self, path: str, model: type[BaseModel], params: Optional[Dict[str, Any]] = None):
        response = await self._request("GET", path, params=params)
        return self._parse_response(response, model)

    async def _post(self, path: str, payload: Dict[str, Any], model: type[BaseModel]):
        response = await self._request("POST", path, json=payload)
        return self._parse_response(response, model)

    async def _post_multipart(self, path: str, data: Dict[str, Any], files: Dict[str, Any], model: type[BaseModel]):
        response = await self._request("POST", path, data=data, files=files)
        return self._parse_response(response, model)

    async def _delete(self, path: str, model: type[BaseModel]):
        response = await self._request("DELETE", path)
        return self._parse_response(response, model)

    def _parse_response(self, response: httpx.Response, model: type[BaseModel]):
        if response.status_code >= 400:
            detail = None
            try:
                detail = response.json()
            except Exception:
                detail = response.text
            logger.warning(
                "external_api.error",
                extra={"status_code": response.status_code, "detail": detail},
            )
            raise ExternalAPIError(status_code=response.status_code, message="External API error", details=detail)
        try:
            data = response.json()
        except Exception as exc:
            logger.error("external_api.invalid_json", extra={"error": str(exc)})
            raise ExternalAPIError(
                status_code=response.status_code,
                message="Unable to parse external API response",
                details=str(exc),
            ) from exc
        return model.model_validate(data)

    def _parse_response_generic(self, response: httpx.Response):
        if response.status_code >= 400:
            detail = None
            try:
                detail = response.json()
            except Exception:
                detail = response.text
            logger.warning(
                "external_api.error",
                extra={"status_code": response.status_code, "detail": detail},
            )
            raise ExternalAPIError(status_code=response.status_code, message="External API error", details=detail)
        try:
            return response.json()
        except Exception as exc:
            logger.error("external_api.invalid_json", extra={"error": str(exc)})
            raise ExternalAPIError(
                status_code=response.status_code,
                message="Unable to parse external API response",
                details=str(exc),
            ) from exc


def get_external_api_client() -> ExternalAPIClient:
    settings = get_settings()
    return ExternalAPIClient(
        base_url=settings.email_api_base_url,
        api_key=settings.email_api_key,
        max_upload_bytes=settings.upload_max_mb * 1024 * 1024,
    )
