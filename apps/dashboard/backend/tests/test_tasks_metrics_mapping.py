import logging

from app.clients.external import TaskMetrics
from app.services import task_metrics


def test_counts_from_metrics_maps_known_statuses():
    metrics = TaskMetrics(
        verification_status={
            "valid": 2,
            "catchall": 1,
            "invalid": 3,
            "invalid_syntax": 4,
            "unknown": 5,
            "role_based": 2,
            "disposable_domain": 3,
        }
    )
    counts = task_metrics.counts_from_metrics(metrics)
    assert counts == {"valid": 2, "catchall": 1, "invalid": 7, "role_based": 2, "disposable": 3}


def test_counts_from_metrics_logs_unknown_statuses(caplog):
    metrics = TaskMetrics(
        verification_status={
            "valid": 1,
            "role_based": 2,
            "disposable_domain": 3,
            "unknown": 9,
            "risky": 2,
        }
    )
    with caplog.at_level(logging.WARNING):
        counts = task_metrics.counts_from_metrics(metrics)
    assert counts == {"valid": 1, "catchall": 0, "invalid": 0, "role_based": 2, "disposable": 3}
    assert any(record.message == "tasks.metrics.unknown_statuses" for record in caplog.records)


def test_counts_from_metrics_supports_legacy_aliases():
    metrics = TaskMetrics(
        verification_status={
            "exists": "1",
            "not_exists": "2",
            "disposable_domain_emails": "3",
        }
    )
    counts = task_metrics.counts_from_metrics(metrics)
    assert counts == {"valid": 1, "catchall": 0, "invalid": 2, "role_based": 0, "disposable": 3}


def test_email_count_from_metrics_reads_total():
    metrics = TaskMetrics(total_email_addresses=123)
    assert task_metrics.email_count_from_metrics(metrics) == 123


def test_email_count_from_metrics_handles_dict():
    assert task_metrics.email_count_from_metrics({"total_email_addresses": "45"}) == 45
