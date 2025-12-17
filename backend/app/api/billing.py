import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator

from ..core.auth import AuthContext, get_current_user
from ..paddle.client import (
    CreateTransactionRequest,
    CreateTransactionResponse,
    TransactionItem,
    PaddleAPIError,
    get_paddle_client,
)
from ..paddle.config import get_paddle_config, PaddlePlanDefinition
from ..paddle.webhook import verify_webhook
from ..services.billing_events import record_billing_event
from ..services.credits import grant_credits

router = APIRouter(prefix="/api/billing", tags=["billing"])
logger = logging.getLogger(__name__)


class PlanPrice(BaseModel):
    price_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    quantity: int = 1


class PlanResponse(BaseModel):
    name: str
    product_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    prices: Dict[str, PlanPrice]


class PlansPayload(BaseModel):
    status: str
    checkout_enabled: bool
    checkout_script: Optional[str] = None
    client_side_token: Optional[str] = None
    seller_id: Optional[str] = None
    plans: list[PlanResponse]


class CheckoutRequest(BaseModel):
    price_id: str
    quantity: int = 1
    customer_id: str
    address_id: str
    custom_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("quantity")
    @classmethod
    def positive_quantity(cls, value):
        if value <= 0:
            raise ValueError("quantity must be greater than zero")
        return value


@router.get("/plans", response_model=PlansPayload)
def list_plans(user: AuthContext = Depends(get_current_user)):
    config = get_paddle_config()
    env = config.active_environment
    plans: list[PlanResponse] = []
    for name, definition in config.plan_definitions.items():
        plan = PaddlePlanDefinition.model_validate(definition)
        prices: Dict[str, PlanPrice] = {}
        for price_name, price_def in plan.prices.items():
            prices[price_name] = PlanPrice(
                price_id=price_def.price_id,
                metadata=price_def.metadata,
                quantity=price_def.quantity,
            )
        plans.append(
            PlanResponse(
                name=name,
                product_id=plan.product_id,
                metadata=plan.metadata,
                prices=prices,
            )
        )
    return PlansPayload(
        status=config.status,
        checkout_enabled=config.checkout_enabled,
        checkout_script=env.checkout_script,
        client_side_token=config.client_side_token,
        seller_id=config.seller_id,
        plans=plans,
    )


@router.post("/transactions", response_model=CreateTransactionResponse)
async def create_transaction(
    payload: CheckoutRequest,
    user: AuthContext = Depends(get_current_user),
):
    config = get_paddle_config()
    # Ensure price exists in plan definitions to avoid arbitrary price injection
    allowed_price = None
    for plan in config.plan_definitions.values():
        for price_def in plan.prices.values():
            if price_def.price_id == payload.price_id:
                allowed_price = price_def
                break
        if allowed_price:
            break
    if not allowed_price:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown price_id")

    client = get_paddle_client()
    try:
        tx_payload = CreateTransactionRequest(
            customer_id=payload.customer_id,
            address_id=payload.address_id,
            items=[TransactionItem(price_id=payload.price_id, quantity=payload.quantity)],
            custom_data={**(payload.custom_data or {}), "supabase_user_id": user.user_id},
            metadata=payload.metadata,
        )
        result = await client.create_transaction(tx_payload)
        logger.info(
            "billing.transaction.created",
            extra={"user_id": user.user_id, "transaction_id": result.id, "price_id": payload.price_id},
        )
        return result
    except PaddleAPIError as exc:
        logger.error(
            "billing.transaction.error",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )
        raise HTTPException(status_code=exc.status_code, detail=exc.details or exc.args[0])


@router.post("/webhook")
async def paddle_webhook(request: Request):
    raw_body = await request.body()
    remote_ip = request.client.host if request.client else None
    signature_header = request.headers.get("Paddle-Signature") or request.headers.get("Paddle-signature")
    verify_webhook(raw_body=raw_body, signature_header=signature_header, remote_ip=remote_ip)
    try:
        payload = await request.json()
    except Exception as exc:  # noqa: BLE001
        logger.error("billing.webhook.invalid_json", extra={"error": str(exc)})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON") from exc

    event_id = payload.get("event_id") or payload.get("notification_id") or payload.get("id")
    event_type = payload.get("event_type") or payload.get("event") or payload.get("type")
    data = payload.get("data") or payload

    if not event_id or not event_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing event identifiers")

    # Extract transaction info defensively
    transaction = data.get("transaction") if isinstance(data, dict) else None
    if not transaction and isinstance(data, dict) and "items" in data:
        transaction = data
    items = (transaction or {}).get("items") or []
    custom_data = (transaction or {}).get("custom_data") or data.get("custom_data") if isinstance(data, dict) else {}
    user_id = None
    if isinstance(custom_data, dict):
        user_id = custom_data.get("supabase_user_id") or custom_data.get("user_id")

    # Only handle credit grants on transaction completion events
    if event_type not in {"transaction.completed", "transaction.billed"}:
        logger.info("billing.webhook.ignored_event", extra={"event_type": event_type, "event_id": event_id})
        return {"received": True}

    if not user_id:
        logger.warning("billing.webhook.missing_user", extra={"event_id": event_id, "event_type": event_type})
        return {"received": True}

    config = get_paddle_config()
    # Compute credits from price_ids using plan definitions metadata
    price_to_credits: Dict[str, int] = {}
    for plan in config.plan_definitions.values():
        for price_def in plan.prices.values():
            credits_val = 0
            if isinstance(price_def.metadata, dict) and "credits" in price_def.metadata:
                try:
                    credits_val = int(price_def.metadata["credits"])
                except Exception:
                    credits_val = 0
            price_to_credits[price_def.price_id] = credits_val

    total_credits = 0
    price_ids: list[str] = []
    for item in items:
        price_id = None
        quantity = 1
        if isinstance(item, dict):
            price_id = item.get("price_id") or (item.get("price") or {}).get("id")
            quantity = item.get("quantity") or 1
        if not price_id:
            continue
        price_ids.append(price_id)
        credits_per_unit = price_to_credits.get(price_id, 0)
        try:
            qty_int = int(quantity)
        except Exception:
            qty_int = 1
        total_credits += credits_per_unit * max(qty_int, 1)

    if total_credits <= 0:
        logger.info(
            "billing.webhook.no_credits",
            extra={"event_id": event_id, "event_type": event_type, "price_ids": price_ids},
        )
        return {"received": True}

    is_new = record_billing_event(
        event_id=event_id,
        user_id=user_id,
        event_type=event_type,
        transaction_id=(transaction or {}).get("id"),
        price_ids=price_ids,
        credits_granted=total_credits,
        raw=payload,
    )
    if not is_new:
        return {"received": True}

    grant_credits(user_id, total_credits)
    logger.info(
        "billing.webhook.credits_granted",
        extra={"event_id": event_id, "user_id": user_id, "credits": total_credits, "price_ids": price_ids},
    )
    return {"received": True, "granted": total_credits}
