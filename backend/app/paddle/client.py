"""
Paddle Billing API client (new API, not Classic).

Provides minimal, typed helpers to talk to Paddle Billing with structured
errors. Uses env-driven config from `paddle.config` to select sandbox vs
production.
"""

import logging
from typing import Any, Dict, Optional

import httpx
from pydantic import BaseModel

from .config import PaddleEnvironmentConfig, get_paddle_config

logger = logging.getLogger(__name__)


class PaddleAPIError(Exception):
    def __init__(self, status_code: int, message: str, details: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details


class TransactionItem(BaseModel):
    price_id: str
    quantity: int


class CreateTransactionRequest(BaseModel):
    customer_id: str
    address_id: str
    items: list[TransactionItem]
    custom_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class CreateTransactionResponse(BaseModel):
    id: str
    status: Optional[str] = None
    customer_id: Optional[str] = None
    address_id: Optional[str] = None
    created_at: Optional[str] = None


class PaddleAPIClient:
    def __init__(self, env: PaddleEnvironmentConfig, timeout_seconds: float = 15.0):
        self.base_url = env.api_url.rstrip("/")
        self.api_key = env.api_key
        self.timeout_seconds = timeout_seconds

    async def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        if not self.base_url or not self.api_key:
            raise PaddleAPIError(status_code=500, message="Paddle configuration missing base_url or api_key")
        url = f"{self.base_url}{path}"
        headers = kwargs.pop("headers", {})
        merged_headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json", **headers}
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.request(method=method, url=url, headers=merged_headers, **kwargs)
        logger.info("paddle.request", extra={"method": method, "path": path, "status_code": response.status_code})
        return response

    async def _parse(self, response: httpx.Response, model: type[BaseModel]):
        if response.status_code >= 400:
            detail = None
            try:
                detail = response.json()
            except Exception:
                detail = response.text
            logger.warning(
                "paddle.error",
                extra={"status_code": response.status_code, "detail": detail},
            )
            raise PaddleAPIError(status_code=response.status_code, message="Paddle API error", details=detail)
        try:
            data = response.json()
        except Exception as exc:
            logger.error("paddle.invalid_json", extra={"error": str(exc)})
            raise PaddleAPIError(
                status_code=response.status_code,
                message="Unable to parse Paddle API response",
                details=str(exc),
            ) from exc
        # Paddle wraps resource under data in Billing API responses
        payload = data.get("data") if isinstance(data, dict) and "data" in data else data
        return model.model_validate(payload)

    async def create_transaction(self, payload: CreateTransactionRequest) -> CreateTransactionResponse:
        response = await self._request("POST", "/transactions", json=payload.model_dump(mode="json"))
        return await self._parse(response, CreateTransactionResponse)


def get_paddle_client() -> PaddleAPIClient:
    config = get_paddle_config()
    env = config.active_environment
    return PaddleAPIClient(env=env)
