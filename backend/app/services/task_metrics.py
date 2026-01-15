import logging
from typing import Dict, Optional

from ..clients.external import TaskMetrics

logger = logging.getLogger(__name__)


def _coerce_int(value: object) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        logger.warning("tasks.metrics.invalid_count_value", extra={"value": value})
        return None


def counts_from_metrics(metrics: Optional[TaskMetrics | Dict[str, object]]) -> Optional[Dict[str, int]]:
    if not metrics:
        return None
    status_counts = metrics.get("verification_status") if isinstance(metrics, dict) else metrics.verification_status
    if not isinstance(status_counts, dict) or not status_counts:
        return None

    valid = _coerce_int(status_counts.get("exists")) or 0
    catchall = _coerce_int(status_counts.get("catchall")) or 0
    invalid = 0
    unknown_statuses: list[str] = []
    for key, raw in status_counts.items():
        if key in ("exists", "catchall"):
            continue
        count = _coerce_int(raw)
        if count is None:
            continue
        invalid += count
        if key not in ("not_exists", "invalid_syntax", "unknown"):
            unknown_statuses.append(key)

    if unknown_statuses:
        logger.warning("tasks.metrics.unknown_statuses", extra={"statuses": unknown_statuses})

    return {"valid": valid, "catchall": catchall, "invalid": invalid}


def email_count_from_metrics(metrics: Optional[TaskMetrics | Dict[str, object]]) -> Optional[int]:
    if not metrics:
        return None
    raw_total = metrics.get("total_email_addresses") if isinstance(metrics, dict) else metrics.total_email_addresses
    return _coerce_int(raw_total)
