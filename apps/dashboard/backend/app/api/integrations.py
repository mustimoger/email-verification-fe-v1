import logging
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..core.auth import get_current_user
from ..config.integrations import get_integrations, IntegrationDefinition

router = APIRouter(prefix="/api", tags=["integrations"])
logger = logging.getLogger(__name__)


class IntegrationResponse(BaseModel):
    id: str
    label: str
    description: str
    icon: Optional[str] = None
    default_name: Optional[str] = None


@router.get("/integrations", response_model=List[IntegrationResponse])
async def list_integrations(user=Depends(get_current_user)):
    items = get_integrations()
    logger.info("route.integrations.list", extra={"user_id": user.user_id, "count": len(items)})
    return [IntegrationResponse(**integration.__dict__) for integration in items]
