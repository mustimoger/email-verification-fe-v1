from typing import Dict, List, Optional

from ..clients.external import VerificationMetricsResponse


def coerce_int(value: object) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def usage_series_from_metrics(metrics: Optional[VerificationMetricsResponse]) -> List[Dict[str, object]]:
    if not metrics or not isinstance(getattr(metrics, "series", None), list):
        return []
    points: List[Dict[str, object]] = []
    for point in metrics.series or []:
        date = getattr(point, "date", None)
        total = getattr(point, "total_verifications", None)
        if not isinstance(date, str) or not date.strip():
            continue
        count = coerce_int(total)
        if count is None:
            continue
        points.append({"date": date, "count": count})
    return points
