import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.maintenance import router as maintenance_router
from app.api import maintenance as maintenance_module
from app.core.auth import AuthContext


def _build_app():
    app = FastAPI()
    app.include_router(maintenance_router)
    return app


def test_purge_uploads_calls_retention(monkeypatch):
    app = _build_app()

    def fake_user():
        return AuthContext(user_id="tester", claims={}, token="t")

    captured = []

    def fake_purge():
        captured.append(True)
        return [("u1", "file1.csv"), ("u2", "file2.csv")]

    app.dependency_overrides[maintenance_module.get_current_user] = fake_user
    monkeypatch.setattr(maintenance_module, "purge_expired_uploads", fake_purge)

    client = TestClient(app)
    resp = client.post("/api/maintenance/purge-uploads")
    assert resp.status_code == 200
    data = resp.json()
    assert data["deleted_count"] == 2
    assert len(data["deleted"]) == 2
    assert captured == [True]
