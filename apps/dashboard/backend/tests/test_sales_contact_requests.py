from types import SimpleNamespace

from postgrest.exceptions import APIError

from app.services import sales_contact_requests
from app.services.sales_contact_requests import SalesContactRequestRecord


class FakeTable:
    def __init__(self, rows):
        self.rows = rows
        self._mode = None
        self._payload = None
        self._filters = {}
        self._limit = None

    def insert(self, payload, **kwargs):
        self._mode = "insert"
        self._payload = payload
        return self

    def select(self, _fields):
        self._mode = "select"
        self._filters = {}
        self._limit = None
        return self

    def eq(self, key, value):
        self._filters[key] = value
        return self

    def limit(self, value):
        self._limit = value
        return self

    def execute(self):
        if self._mode == "insert":
            request_id = self._payload["request_id"]
            user_id = self._payload["user_id"]
            idem_key = self._payload.get("idempotency_key")

            for row in self.rows:
                if row["request_id"] == request_id:
                    raise APIError({"code": "23505", "message": "duplicate request_id"})
                if idem_key and row["user_id"] == user_id and row.get("idempotency_key") == idem_key:
                    raise APIError({"code": "23505", "message": "duplicate idempotency key"})

            self.rows.append(dict(self._payload))
            return SimpleNamespace(data=[self._payload])

        if self._mode == "select":
            data = [
                row
                for row in self.rows
                if all(row.get(filter_key) == filter_value for filter_key, filter_value in self._filters.items())
            ]
            if self._limit is not None:
                data = data[: self._limit]
            return SimpleNamespace(data=data)

        return SimpleNamespace(data=[])


class FakeClient:
    def __init__(self, rows):
        self.rows = rows

    def table(self, name):
        assert name == sales_contact_requests.SALES_CONTACT_REQUESTS_TABLE
        return FakeTable(self.rows)


def _build_record(idempotency_key: str | None = "idem-1"):
    return SalesContactRequestRecord(
        user_id="11111111-1111-1111-1111-111111111111",
        source="dashboard_pricing",
        plan="annual",
        quantity=100000,
        contact_required=True,
        page="/pricing",
        request_ip="127.0.0.1",
        user_agent="pytest-agent/1.0",
        account_email="user@example.com",
        idempotency_key=idempotency_key,
    )


def test_persist_sales_contact_request_uses_dedicated_table(monkeypatch):
    rows = []
    monkeypatch.setattr(sales_contact_requests, "get_supabase", lambda: FakeClient(rows))

    result = sales_contact_requests.persist_sales_contact_request(_build_record())

    assert result.deduplicated is False
    assert result.request_id.startswith("salesreq_")
    assert len(rows) == 1
    assert rows[0]["source"] == "dashboard_pricing"
    assert rows[0]["plan"] == "annual"
    assert rows[0]["idempotency_key"] == "idem-1"


def test_persist_sales_contact_request_returns_existing_request_id_on_duplicate(monkeypatch):
    existing_request_id = "salesreq_existing_123"
    rows = [
        {
            "request_id": existing_request_id,
            "user_id": "11111111-1111-1111-1111-111111111111",
            "idempotency_key": "idem-1",
            "source": "dashboard_pricing",
            "plan": "annual",
            "quantity": 100000,
            "contact_required": True,
            "page": "/pricing",
        }
    ]
    monkeypatch.setattr(sales_contact_requests, "get_supabase", lambda: FakeClient(rows))

    result = sales_contact_requests.persist_sales_contact_request(_build_record())

    assert result.deduplicated is True
    assert result.request_id == existing_request_id
