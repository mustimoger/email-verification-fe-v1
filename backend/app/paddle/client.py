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


class CreateCustomerRequest(BaseModel):
    email: str
    name: Optional[str] = None
    custom_data: Optional[Dict[str, Any]] = None


class CustomerResponse(BaseModel):
    id: str
    email: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None


class CreateAddressRequest(BaseModel):
    customer_id: str
    country_code: str
    postal_code: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    first_line: Optional[str] = None
    second_line: Optional[str] = None


class AddressResponse(BaseModel):
    id: str
    customer_id: str
    country_code: Optional[str] = None
    postal_code: Optional[str] = None


class PriceAmount(BaseModel):
    amount: int
    currency_code: str


class PriceResponse(BaseModel):
    id: str
    unit_price: PriceAmount


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

    async def create_customer(self, payload: CreateCustomerRequest) -> CustomerResponse:
        response = await self._request("POST", "/customers", json=payload.model_dump(mode="json"))
        return await self._parse(response, CustomerResponse)

    async def create_address(self, payload: CreateAddressRequest) -> AddressResponse:
        path = f"/customers/{payload.customer_id}/addresses"
        body = payload.model_dump(mode="json")
        # remove customer_id from body per endpoint expectations
        body.pop("customer_id", None)
        response = await self._request("POST", path, json=body)
        return await self._parse(response, AddressResponse)

    async def get_price(self, price_id: str) -> PriceResponse:
        response = await self._request("GET", f"/prices/{price_id}")
        return await self._parse(response, PriceResponse)

    async def search_customers(self, search: str):
        response = await self._request("GET", f"/customers?search={search}")
        return await self._parse(response, BaseModel)

    async def list_addresses(self, customer_id: str):
        response = await self._request("GET", f"/customers/{customer_id}/addresses")
        return await self._parse(response, BaseModel)


def get_paddle_client() -> PaddleAPIClient:
    config = get_paddle_config()
    env = config.active_environment
    return PaddleAPIClient(env=env)
