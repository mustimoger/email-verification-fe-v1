import pytest

from app.services import credits as credits_service


def test_apply_credit_debit_returns_status(monkeypatch):
    def fake_apply(user_id: str, amount: int, source: str, source_id: str, meta=None):
        return {"status": "applied", "credits_remaining": 42}

    monkeypatch.setattr(credits_service.supabase_client, "apply_credit_debit", fake_apply)
    result = credits_service.apply_credit_debit(
        user_id="user-1",
        credits=5,
        source=credits_service.CREDIT_SOURCE_TASK,
        source_id="task-1",
        meta={"processed": 5},
    )
    assert result["status"] == "applied"
    assert result["credits_remaining"] == 42


def test_apply_credit_debit_invalid_amount_returns_invalid(monkeypatch):
    monkeypatch.setattr(credits_service.supabase_client, "fetch_credits", lambda user_id: 7)
    result = credits_service.apply_credit_debit(
        user_id="user-2",
        credits=0,
        source=credits_service.CREDIT_SOURCE_VERIFY,
        source_id="verify-1",
    )
    assert result["status"] == "invalid"
    assert result["credits_remaining"] == 7


@pytest.mark.parametrize("status", ["insufficient", "duplicate"])
def test_apply_credit_debit_passes_through_status(monkeypatch, status):
    def fake_apply(user_id: str, amount: int, source: str, source_id: str, meta=None):
        return {"status": status, "credits_remaining": 10}

    monkeypatch.setattr(credits_service.supabase_client, "apply_credit_debit", fake_apply)
    result = credits_service.apply_credit_debit(
        user_id="user-3",
        credits=3,
        source=credits_service.CREDIT_SOURCE_TASK,
        source_id="task-dup",
    )
    assert result["status"] == status
    assert result["credits_remaining"] == 10
