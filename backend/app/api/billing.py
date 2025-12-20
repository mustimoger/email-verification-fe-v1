import logging
from typing import Any, Dict, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator

from ..core.auth import AuthContext, get_current_user
from ..paddle.client import (
    CreateTransactionRequest,
    CreateTransactionResponse,
    TransactionItem,
    PaddleAPIError,
    get_paddle_client,
    CreateCustomerRequest,
    CreateAddressRequest,
    PriceResponse,
)
from ..paddle.config import get_paddle_config
from ..paddle.webhook import verify_webhook
from ..services.billing_events import record_billing_event
from ..services.billing_plans import (
    get_billing_plan_by_price_id,
    get_billing_plans_by_price_ids,
    list_billing_plans,
)
from ..services.credits import grant_credits
from ..services import supabase_client
from ..services.paddle_store import get_paddle_ids, upsert_paddle_ids

router = APIRouter(prefix="/api/billing", tags=["billing"])
logger = logging.getLogger(__name__)


class PlanPrice(BaseModel):
    price_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    quantity: int = 1
    amount: Optional[int] = None
    currency_code: Optional[str] = None


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
    custom_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("quantity")
    @classmethod
    def positive_quantity(cls, value):
        if value <= 0:
            raise ValueError("quantity must be greater than zero")
        return value


@router.get("/plans", response_model=PlansPayload)
async def list_plans(user: AuthContext = Depends(get_current_user)):
    config = get_paddle_config()
    env = config.active_environment
    plan_rows = list_billing_plans()
    if not plan_rows:
        logger.error("billing.plans.missing_catalog")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Billing plans not configured")

    plans: list[PlanResponse] = []
    for row in plan_rows:
        price_id = row.get("paddle_price_id")
        product_id = row.get("paddle_product_id")
        plan_name = row.get("plan_name")
        if not price_id or not product_id or not plan_name:
            logger.error("billing.plans.invalid_row", extra={"row": row})
            continue
        price_metadata = row.get("custom_data") if isinstance(row.get("custom_data"), dict) else {}
        plan_metadata: Dict[str, Any] = {}
        if row.get("credits") is not None:
            plan_metadata["credits"] = row.get("credits")
        if row.get("plan_key"):
            plan_metadata["plan_key"] = row.get("plan_key")
        prices = {
            "one_time": PlanPrice(
                price_id=price_id,
                metadata=price_metadata,
                quantity=1,
                amount=row.get("amount"),
                currency_code=row.get("currency"),
            )
        }
        plans.append(
            PlanResponse(
                name=plan_name,
                product_id=product_id,
                metadata=plan_metadata,
                prices=prices,
            )
        )
    if not plans:
        logger.error("billing.plans.empty_catalog")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Billing plans not configured")
    return PlansPayload(
        status=config.status,
        checkout_enabled=config.checkout_enabled,
        checkout_script=env.checkout_script,
        client_side_token=config.client_side_token,
        seller_id=config.seller_id,
        plans=plans,
    )


async def _resolve_customer_and_address(user: AuthContext) -> Tuple[str, Optional[str]]:
    config = get_paddle_config()
    address_mode = config.address_mode
    client = get_paddle_client()

    async def create_or_reuse_address(customer_id: str) -> str:
        # Attempt to reuse an existing address if creation conflicts
        try:
            address = await client.create_address(
                CreateAddressRequest(
                    customer_id=customer_id,
                    country_code=config.default_country,
                    postal_code=config.default_postal_code,
                    region=config.default_region,
                    city=config.default_city,
                    first_line=config.default_line1,
                )
            )
            return address.id
        except PaddleAPIError as exc:
            if exc.status_code != status.HTTP_409_CONFLICT:
                raise
            try:
                addr_res = await client.list_addresses(customer_id)
                items = getattr(addr_res, "data", None) or getattr(addr_res, "addresses", None) or []
                if items:
                    first = items[0]
                    addr_id = first.get("id") if isinstance(first, dict) else getattr(first, "id", None)
                    if addr_id:
                        logger.info(
                            "billing.address.reused",
                            extra={
                                "user_id": user.user_id,
                                "customer_id": customer_id,
                                "address_id": addr_id,
                                "conflict_details": exc.details,
                            },
                        )
                        return addr_id
            except Exception as inner_exc:  # noqa: BLE001
                logger.error(
                    "billing.address.conflict_no_match",
                    extra={
                        "user_id": user.user_id,
                        "customer_id": customer_id,
                        "error": str(inner_exc),
                        "conflict_details": exc.details,
                    },
                )
            raise

    existing = get_paddle_ids(user.user_id)
    if existing:
        customer_id, address_id = existing
        if address_id:
            return customer_id, address_id
        if address_mode == "checkout":
            logger.info(
                "billing.address.skipped_checkout",
                extra={"user_id": user.user_id, "customer_id": customer_id},
            )
            return customer_id, None
        address_id = await create_or_reuse_address(customer_id)
        upsert_paddle_ids(user.user_id, customer_id, address_id)
        return customer_id, address_id

    profile = supabase_client.fetch_profile(user.user_id)
    if not profile or not profile.get("email"):
        # Backfill profile email from auth claims if Supabase profile is missing
        claim_email = user.claims.get("email") or user.claims.get("email_address")
        user_metadata = user.claims.get("user_metadata") if isinstance(user.claims.get("user_metadata"), dict) else {}
        display_name = user_metadata.get("display_name") or user_metadata.get("full_name") or user.claims.get("name")
        if claim_email:
            profile = supabase_client.upsert_profile(user.user_id, claim_email, display_name)
            logger.info(
                "billing.profile.backfilled",
                extra={"user_id": user.user_id, "from_claims": True, "has_email": bool(profile.get("email"))},
            )
    if not profile or not profile.get("email"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User profile email is required for billing")

    last_conflict_details: Any = None
    search_res: Any = None
    try:
        customer: CustomerResponse
        try:
            customer = await client.create_customer(
                CreateCustomerRequest(
                    email=profile["email"],
                    name=profile.get("display_name"),
                    custom_data={"user_id": user.user_id},
                )
            )
        except PaddleAPIError as exc:
            # If conflict, try to find existing customer by search/email
            if exc.status_code == status.HTTP_409_CONFLICT:
                last_conflict_details = exc.details
                try:
                    # Prefer deterministic email filter over fuzzy search to reuse existing customers reliably; fall back to fuzzy
                    search_res = {}
                    search_res_email = await client.list_customers(email=profile["email"])
                    search_res["email_filter"] = search_res_email
                    items = []
                    if isinstance(search_res_email, dict):
                        items = search_res_email.get("data") or search_res_email.get("customers") or []
                    if not items:
                        search_res_fuzzy = await client.search_customers(profile["email"])
                        search_res["search"] = search_res_fuzzy
                        if isinstance(search_res_fuzzy, dict):
                            items = search_res_fuzzy.get("data") or search_res_fuzzy.get("customers") or []
                    if items:
                        first = items[0]
                        customer = CustomerResponse.model_validate(first)
                        logger.info(
                            "billing.customer.reused",
                            extra={"user_id": user.user_id, "customer_id": customer.id, "conflict_details": exc.details},
                        )
                    else:
                        logger.error(
                            "billing.customer.conflict_no_match",
                            extra={
                                "user_id": user.user_id,
                                "email": profile["email"],
                                "conflict_details": exc.details,
                                "search_res": search_res,
                            },
                        )
                        raise
                except Exception:
                    logger.error(
                        "billing.customer.conflict_no_match",
                        extra={
                            "user_id": user.user_id,
                            "email": profile["email"],
                            "conflict_details": exc.details,
                            "search_res": search_res,
                        },
                    )
                    raise HTTPException(
                        status_code=exc.status_code,
                        detail={"error": "paddle_customer_conflict", "details": last_conflict_details, "search": search_res},
                    ) from exc
            else:
                raise

        customer_id = customer.id
        if address_mode == "checkout":
            upsert_paddle_ids(user.user_id, customer_id, None)
            logger.info(
                "billing.address.skipped_checkout",
                extra={"user_id": user.user_id, "customer_id": customer_id},
            )
            return customer_id, None
        address_id = await create_or_reuse_address(customer_id)
        upsert_paddle_ids(user.user_id, customer_id, address_id)
        return customer_id, address_id
    except PaddleAPIError as exc:
        logger.error(
            "billing.customer_address.error",
            extra={"user_id": user.user_id, "status_code": exc.status_code, "details": exc.details},
        )
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.details or exc.args[0] or {"error": "paddle_customer_address_error", "details": exc.details},
        )


@router.post("/transactions", response_model=CreateTransactionResponse)
async def create_transaction(
    payload: CheckoutRequest,
    user: AuthContext = Depends(get_current_user),
):
    config = get_paddle_config()
    plan_row = get_billing_plan_by_price_id(payload.price_id)
    if not plan_row:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown price_id")
    if payload.metadata is not None:
        logger.warning(
            "billing.transaction.metadata_unsupported",
            extra={
                "user_id": user.user_id,
                "price_id": payload.price_id,
                "metadata_keys": list(payload.metadata.keys()),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="metadata is not supported; use custom_data",
        )

    try:
        customer_id, address_id = await _resolve_customer_and_address(user)
        client = get_paddle_client()
        tx_payload = CreateTransactionRequest(
            customer_id=customer_id,
            address_id=address_id,
            items=[TransactionItem(price_id=payload.price_id, quantity=payload.quantity)],
            custom_data={**(payload.custom_data or {}), "supabase_user_id": user.user_id},
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
    verify_webhook(raw_body=raw_body, signature_header=signature_header, remote_ip=remote_ip, headers=request.headers)
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
    plan_rows = get_billing_plans_by_price_ids(price_ids)
    price_to_credits: Dict[str, int] = {}
    for row in plan_rows:
        try:
            credits_val = int(row.get("credits") or 0)
        except Exception:
            credits_val = 0
        price_to_credits[str(row.get("paddle_price_id"))] = credits_val

    for item in items:
        price_id = None
        quantity = 1
        if isinstance(item, dict):
            price_id = item.get("price_id") or (item.get("price") or {}).get("id")
            quantity = item.get("quantity") or 1
        if not price_id:
            continue
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
