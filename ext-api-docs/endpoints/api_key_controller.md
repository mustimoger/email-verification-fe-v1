# API key endpoints (api_key_controller.go)

## Overview
- Source: `services/go/app/cmd/controllers/api_key_controller.go`
- Base path: `/api/v1`
- Auth: Composite (API key or Supabase JWT)
- Access: user-scoped; admins can act on behalf of another user via `user_id`.

## POST /api/v1/api-keys
Purpose: create a new API key. The plaintext key is returned only once.

Auth: required.

Query parameters (admin only):
- `user_id` (UUID): target user ID when admin token does not map to a user UUID.

Body:
```json
{ "name": "My Production Key", "purpose": "zapier" }
```

Allowed `purpose` values: `zapier`, `n8n`, `google sheets`, `custom`.

Example request:
```bash
curl -X POST \
  'https://api.example.com/api/v1/api-keys' \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"name":"My Production Key","purpose":"zapier"}'
```

### Response
Status: `201 Created`

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "key": "sk_live_abcdef...",
  "name": "My Production Key",
  "purpose": "zapier",
  "created_at": "2025-01-01T12:00:00Z"
}
```

Response fields:
- `key`: plaintext key (store securely; it will not be returned again).

Errors:
- `400` invalid request or missing `user_id` for admin tokens without user mapping.
- `401` unauthorized.
- `500` internal error.

## GET /api/v1/api-keys
Purpose: list active API keys for the authenticated user.

Auth: required.

Query parameters:
- `user_id` (UUID, admin only)
- `from` (RFC3339 timestamp, optional): filter by `last_used_at` >= from
- `to` (RFC3339 timestamp, optional): filter by `last_used_at` <= to

Example request:
```bash
curl -X GET \
  'https://api.example.com/api/v1/api-keys' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `200 OK`

Example response:
```json
{
  "keys": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My Production Key",
      "purpose": "zapier",
      "last_used_at": "2025-01-01T12:00:00Z",
      "total_requests": 1234,
      "created_at": "2025-01-01T12:00:00Z",
      "is_active": true
    }
  ],
  "count": 1
}
```

Errors:
- `400` invalid query parameters.
- `401` unauthorized.
- `500` internal error.

## DELETE /api/v1/api-keys/{id}
Purpose: revoke an API key.

Auth: required.

Path parameter:
- `id` (UUID)

Example request:
```bash
curl -X DELETE \
  'https://api.example.com/api/v1/api-keys/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `200 OK`

Example response:
```json
{ "message": "API key revoked successfully" }
```

Errors:
- `400` invalid UUID.
- `401` unauthorized.
- `403` forbidden (non-admin attempting to revoke another user key).
- `404` key not found.
- `500` internal error.
