# Disposable domain endpoints (disposable_domain_controller.go)

## Overview
- Source: `services/go/app/cmd/controllers/disposable_domain_controller.go`
- Base path: `/api/v1`
- Auth: API key
- Access: admin-only (access control).

## GET /api/v1/disposable_domains
Purpose: list disposable domains.

Auth: required. Admin-only.

### Request
Query parameters:
- `limit` (int, default 20, max 100)
- `offset` (int, default 0)

Example request:
```bash
curl -X GET \
  'https://api.example.com/api/v1/disposable_domains?limit=20&offset=0' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `200 OK`

Example response:
```json
{
  "domains": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "domain": "mailinator.com",
      "created_at": "2025-01-01T12:00:00Z",
      "updated_at": "2025-01-01T12:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

Errors:
- `429` rate limited.
- `500` internal error.

## GET /api/v1/disposable_domains/{id}
Purpose: fetch a disposable domain by ID.

Auth: required. Admin-only.

Path parameter:
- `id` (UUID)

Example request:
```bash
curl -X GET \
  'https://api.example.com/api/v1/disposable_domains/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `200 OK`

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "domain": "mailinator.com",
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-01T12:00:00Z"
}
```

Errors:
- `400` missing/invalid UUID.
- `404` not found.
- `429` rate limited.
- `500` internal error.

## POST /api/v1/disposable_domains
Purpose: create a new disposable domain.

Auth: required. Admin-only.

Body:
```json
{ "domain": "mailinator.com" }
```

Notes:
- `domain` must be a valid fully-qualified domain name (FQDN), length 1-253.

Example request:
```bash
curl -X POST \
  'https://api.example.com/api/v1/disposable_domains' \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"domain":"mailinator.com"}'
```

### Response
Status: `201 Created`

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "domain": "mailinator.com",
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-01T12:00:00Z"
}
```

Errors:
- `400` invalid payload or domain format.
- `409` domain already exists.
- `429` rate limited.
- `500` internal error.

## PUT /api/v1/disposable_domains/{id}
Purpose: update a disposable domain.

Auth: required. Admin-only.

Path parameter:
- `id` (UUID)

Body:
```json
{ "domain": "mailinator.com" }
```

Notes:
- `domain` must be a valid fully-qualified domain name (FQDN), length 1-253.

Example request:
```bash
curl -X PUT \
  'https://api.example.com/api/v1/disposable_domains/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"domain":"mailinator.com"}'
```

### Response
Status: `200 OK`

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "domain": "mailinator.com",
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-02T12:00:00Z"
}
```

Errors:
- `400` missing/invalid UUID, invalid payload, or domain format.
- `404` not found.
- `409` domain already exists.
- `429` rate limited.
- `500` internal error.

## DELETE /api/v1/disposable_domains/{id}
Purpose: delete a disposable domain by ID.

Auth: required. Admin-only.

Path parameter:
- `id` (UUID)

Example request:
```bash
curl -X DELETE \
  'https://api.example.com/api/v1/disposable_domains/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `204 No Content`

Errors:
- `400` missing/invalid UUID.
- `404` not found.
- `429` rate limited.
- `500` internal error.

## POST /api/v1/disposable_domains/bulk
Purpose: create multiple disposable domains in one request (max 100). Partial success returns `207`.

Auth: required. Admin-only.

Body:
```json
{
  "domains": [
    { "domain": "mailinator.com" },
    { "domain": "tempmail.com" }
  ]
}
```

Notes:
- `domains` length max 100.
- Each `domain` must be a valid FQDN, length 1-253.

Example request:
```bash
curl -X POST \
  'https://api.example.com/api/v1/disposable_domains/bulk' \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"domains":[{"domain":"mailinator.com"},{"domain":"tempmail.com"}]}'
```

### Response
Status: `201 Created` or `207 Multi-Status`

Example response:
```json
{
  "created_domains": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "domain": "mailinator.com",
      "created_at": "2025-01-01T12:00:00Z",
      "updated_at": "2025-01-01T12:00:00Z"
    }
  ],
  "errors": []
}
```

Errors:
- `400` invalid payload or exceeds limit; if none created, returns 400 with error details.
- `429` rate limited.
- `500` internal error.

## DELETE /api/v1/disposable_domains/bulk
Purpose: delete multiple disposable domains by IDs (max 100). Partial success returns `207`.

Auth: required. Admin-only.

Body:
```json
{ "ids": ["550e8400-e29b-41d4-a716-446655440000"] }
```

Notes:
- `ids` length max 100.
- Invalid UUIDs are reported in `errors`; valid UUIDs that are not found are skipped.

Example request:
```bash
curl -X DELETE \
  'https://api.example.com/api/v1/disposable_domains/bulk' \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"ids":["550e8400-e29b-41d4-a716-446655440000"]}'
```

### Response
Status: `200 OK` or `207 Multi-Status`

Example response:
```json
{
  "deleted_count": 1,
  "errors": []
}
```

Errors:
- `400` invalid payload or exceeds limit; if none deleted, returns 400 with error details.
- `429` rate limited.
- `500` internal error.
