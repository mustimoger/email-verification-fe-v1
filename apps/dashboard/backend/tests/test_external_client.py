import asyncio

import httpx
import pytest

from app.clients.external import ExternalAPIClient, ExternalAPIError, VerifyEmailResponse


class FakeResponse:
    def __init__(self, status_code: int, payload):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload

    @property
    def text(self):
        return str(self._payload)


def test_verify_email_parses_response(monkeypatch):
    client = ExternalAPIClient(base_url="https://api.test", bearer_token="key")

    async def fake_request(method, path, **kwargs):
        return FakeResponse(
            200,
            {
                "email": "a@test.com",
                "status": "valid",
                "verification_steps": [{"step": "syntax", "status": "completed"}],
            },
        )

    monkeypatch.setattr(client, "_request", fake_request)
    result = asyncio.run(client.verify_email("a@test.com"))
    assert isinstance(result, VerifyEmailResponse)
    assert result.email == "a@test.com"
    assert result.status == "valid"


def test_upload_rejects_too_large():
    client = ExternalAPIClient(base_url="https://api.test", bearer_token="key", max_upload_bytes=4)
    with pytest.raises(ExternalAPIError):
        asyncio.run(client.upload_batch_file(filename="file.txt", content=b"012345"))


def test_list_tasks_parses_file_backed_metadata(monkeypatch):
    client = ExternalAPIClient(base_url="https://api.test", bearer_token="key")
    task_id = "550e8400-e29b-41d4-a716-446655440000"
    upload_id = "550e8400-e29b-41d4-a716-446655440111"

    async def fake_request(method, path, **kwargs):
        assert method == "GET"
        assert path == "/tasks"
        assert kwargs["params"] == {"limit": 5, "offset": 0}
        return FakeResponse(
            200,
            {
                "count": 1,
                "limit": 5,
                "offset": 0,
                "tasks": [
                    {
                        "id": task_id,
                        "user_id": "550e8400-e29b-41d4-a716-446655440010",
                        "webhook_url": "https://example.com/webhook",
                        "is_file_backed": True,
                        "file": {
                            "upload_id": upload_id,
                            "task_id": task_id,
                            "filename": "emails.csv",
                            "email_count": 123,
                            "status": "completed",
                            "created_at": "2025-01-01T12:00:00Z",
                            "updated_at": "2025-01-01T12:05:00Z",
                        },
                        "source": "frontend",
                        "created_at": "2025-01-01T12:00:00Z",
                        "updated_at": "2025-01-01T12:05:00Z",
                    }
                ],
            },
        )

    monkeypatch.setattr(client, "_request", fake_request)
    result = asyncio.run(client.list_tasks(limit=5, offset=0))

    assert result.count == 1
    assert result.tasks is not None
    assert len(result.tasks) == 1
    first_task = result.tasks[0]
    assert first_task.id == task_id
    assert first_task.is_file_backed is True
    assert first_task.file is not None
    assert first_task.file.upload_id == upload_id
    assert first_task.file.filename == "emails.csv"
    assert first_task.file.email_count == 123


def test_get_task_detail_parses_file_backed_metadata(monkeypatch):
    client = ExternalAPIClient(base_url="https://api.test", bearer_token="key")
    task_id = "550e8400-e29b-41d4-a716-446655440000"
    upload_id = "550e8400-e29b-41d4-a716-446655440111"

    async def fake_request(method, path, **kwargs):
        assert method == "GET"
        assert path == f"/tasks/{task_id}"
        return FakeResponse(
            200,
            {
                "id": task_id,
                "user_id": "550e8400-e29b-41d4-a716-446655440010",
                "webhook_url": "https://example.com/webhook",
                "is_file_backed": True,
                "file": {
                    "upload_id": upload_id,
                    "task_id": task_id,
                    "filename": "emails.csv",
                    "email_count": 123,
                    "status": "completed",
                    "created_at": "2025-01-01T12:00:00Z",
                    "updated_at": "2025-01-01T12:05:00Z",
                },
                "source": "frontend",
                "created_at": "2025-01-01T12:00:00Z",
                "updated_at": "2025-01-01T12:05:00Z",
                "started_at": "2025-01-01T12:00:10Z",
                "finished_at": "2025-01-01T12:04:59Z",
                "metrics": {
                    "total_email_addresses": 123,
                    "job_status": {"pending": 0, "processing": 0, "completed": 123, "failed": 0},
                    "progress": 1.0,
                    "progress_percent": 100,
                    "verification_status": {
                        "valid": 120,
                        "invalid": 2,
                        "catchall": 1,
                        "invalid_syntax": 0,
                        "disposable_domain": 0,
                        "unknown": 0,
                        "role_based": 0,
                        "disposable_domain_emails": 0,
                    },
                    "last_verification_requested_at": "2025-01-01T12:00:01Z",
                    "last_verification_completed_at": "2025-01-01T12:04:59Z",
                },
            },
        )

    monkeypatch.setattr(client, "_request", fake_request)
    result = asyncio.run(client.get_task_detail(task_id))

    assert result.id == task_id
    assert result.is_file_backed is True
    assert result.file is not None
    assert result.file.upload_id == upload_id
    assert result.file.status == "completed"
    assert result.metrics is not None
    assert result.metrics.verification_status is not None
    assert result.metrics.verification_status["valid"] == 120


def test_get_upload_status_parses_response(monkeypatch):
    client = ExternalAPIClient(base_url="https://api.test", bearer_token="key")
    upload_id = "7d3df4c6-9a7d-4d16-9f2b-2a5ddf4f4f53"
    task_id = "550e8400-e29b-41d4-a716-446655440000"

    async def fake_request(method, path, **kwargs):
        assert method == "GET"
        assert path == f"/tasks/batch/uploads/{upload_id}"
        return FakeResponse(
            200,
            {
                "upload_id": upload_id,
                "task_id": task_id,
                "filename": "emails.csv",
                "email_count": 123,
                "user_id": "550e8400-e29b-41d4-a716-446655440010",
                "status": "completed",
                "created_at": "2025-01-01T12:00:00Z",
                "updated_at": "2025-01-01T12:05:00Z",
                "task": {
                    "id": task_id,
                    "user_id": "550e8400-e29b-41d4-a716-446655440010",
                    "webhook_url": "https://example.com/webhook",
                    "created_at": "2025-01-01T12:00:00Z",
                    "updated_at": "2025-01-01T12:05:00Z",
                },
            },
        )

    monkeypatch.setattr(client, "_request", fake_request)
    result = asyncio.run(client.get_upload_status(upload_id))

    assert result.upload_id == upload_id
    assert result.task_id == task_id
    assert result.status == "completed"
    assert result.task is not None
    assert result.task.id == task_id


def test_grant_credits_uses_grant_endpoint(monkeypatch):
    client = ExternalAPIClient(base_url="https://api.test", bearer_token="key")

    async def fake_request(method, path, **kwargs):
        assert method == "POST"
        assert path == "/credits/grant"
        assert kwargs["params"] == {"user_id": "user-123"}
        assert kwargs["json"] == {
            "amount": 250,
            "reason": "signup_bonus",
            "metadata": {"source": "signup", "source_id": "user-123"},
        }
        return FakeResponse(
            200,
            {
                "id": "txn_credit_1",
                "user_id": "user-123",
                "type": "credit",
                "amount": 250,
                "reason": "signup_bonus",
            },
        )

    monkeypatch.setattr(client, "_request", fake_request)
    result = asyncio.run(
        client.grant_credits(
            amount=250,
            reason="signup_bonus",
            metadata={"source": "signup", "source_id": "user-123"},
            user_id="user-123",
        )
    )

    assert result.id == "txn_credit_1"
    assert result.user_id == "user-123"
    assert result.amount == 250
    assert result.reason == "signup_bonus"


def test_request_timeout_raises_external_api_error(monkeypatch):
    client = ExternalAPIClient(base_url="https://api.test", bearer_token="key", timeout_seconds=0.01)

    async def fake_request(self, method, url, **kwargs):
        raise httpx.TimeoutException("timeout")

    monkeypatch.setattr(httpx.AsyncClient, "request", fake_request)

    with pytest.raises(ExternalAPIError) as exc:
        asyncio.run(client.verify_email("a@test.com"))
    assert exc.value.status_code == 504


def test_request_error_raises_external_api_error(monkeypatch):
    client = ExternalAPIClient(base_url="https://api.test", bearer_token="key", timeout_seconds=0.01)

    async def fake_request(self, method, url, **kwargs):
        raise httpx.RequestError("network", request=None)

    monkeypatch.setattr(httpx.AsyncClient, "request", fake_request)

    with pytest.raises(ExternalAPIError) as exc:
        asyncio.run(client.verify_email("a@test.com"))
    assert exc.value.status_code == 502
