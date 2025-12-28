import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import tasks as tasks_module
from app.api.tasks import router
from app.core.auth import AuthContext


@pytest.fixture(autouse=True)
def env(monkeypatch):
    monkeypatch.setenv("EMAIL_API_BASE_URL", "https://api.test")
    monkeypatch.setenv("SUPABASE_URL", "https://sb.test")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service_key")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    monkeypatch.setenv("SUPABASE_AUTH_COOKIE_NAME", "cookie_name")


def _build_app(monkeypatch, latest_task):
    app = FastAPI()
    app.include_router(router)

    def fake_user():
        return AuthContext(user_id="user-manual", claims={}, token="t")

    def fake_client():
        return object()

    monkeypatch.setattr(tasks_module, "fetch_latest_manual_task", lambda user_id, limit: latest_task)
    monkeypatch.setattr(tasks_module, "record_usage", lambda *args, **kwargs: None)
    app.dependency_overrides[tasks_module.get_current_user] = fake_user
    app.dependency_overrides[tasks_module.get_user_external_client] = fake_client
    return app


def test_latest_manual_returns_payload(monkeypatch):
    latest_task = {
        "task_id": "task-manual",
        "created_at": "2024-02-03T00:00:00Z",
        "status": "processing",
        "email_count": 4,
        "valid_count": 2,
        "invalid_count": 1,
        "catchall_count": 1,
        "job_status": {"pending": 1},
        "manual_emails": ["alpha@example.com", "beta@example.com"],
        "manual_results": [
            {"email": "alpha@example.com", "status": "exists", "message": "ok"},
            {"email": "beta@example.com", "status": "unknown", "message": "queued"},
        ],
    }
    app = _build_app(monkeypatch, latest_task)
    client = TestClient(app)

    resp = client.get("/api/tasks/latest-manual")
    assert resp.status_code == 200
    data = resp.json()
    assert data["task_id"] == "task-manual"
    assert data["status"] == "processing"
    assert data["job_status"]["pending"] == 1
    assert data["manual_emails"] == ["alpha@example.com", "beta@example.com"]
    assert data["manual_results"][0]["email"] == "alpha@example.com"


def test_latest_manual_returns_no_content(monkeypatch):
    app = _build_app(monkeypatch, None)
    client = TestClient(app)

    resp = client.get("/api/tasks/latest-manual")
    assert resp.status_code == 204
    assert resp.text == ""


def test_latest_manual_refresh_details(monkeypatch):
    latest_task = {
        "task_id": "task-manual",
        "created_at": "2024-02-03T00:00:00Z",
        "status": "processing",
        "email_count": 1,
        "valid_count": 1,
        "invalid_count": 0,
        "catchall_count": 0,
        "job_status": {"pending": 0, "completed": 1},
        "manual_emails": ["alpha@example.com"],
        "manual_results": [
            {"email": "alpha@example.com", "status": "exists", "is_role_based": False},
        ],
    }
    app = _build_app(monkeypatch, latest_task)

    refreshed = [
        {
            "email": "alpha@example.com",
            "status": "exists",
            "is_role_based": False,
            "catchall_domain": True,
            "email_server": "Google Workspace",
            "disposable_domain": False,
            "registered_domain": True,
            "mx_record": "mx.example.com",
        }
    ]

    calls = {}
    sentinel = object()

    def fake_resolve_dashboard(user_id: str):
        calls["resolve_invoked"] = True
        assert user_id == "user-manual"
        return sentinel

    async def fake_refresh(user_id, task_id, manual_results, manual_emails, client):
        calls["invoked"] = True
        assert user_id == "user-manual"
        assert task_id == "task-manual"
        assert client is sentinel
        return refreshed

    monkeypatch.setattr(tasks_module, "resolve_dashboard_email_client", fake_resolve_dashboard)
    monkeypatch.setattr(tasks_module, "_refresh_manual_results_export_details", fake_refresh)
    client = TestClient(app)

    resp = client.get("/api/tasks/latest-manual?refresh_details=true")
    assert resp.status_code == 200
    data = resp.json()
    assert calls.get("resolve_invoked") is True
    assert calls.get("invoked") is True
    assert data["manual_results"] == refreshed


def test_latest_manual_refresh_details_handles_lookup_failure(monkeypatch):
    latest_task = {
        "task_id": "task-manual",
        "created_at": "2024-02-03T00:00:00Z",
        "status": "processing",
        "email_count": 1,
        "valid_count": 1,
        "invalid_count": 0,
        "catchall_count": 0,
        "job_status": {"pending": 0, "completed": 1},
        "manual_emails": ["alpha@example.com"],
        "manual_results": [
            {"email": "alpha@example.com", "status": "exists", "is_role_based": False},
        ],
    }
    app = _build_app(monkeypatch, latest_task)
    sentinel = object()

    def fake_resolve_dashboard(user_id: str):
        assert user_id == "user-manual"
        return sentinel

    async def fake_refresh(user_id, task_id, manual_results, manual_emails, client):
        assert client is sentinel
        raise tasks_module.ExternalAPIError(status_code=504, message="timeout", details="timeout")

    monkeypatch.setattr(tasks_module, "resolve_dashboard_email_client", fake_resolve_dashboard)
    monkeypatch.setattr(tasks_module, "_refresh_manual_results_export_details", fake_refresh)
    client = TestClient(app)

    resp = client.get("/api/tasks/latest-manual?refresh_details=true")
    assert resp.status_code == 200
    data = resp.json()
    assert data["manual_results"][0]["email"] == "alpha@example.com"


def test_latest_manual_refresh_details_skips_without_dashboard_key(monkeypatch):
    latest_task = {
        "task_id": "task-manual",
        "created_at": "2024-02-03T00:00:00Z",
        "status": "processing",
        "email_count": 1,
        "valid_count": 1,
        "invalid_count": 0,
        "catchall_count": 0,
        "job_status": {"pending": 0, "completed": 1},
        "manual_emails": ["alpha@example.com"],
        "manual_results": [
            {"email": "alpha@example.com", "status": "exists", "is_role_based": False},
        ],
    }
    app = _build_app(monkeypatch, latest_task)
    calls = {}

    def fake_resolve_dashboard(user_id: str):
        calls["resolve_invoked"] = True
        assert user_id == "user-manual"
        return None

    async def fake_refresh(user_id, task_id, manual_results, manual_emails, client):
        calls["refresh_invoked"] = True
        return []

    monkeypatch.setattr(tasks_module, "resolve_dashboard_email_client", fake_resolve_dashboard)
    monkeypatch.setattr(tasks_module, "_refresh_manual_results_export_details", fake_refresh)
    client = TestClient(app)

    resp = client.get("/api/tasks/latest-manual?refresh_details=true")
    assert resp.status_code == 200
    data = resp.json()
    assert calls.get("resolve_invoked") is True
    assert calls.get("refresh_invoked") is None
    assert data["manual_results"][0]["email"] == "alpha@example.com"
