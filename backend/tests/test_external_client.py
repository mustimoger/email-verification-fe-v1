import asyncio

import asyncio

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
                "status": "exists",
                "verification_steps": [{"step": "syntax", "status": "completed"}],
            },
        )

    monkeypatch.setattr(client, "_request", fake_request)
    result = asyncio.run(client.verify_email("a@test.com"))
    assert isinstance(result, VerifyEmailResponse)
    assert result.email == "a@test.com"
    assert result.status == "exists"


def test_upload_rejects_too_large(monkeypatch):
    client = ExternalAPIClient(base_url="https://api.test", bearer_token="key", max_upload_bytes=4)
    with pytest.raises(ExternalAPIError):
        asyncio.run(client.upload_batch_file(filename="file.txt", content=b"012345"))
