import pytest

from app.services.date_range import normalize_range_value


def test_normalize_range_value_accepts_rfc3339():
    assert normalize_range_value("2024-01-01T00:00:00Z") is not None


def test_normalize_range_value_none():
    assert normalize_range_value(None) is None


def test_normalize_range_value_invalid():
    with pytest.raises(ValueError):
        normalize_range_value("not-a-date")

