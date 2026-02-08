from types import SimpleNamespace

from postgrest.exceptions import APIError

from app.services import billing_events


class FakeTable:
    def __init__(self, store):
        self.store = store
        self.payload = None

    def insert(self, payload, **kwargs):
        self.payload = payload
        return self

    def execute(self):
        event_id = self.payload["event_id"]
        if event_id in self.store:
            raise APIError(
                {
                    "code": "23505",
                    "message": "duplicate key value violates unique constraint",
                    "details": f"Key (event_id)=({event_id}) already exists.",
                }
            )
        self.store.add(event_id)
        return SimpleNamespace(data=[self.payload])


class FakeClient:
    def __init__(self, store):
        self.store = store

    def table(self, name):
        return FakeTable(self.store)


def test_record_billing_event_duplicate_is_ignored(monkeypatch):
    store = set()
    fake_client = FakeClient(store)
    monkeypatch.setattr(billing_events, "get_supabase", lambda: fake_client)

    payload = {
        "event_id": "evt_1",
        "user_id": "user_1",
        "event_type": "transaction.completed",
        "transaction_id": "txn_1",
        "price_ids": ["pri_1"],
        "credits_granted": 100,
        "raw": {"event_id": "evt_1"},
    }

    assert billing_events.record_billing_event(**payload) is True
    assert billing_events.record_billing_event(**payload) is False
    assert len(store) == 1
