import logging
from typing import List, Tuple

from fastapi import APIRouter, Depends

from ..core.auth import AuthContext, get_current_user
from ..services.retention import purge_expired_uploads

router = APIRouter(prefix="/api", tags=["maintenance"])
logger = logging.getLogger(__name__)


@router.post("/maintenance/purge-uploads")
def purge_uploads(user: AuthContext = Depends(get_current_user)) -> dict[str, object]:
    """
    Trigger upload retention cleanup. Authenticated route to be called by an operator or scheduled job.
    """
    deleted: List[Tuple[str, str]] = purge_expired_uploads()
    logger.info("maintenance.purge_uploads", extra={"requested_by": user.user_id, "deleted_count": len(deleted)})
    return {"deleted_count": len(deleted), "deleted": [{"user_id": u, "file": f} for u, f in deleted]}
