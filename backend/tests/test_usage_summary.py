import pytest

from app.services.usage_summary import normalize_range_value, summarize_usage_rows


def test_normalize_range_value_accepts_rfc3339():
    assert normalize_range_value("2024-01-01T00:00:00Z") is not None


def test_normalize_range_value_none():
    assert normalize_range_value(None) is None


def test_normalize_range_value_invalid():
    with pytest.raises(ValueError):
        normalize_range_value("not-a-date")


def test_summarize_usage_rows_groups_by_day():
    rows = [
        {"task_id": "t1", "created_at": "2024-02-01T10:00:00Z", "email_count": 3},
        {"task_id": "t2", "created_at": "2024-02-01T12:00:00Z", "email_count": 4},
        {"task_id": "t3", "created_at": "2024-02-02T08:00:00Z", "email_count": 2},
    ]
    summary = summarize_usage_rows(rows)
    assert summary["total"] == 9
    assert summary["series"] == [
        {"date": "2024-02-01", "count": 7},
        {"date": "2024-02-02", "count": 2},
    ]
