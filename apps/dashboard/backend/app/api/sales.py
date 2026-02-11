import logging
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, Header, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from ..core.auth import AuthContext, get_current_user
from ..core.settings import get_settings
from ..services.request_rate_limit import allow_request
from ..services.sales_contact_requests import (
    SalesContactPersistenceError,
    SalesContactPersistResult,
    SalesContactRequestRecord,
    persist_sales_contact_request,
    resolve_account_email,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sales", tags=["sales"])


class SalesContactRequestPayload(BaseModel):
    source: str = Field(min_length=1, max_length=64)
    plan: Literal["payg", "monthly", "annual"]
    quantity: int = Field(gt=0)
    contact_required: bool = Field(alias="contactRequired")
    page: str = Field(min_length=1, max_length=256)

    @field_validator("source", "page")
    @classmethod
    def strip_text_fields(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("must not be empty")
        return trimmed

    @field_validator("page")
    @classmethod
    def validate_page(cls, value: str) -> str:
        if not value.startswith("/"):
            raise ValueError("page must start with /")
        return value


class SalesContactSuccessResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    ok: Literal[True] = True
    request_id: str = Field(alias="requestId")
    message: str


def _error_response(*, status_code: int, error_code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "ok": False,
            "error": error_code,
            "message": message,
        },
    )


def _resolve_request_ip(request: Request) -> Optional[str]:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first_ip = forwarded.split(",")[0].strip()
        if first_ip:
            return first_ip
    if request.client and request.client.host:
        return request.client.host
    return None


def _sanitize_user_agent(request: Request) -> Optional[str]:
    user_agent = request.headers.get("user-agent")
    if not user_agent:
        return None
    trimmed = user_agent.strip()
    if not trimmed:
        return None
    return trimmed[:512]


def _allow_rate_limited_request(*, user_id: str, request_ip: Optional[str]) -> bool:
    settings = get_settings()
    user_allowed = allow_request(
        bucket_key=f"sales_contact:user:{user_id}",
        max_requests=settings.sales_contact_user_rate_limit_requests,
        window_seconds=settings.sales_contact_rate_limit_window_seconds,
    )
    if not user_allowed:
        return False
    ip_bucket = request_ip or "unknown"
    return allow_request(
        bucket_key=f"sales_contact:ip:{ip_bucket}",
        max_requests=settings.sales_contact_ip_rate_limit_requests,
        window_seconds=settings.sales_contact_rate_limit_window_seconds,
    )


def _submit_sales_contact_request(
    *,
    payload: SalesContactRequestPayload,
    user: AuthContext,
    request_ip: Optional[str],
    user_agent: Optional[str],
    idempotency_key: Optional[str],
) -> SalesContactPersistResult:
    account_email = resolve_account_email(user.user_id, user.claims if isinstance(user.claims, dict) else None)
    record = SalesContactRequestRecord(
        user_id=user.user_id,
        source=payload.source,
        plan=payload.plan,
        quantity=payload.quantity,
        contact_required=payload.contact_required,
        page=payload.page,
        request_ip=request_ip,
        user_agent=user_agent,
        account_email=account_email,
        idempotency_key=idempotency_key,
    )
    return persist_sales_contact_request(record)


@router.post("/contact-request", response_model=SalesContactSuccessResponse)
async def create_contact_request(
    request: Request,
    body: dict[str, Any],
    user: AuthContext = Depends(get_current_user),
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
):
    try:
        payload = SalesContactRequestPayload.model_validate(body)
    except ValidationError:
        return _error_response(
            status_code=400,
            error_code="invalid_payload",
            message="Invalid sales contact request payload.",
        )

    request_ip = _resolve_request_ip(request)
    user_agent = _sanitize_user_agent(request)

    if not _allow_rate_limited_request(user_id=user.user_id, request_ip=request_ip):
        logger.info(
            "sales.contact_request.rate_limited",
            extra={"user_id": user.user_id, "request_ip": request_ip},
        )
        return _error_response(
            status_code=429,
            error_code="rate_limited",
            message="Too many contact requests. Please try again shortly.",
        )

    try:
        result = _submit_sales_contact_request(
            payload=payload,
            user=user,
            request_ip=request_ip,
            user_agent=user_agent,
            idempotency_key=idempotency_key,
        )
    except SalesContactPersistenceError:
        return _error_response(
            status_code=503,
            error_code="service_unavailable",
            message="Sales request service is temporarily unavailable.",
        )

    logger.info(
        "sales.contact_request.submitted",
        extra={
            "user_id": user.user_id,
            "request_id": result.request_id,
            "plan": payload.plan,
            "quantity": payload.quantity,
            "source": payload.source,
            "page": payload.page,
            "deduplicated": result.deduplicated,
        },
    )
    message = "Sales request submitted." if not result.deduplicated else "Sales request already submitted."
    return SalesContactSuccessResponse(requestId=result.request_id, message=message)
