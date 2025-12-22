import logging
from dataclasses import dataclass
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


class TaskMetrics(BaseModel):
    job_status: Optional[Dict[str, int]] = None
    last_verification_completed_at: Optional[str] = None
    last_verification_requested_at: Optional[str] = None
    progress: Optional[float] = None
    progress_percent: Optional[int] = None
    total_email_addresses: Optional[int] = None
    verification_status: Optional[Dict[str, int]] = None


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
    status: Optional[str] = None
    email_count: Optional[int] = None
    valid_count: Optional[int] = None
    invalid_count: Optional[int] = None
    catchall_count: Optional[int] = None
    job_status: Optional[Dict[str, int]] = None
    metrics: Optional[TaskMetrics] = None
    integration: Optional[str] = None
    file_name: Optional[str] = None
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
    metrics: Optional[TaskMetrics] = None
    jobs: Optional[List[TaskEmailJob]] = None
    metrics: Optional[TaskMetrics] = None


class TaskListResponse(BaseModel):
    count: Optional[int] = None
    limit: Optional[int] = None
    offset: Optional[int] = None
    tasks: Optional[List[Task]] = None


@dataclass
class DownloadedFile:
    content: bytes
    content_type: Optional[str] = None
    content_disposition: Optional[str] = None


class BatchFileUploadResponse(BaseModel):
    filename: Optional[str] = None
    message: Optional[str] = None
    status: Optional[str] = None
    task_id: Optional[str] = None
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
    purpose: Optional[str] = None
    total_requests: Optional[int] = None
    integration: Optional[str] = None
    key_preview: Optional[str] = None


class ListAPIKeysResponse(BaseModel):
    count: Optional[int] = None
    keys: Optional[List[APIKeySummary]] = None


class APIUsageMetricsSeriesPoint(BaseModel):
    api_keys_by_purpose: Optional[Dict[str, int]] = None
    date: Optional[str] = None
    requests_by_purpose: Optional[Dict[str, int]] = None
    total_api_keys: Optional[int] = None
    total_requests: Optional[int] = None


class APIUsageMetricsResponse(BaseModel):
    api_keys_by_purpose: Optional[Dict[str, int]] = None
    last_used_at: Optional[str] = None
    requests_by_purpose: Optional[Dict[str, int]] = None
    series: Optional[List[APIUsageMetricsSeriesPoint]] = None
    total_api_keys: Optional[int] = None
    total_requests: Optional[int] = None
    user_id: Optional[str] = None


class VerificationMetricsResponse(BaseModel):
    job_status: Optional[Dict[str, int]] = None
    last_verification_completed_at: Optional[str] = None
    last_verification_requested_at: Optional[str] = None
    total_catchall: Optional[int] = None
    total_disposable_domain_emails: Optional[int] = None
    total_role_based: Optional[int] = None
    total_tasks: Optional[int] = None
    total_verifications: Optional[int] = None
    unique_email_addresses: Optional[int] = None
    user_id: Optional[str] = None
    verification_status: Optional[Dict[str, int]] = None


class CreateAPIKeyResponse(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    key: Optional[str] = None
    user_id: Optional[str] = None
    created_at: Optional[str] = None
    integration: Optional[str] = None


class RevokeAPIKeyResponse(BaseModel):
    message: Optional[str] = None


class ExternalAPIClient:
    def __init__(
        self,
        base_url: str,
        bearer_token: str,
        timeout_seconds: float = 30.0,
        max_upload_bytes: int = 10 * 1024 * 1024,
        extra_headers: Optional[Dict[str, str]] = None,
    ):
        if not base_url:
            raise ValueError("External API base_url is required")
        if not bearer_token:
            raise ValueError("External API bearer token is required")
        self.base_url = base_url.rstrip("/")
        self.bearer_token = bearer_token
        self.timeout_seconds = timeout_seconds
        self.max_upload_bytes = max_upload_bytes
        self.extra_headers = extra_headers or {}

    async def verify_email(self, email: str) -> VerifyEmailResponse:
        payload = {"email": email}
        return await self._post("/verify", payload, VerifyEmailResponse)

    async def create_task(self, emails: List[str], webhook_url: Optional[str] = None) -> TaskResponse:
        payload: Dict[str, Any] = {"emails": emails}
        if webhook_url:
            payload["webhook_url"] = webhook_url
        return await self._post("/tasks", payload, TaskResponse)

    async def list_tasks(
        self,
        limit: int = 10,
        offset: int = 0,
        user_id: Optional[str] = None,
    ) -> TaskListResponse:
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if user_id:
            params["user_id"] = user_id
        return await self._get("/tasks", TaskListResponse, params=params)

    async def get_task_detail(self, task_id: str) -> TaskDetailResponse:
        return await self._get(f"/tasks/{task_id}", TaskDetailResponse)

    async def upload_batch_file(
        self,
        filename: str,
        content: bytes,
        webhook_url: Optional[str] = None,
        email_column: Optional[str] = None,
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
        if email_column:
            data["email_column"] = email_column
        return await self._post_multipart("/tasks/batch/upload", data=data, files=files, model=BatchFileUploadResponse)

    async def download_task_results(self, task_id: str, file_format: Optional[str] = None) -> DownloadedFile:
        params = {"format": file_format} if file_format else None
        response = await self._request("GET", f"/tasks/{task_id}/download", params=params)
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
        return DownloadedFile(
            content=response.content,
            content_type=response.headers.get("content-type"),
            content_disposition=response.headers.get("content-disposition"),
        )

    async def list_api_keys(
        self,
        user_id: Optional[str] = None,
        start: Optional[str] = None,
        end: Optional[str] = None,
    ) -> ListAPIKeysResponse:
        params: Dict[str, Any] = {}
        if user_id:
            params["user_id"] = user_id
        if start:
            params["from"] = start
        if end:
            params["to"] = end
        if not params:
            params = None
        return await self._get("/api-keys", ListAPIKeysResponse, params=params)

    async def create_api_key(self, name: str, purpose: str, user_id: Optional[str] = None) -> CreateAPIKeyResponse:
        params = {"user_id": user_id} if user_id else None
        return await self._post("/api-keys", {"name": name, "purpose": purpose}, CreateAPIKeyResponse, params=params)

    async def revoke_api_key(self, api_key_id: str, user_id: Optional[str] = None) -> RevokeAPIKeyResponse:
        params = {"user_id": user_id} if user_id else None
        return await self._delete(f"/api-keys/{api_key_id}", RevokeAPIKeyResponse, params=params)

    async def get_api_usage_metrics(
        self,
        user_id: Optional[str] = None,
        start: Optional[str] = None,
        end: Optional[str] = None,
    ) -> APIUsageMetricsResponse:
        params: Dict[str, Any] = {}
        if user_id:
            params["user_id"] = user_id
        if start:
            params["from"] = start
        if end:
            params["to"] = end
        if not params:
            params = None
        return await self._get("/metrics/api-usage", APIUsageMetricsResponse, params=params)

    async def get_verification_metrics(
        self,
        user_id: Optional[str] = None,
        start: Optional[str] = None,
        end: Optional[str] = None,
    ) -> VerificationMetricsResponse:
        params: Dict[str, Any] = {}
        if user_id:
            params["user_id"] = user_id
        if start:
            params["from"] = start
        if end:
            params["to"] = end
        if not params:
            params = None
        return await self._get("/metrics/verifications", VerificationMetricsResponse, params=params)

    async def get_email_by_address(self, address: str) -> Dict[str, Any]:
        response = await self._request("GET", f"/emails/{address}")
        return self._parse_response_generic(response)

    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        url = f"{self.base_url}{path}"
        headers = kwargs.pop("headers", {})
        merged_headers = {"Authorization": f"Bearer {self.bearer_token}", **self.extra_headers, **headers}
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

    async def _post(
        self, path: str, payload: Dict[str, Any], model: type[BaseModel], params: Optional[Dict[str, Any]] = None
    ):
        response = await self._request("POST", path, json=payload, params=params)
        return self._parse_response(response, model)

    async def _post_multipart(self, path: str, data: Dict[str, Any], files: Dict[str, Any], model: type[BaseModel]):
        response = await self._request("POST", path, data=data, files=files)
        return self._parse_response(response, model)

    async def _delete(self, path: str, model: type[BaseModel], params: Optional[Dict[str, Any]] = None):
        response = await self._request("DELETE", path, params=params)
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


def get_external_api_client_for_key(api_key: str) -> ExternalAPIClient:
    settings = get_settings()
    return ExternalAPIClient(
        base_url=settings.email_api_base_url,
        bearer_token=api_key,
        max_upload_bytes=settings.upload_max_mb * 1024 * 1024,
    )
