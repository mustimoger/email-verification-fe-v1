import logging
from typing import Dict, Optional

from ..clients.external import TaskMetrics

logger = logging.getLogger(__name__)

_VALID_ALIASES = ("valid", "exists")
_INVALID_ALIASES = ("invalid", "not_exists", "invalid_syntax")
_CATCHALL_ALIASES = ("catchall", "catch_all", "catch-all")
_ROLE_BASED_ALIASES = ("role_based", "role-based", "rolebased")
_DISPOSABLE_ALIASES = ("disposable_domain", "disposable_domain_emails", "disposable-domain", "disposable")
_KNOWN_SECONDARY_ALIASES = ("unknown",)
_KNOWN_STATUS_KEYS = (
    *_VALID_ALIASES,
    *_INVALID_ALIASES,
    *_CATCHALL_ALIASES,
    *_ROLE_BASED_ALIASES,
    *_DISPOSABLE_ALIASES,
    *_KNOWN_SECONDARY_ALIASES,
)


def _coerce_int(value: object) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        logger.warning("tasks.metrics.invalid_count_value", extra={"value": value})
        return None


def counts_from_metrics(
    metrics: Optional[TaskMetrics | Dict[str, object]],
) -> Optional[Dict[str, int]]:
    if not metrics:
        return None
    status_counts = metrics.get("verification_status") if isinstance(metrics, dict) else metrics.verification_status
    if not isinstance(status_counts, dict) or not status_counts:
        return None

    normalized_counts: Dict[str, object] = {}
    for raw_key, raw_value in status_counts.items():
        key = str(raw_key).strip().lower()
        if not key:
            continue
        normalized_counts[key] = raw_value

    def _sum_aliases(keys: tuple[str, ...]) -> int:
        total = 0
        for key in keys:
            total += _coerce_int(normalized_counts.get(key)) or 0
        return total

    valid = _sum_aliases(_VALID_ALIASES)
    catchall = _sum_aliases(_CATCHALL_ALIASES)
    invalid = _sum_aliases(_INVALID_ALIASES)
    role_based = _sum_aliases(_ROLE_BASED_ALIASES)
    disposable = _sum_aliases(_DISPOSABLE_ALIASES)

    unknown_statuses: list[str] = [
        key for key in normalized_counts.keys() if key not in _KNOWN_STATUS_KEYS and _coerce_int(normalized_counts.get(key)) is not None
    ]

    if unknown_statuses:
        logger.warning("tasks.metrics.unknown_statuses", extra={"statuses": unknown_statuses})

    return {
        "valid": valid,
        "catchall": catchall,
        "invalid": invalid,
        "role_based": role_based,
        "disposable": disposable,
    }


def email_count_from_metrics(metrics: Optional[TaskMetrics | Dict[str, object]]) -> Optional[int]:
    if not metrics:
        return None
    raw_total = metrics.get("total_email_addresses") if isinstance(metrics, dict) else metrics.total_email_addresses
    return _coerce_int(raw_total)
