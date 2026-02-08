from datetime import datetime
from typing import Optional


def _parse_datetime(value: str) -> Optional[datetime]:
    raw = value.strip()
    if raw.endswith("Z"):
        raw = f"{raw[:-1]}+00:00"
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        return None


def normalize_range_value(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    raw = value.strip()
    if raw == "":
        return None
    parsed = _parse_datetime(raw)
    if not parsed:
        raise ValueError("Invalid timestamp format; expected RFC3339")
    return parsed.isoformat()
