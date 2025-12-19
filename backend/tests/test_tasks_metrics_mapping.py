import logging

from app.clients.external import TaskMetrics
from app.services import tasks_store


def test_counts_from_metrics_maps_known_statuses():
    metrics = TaskMetrics(
        verification_status={
            "exists": 2,
            "catchall": 1,
            "not_exists": 3,
            "invalid_syntax": 4,
            "unknown": 5,
        }
    )
    counts = tasks_store.counts_from_metrics(metrics)
    assert counts == {"valid": 2, "catchall": 1, "invalid": 12}


def test_counts_from_metrics_logs_unknown_statuses(caplog):
    metrics = TaskMetrics(verification_status={"exists": 1, "risky": 2})
    with caplog.at_level(logging.WARNING):
        counts = tasks_store.counts_from_metrics(metrics)
    assert counts == {"valid": 1, "catchall": 0, "invalid": 2}
    assert any(record.message == "tasks.metrics.unknown_statuses" for record in caplog.records)


def test_email_count_from_metrics_reads_total():
    metrics = TaskMetrics(total_email_addresses=123)
    assert tasks_store.email_count_from_metrics(metrics) == 123


def test_email_count_from_metrics_handles_dict():
    assert tasks_store.email_count_from_metrics({"total_email_addresses": "45"}) == 45
