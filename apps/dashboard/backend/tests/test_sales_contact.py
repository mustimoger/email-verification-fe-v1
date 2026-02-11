from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import sales as sales_module
from app.api.sales import router as sales_router
from app.core.auth import AuthContext
from app.services.sales_contact_requests import SalesContactPersistResult, SalesContactPersistenceError


def _build_app():
    app = FastAPI()
    app.include_router(sales_router)
    return app


def test_create_contact_request_success(monkeypatch):
    app = _build_app()
    captured = {}

    def fake_user():
        return AuthContext(user_id="user-1", claims={"email": "claim@example.com"}, token="token")

    def fake_submit(*, payload, user, request_ip, user_agent, idempotency_key):
        captured["payload"] = payload
        captured["user"] = user
        captured["request_ip"] = request_ip
        captured["user_agent"] = user_agent
        captured["idempotency_key"] = idempotency_key
        return SalesContactPersistResult(request_id="salesreq_abc123", deduplicated=False)

    app.dependency_overrides[sales_module.get_current_user] = fake_user
    monkeypatch.setattr(sales_module, "_allow_rate_limited_request", lambda **kwargs: True)
    monkeypatch.setattr(sales_module, "_submit_sales_contact_request", fake_submit)

    client = TestClient(app)
    resp = client.post(
        "/api/sales/contact-request",
        headers={"Idempotency-Key": "idem-key-1", "User-Agent": "pytest-agent/1.0"},
        json={
            "source": "dashboard_pricing",
            "plan": "annual",
            "quantity": 100000,
            "contactRequired": True,
            "page": "/pricing",
        },
    )

    assert resp.status_code == 200
    assert resp.json() == {
        "ok": True,
        "requestId": "salesreq_abc123",
        "message": "Sales request submitted.",
    }
    assert captured["payload"].plan == "annual"
    assert captured["payload"].quantity == 100000
    assert captured["request_ip"] == "testclient"
    assert captured["user_agent"] == "pytest-agent/1.0"
    assert captured["idempotency_key"] == "idem-key-1"


def test_create_contact_request_invalid_payload(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="user-2", claims={}, token="token")

    app.dependency_overrides[sales_module.get_current_user] = fake_user
    monkeypatch.setattr(sales_module, "_allow_rate_limited_request", lambda **kwargs: True)

    client = TestClient(app)
    resp = client.post(
        "/api/sales/contact-request",
        json={
            "source": "dashboard_pricing",
            "plan": "monthly",
            "quantity": -1,
            "contactRequired": True,
            "page": "/pricing",
        },
    )

    assert resp.status_code == 400
    assert resp.json()["ok"] is False
    assert resp.json()["error"] == "invalid_payload"


def test_create_contact_request_rate_limited(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="user-3", claims={}, token="token")

    app.dependency_overrides[sales_module.get_current_user] = fake_user
    monkeypatch.setattr(sales_module, "_allow_rate_limited_request", lambda **kwargs: False)

    client = TestClient(app)
    resp = client.post(
        "/api/sales/contact-request",
        json={
            "source": "dashboard_pricing",
            "plan": "payg",
            "quantity": 25000,
            "contactRequired": False,
            "page": "/pricing",
        },
    )

    assert resp.status_code == 429
    assert resp.json() == {
        "ok": False,
        "error": "rate_limited",
        "message": "Too many contact requests. Please try again shortly.",
    }


def test_create_contact_request_persistence_error(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="user-4", claims={}, token="token")

    def fail_submit(**kwargs):
        raise SalesContactPersistenceError("failed")

    app.dependency_overrides[sales_module.get_current_user] = fake_user
    monkeypatch.setattr(sales_module, "_allow_rate_limited_request", lambda **kwargs: True)
    monkeypatch.setattr(sales_module, "_submit_sales_contact_request", fail_submit)

    client = TestClient(app)
    resp = client.post(
        "/api/sales/contact-request",
        json={
            "source": "dashboard_pricing",
            "plan": "monthly",
            "quantity": 50000,
            "contactRequired": True,
            "page": "/pricing",
        },
    )

    assert resp.status_code == 503
    assert resp.json()["ok"] is False
    assert resp.json()["error"] == "service_unavailable"


def test_create_contact_request_deduplicated(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="user-5", claims={}, token="token")

    def fake_submit(**kwargs):
        return SalesContactPersistResult(request_id="salesreq_dup123", deduplicated=True)

    app.dependency_overrides[sales_module.get_current_user] = fake_user
    monkeypatch.setattr(sales_module, "_allow_rate_limited_request", lambda **kwargs: True)
    monkeypatch.setattr(sales_module, "_submit_sales_contact_request", fake_submit)

    client = TestClient(app)
    resp = client.post(
        "/api/sales/contact-request",
        headers={"Idempotency-Key": "fixed-key"},
        json={
            "source": "dashboard_pricing",
            "plan": "monthly",
            "quantity": 50000,
            "contactRequired": True,
            "page": "/pricing",
        },
    )

    assert resp.status_code == 200
    assert resp.json() == {
        "ok": True,
        "requestId": "salesreq_dup123",
        "message": "Sales request already submitted.",
    }
