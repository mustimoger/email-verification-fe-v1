# External endpoint (external_controller.go)

## Overview
- Source: `services/go/app/cmd/controllers/external_controller.go`
- Base path: `/api/v1`
- Auth: Custom HMAC (`X-Authentication-Key` header)
- Endpoint: `/api/v1/external/verify` only

This endpoint is designed for external systems that cannot use API keys or JWTs. It supports both JSON requests and multipart file uploads.

## Auth: X-Authentication-Key
Header format:
```bash
X-Authentication-Key: <nonce>.<timestamp>.<signature>
```

Rules:
- `timestamp` is RFC3339 (e.g., `2025-01-01T12:00:00Z`).
- Timestamp must be within the past 5 minutes; future timestamps are rejected.
- `nonce` must be unique. It is stored in Redis for 5 minutes to prevent replay.
- `signature` is computed as:
  - `body_hash = sha256(raw_body)` (hex)
  - `path = Path + "?" + QueryString` (if query exists)
  - `payload = nonce + timestamp + method + path + body_hash`
  - `signature = HMAC-SHA256(payload, secret_key)`

If Redis is unavailable and `RequireNonceStore` is true, the request is rejected.

## POST /api/v1/external/verify
Purpose: verify one email, verify a short list in real time, or create a batch task for large lists.

### Request (JSON)
Body options:
- Single email:
```json
{ "email": "user@example.com" }
```

- Multiple emails (max 10,000):
```json
{ "emails": ["user1@example.com", "user2@example.com"], "webhook_url": "https://example.com/webhook" }
```

Notes:
- If `emails` length < 10, the endpoint performs real-time verification and returns an array of results.
- If `emails` length >= 10, a task is created and queued.
- If both `email` and `emails` are provided, `email` takes precedence.
- If any email in `emails` is invalid, the request is rejected with `400` (no per-item error list).

Example request:
```bash
curl -X POST \
  'https://api.example.com/api/v1/external/verify' \
  -H 'X-Authentication-Key: <nonce>.<timestamp>.<signature>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com"}'
```

### Response (single email)
Status: `200 OK`

Example response:
```json
{
  "email": "user@example.com",
  "status": "exists",
  "is_role_based": false,
  "is_disposable": false,
  "has_mx_records": true,
  "has_reverse_dns": true,
  "domain_name": "example.com",
  "host_name": "mx1.example.com",
  "server_type": "smtp",
  "is_catchall": false,
  "validated_at": "2025-01-01T12:00:00Z",
  "unknown_reason": null,
  "needs_physical_verify": false
}
```

### Response (multiple emails, < 10)
Status: `200 OK`

Example response:
```json
{
  "results": [
    { "email": "user1@example.com", "status": "exists", "is_role_based": false },
    { "email": "user2@example.com", "error": "Invalid email format" }
  ]
}
```

### Response (multiple emails, >= 10)
Status: `201 Created`

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "api_key",
  "email_count": 100,
  "domain_count": 20,
  "status": "processing"
}
```

If all emails are skipped/cached, the response is:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "api_key",
  "email_count": 100,
  "status": "completed"
}
```

### Request (multipart file upload)
If the request is `multipart/form-data`, the endpoint delegates to batch upload behavior.

Form fields:
- `file` (required): email list file
- `webhook_url` (optional)
- `email_column` or `column` (optional for CSV/XLSX)

Response: same as `/api/v1/tasks/batch/upload` (202 Accepted with upload_id).

Errors:
- `400` invalid body, invalid email format, or too many emails.
- `401` invalid/missing authentication header.
- `408` verification timed out (single email).
- `503` auth service unavailable (e.g., nonce store required but Redis unavailable).
- `500` internal error.

Additional auth error cases:
- `401` invalid header format or invalid signature.
- `500` nonce store error or encryption key not configured.
