from types import SimpleNamespace

from app.services import task_credit_reservations


class FakeTable:
    def __init__(self, data=None, raise_on_execute=False):
        self.data = data
        self.raise_on_execute = raise_on_execute
        self.payload = None
        self.on_conflict = None
        self.selected = None
        self.filters = []
        self.limit_value = None

    def upsert(self, payload, on_conflict=None):
        self.payload = payload
        self.on_conflict = on_conflict
        return self

    def select(self, fields):
        self.selected = fields
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def execute(self):
        if self.raise_on_execute:
            raise Exception("boom")
        return SimpleNamespace(data=self.data)


class FakeClient:
    def __init__(self, table):
        self.table_instance = table
        self.table_name = None

    def table(self, name):
        self.table_name = name
        return self.table_instance


def test_update_task_reservation_upserts_payload(monkeypatch):
    table = FakeTable()
    client = FakeClient(table)
    monkeypatch.setattr(task_credit_reservations, "get_supabase", lambda: client)

    task_credit_reservations.update_task_reservation(
        user_id="user-1",
        task_id="task-1",
        reserved_count=12,
        reservation_id="res-1",
    )

    assert client.table_name == "task_credit_reservations"
    assert table.payload == {
        "user_id": "user-1",
        "task_id": "task-1",
        "credit_reserved_count": 12,
        "credit_reservation_id": "res-1",
    }
    assert table.on_conflict == "user_id,task_id"


def test_update_task_reservation_handles_execute_error(monkeypatch):
    table = FakeTable(raise_on_execute=True)
    client = FakeClient(table)
    monkeypatch.setattr(task_credit_reservations, "get_supabase", lambda: client)

    task_credit_reservations.update_task_reservation(
        user_id="user-2",
        task_id="task-2",
        reserved_count=3,
        reservation_id="res-2",
    )


def test_fetch_task_credit_reservation_returns_row(monkeypatch):
    table = FakeTable(data=[{"credit_reserved_count": 7, "credit_reservation_id": "res-3"}])
    client = FakeClient(table)
    monkeypatch.setattr(task_credit_reservations, "get_supabase", lambda: client)

    result = task_credit_reservations.fetch_task_credit_reservation("user-3", "task-3")

    assert client.table_name == "task_credit_reservations"
    assert table.selected == "credit_reserved_count,credit_reservation_id"
    assert ("user_id", "user-3") in table.filters
    assert ("task_id", "task-3") in table.filters
    assert table.limit_value == 1
    assert result == {"credit_reserved_count": 7, "credit_reservation_id": "res-3"}


def test_fetch_task_credit_reservation_returns_none_when_missing(monkeypatch):
    table = FakeTable(data=[])
    client = FakeClient(table)
    monkeypatch.setattr(task_credit_reservations, "get_supabase", lambda: client)

    result = task_credit_reservations.fetch_task_credit_reservation("user-4", "task-4")

    assert result is None


def test_fetch_task_credit_reservation_handles_execute_error(monkeypatch):
    table = FakeTable(raise_on_execute=True)
    client = FakeClient(table)
    monkeypatch.setattr(task_credit_reservations, "get_supabase", lambda: client)

    result = task_credit_reservations.fetch_task_credit_reservation("user-5", "task-5")

    assert result is None
