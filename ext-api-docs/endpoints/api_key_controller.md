# API key endpoints (api_key_controller.go)

## Overview
- Source: `services/go/app/cmd/controllers/api_key_controller.go`
- Base path: `/api/v1`
- Auth: Composite (API key or Supabase JWT)
- Access: user-scoped; admins can act on behalf of another user via `user_id` (required when the admin token does not map to a user UUID).

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
- `user_id` (UUID, admin only; required when the admin token does not map to a user UUID)
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

## GET /api/v1/api-keys/{id}/usage
Purpose: return usage data for a single API key.

Auth: required.

Path parameter:
- `id` (UUID)

Query parameters:
- `from` (RFC3339 timestamp, optional): include daily usage from this timestamp (used for time series). Defaults to key `created_at` when only `to` is provided.
- `to` (RFC3339 timestamp, optional): include daily usage up to this timestamp (used for time series). Defaults to now when only `from` is provided.

Notes:
- Series data is included when either `from` or `to` is provided.
- If `to` is missing, it defaults to now; if `from` is missing, it defaults to the API key `created_at`. The computed bounds are normalized via `normalizeToUTCDate`.
- Daily buckets come from `buildDailySeriesDates`, and the series is generated via `c.buildAPIKeyUsageSeries` using the computed start/end.

Example request:
```bash
curl -X GET \
  'https://api.example.com/api/v1/api-keys/550e8400-e29b-41d4-a716-446655440000/usage?from=2025-01-01T00:00:00Z&to=2025-01-07T00:00:00Z' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `200 OK`

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Production Key",
  "purpose": "zapier",
  "usage_count": 1234,
  "last_used_at": "2025-01-07T12:00:00Z",
  "created_at": "2025-01-01T12:00:00Z",
  "is_active": true,
  "series": [
    { "date": "2025-01-01", "usage_count": 120 },
    { "date": "2025-01-02", "usage_count": 98 }
  ]
}
```

Errors:
- `400` invalid UUID.
- `401` unauthorized.
- `403` forbidden (non-admin attempting to access another user key).
- `404` key not found.
- `500` internal error.

## DELETE /api/v1/api-keys/{id}
Purpose: revoke an API key. Admins can revoke any key; non-admins can only revoke their own keys.

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

## GET /api/v1/api-keys/usage
Purpose: return API key usage metrics for a user.

Auth: required.

Query parameters:
- `user_id` (UUID, admin only)
- `from` (RFC3339, optional)
- `to` (RFC3339, optional)

Notes:
- Series data is only included when both `from` and `to` are provided.

Example request:
```bash
curl -X GET \
  'https://api.example.com/api/v1/api-keys/usage?from=2025-01-01T00:00:00Z&to=2025-01-07T00:00:00Z' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `200 OK`

Example response:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_api_keys": 3,
  "api_keys_by_purpose": {
    "zapier": 1,
    "n8n": 1,
    "google_sheets": 0,
    "custom": 1
  },
  "total_requests": 1234,
  "requests_by_purpose": {
    "zapier": 900,
    "n8n": 200,
    "google_sheets": 0,
    "custom": 134
  },
  "last_used_at": "2025-01-07T12:00:00Z",
  "series": [
    {
      "date": "2025-01-01",
      "total_api_keys": 3,
      "api_keys_by_purpose": { "zapier": 1, "n8n": 1, "google_sheets": 0, "custom": 1 },
      "total_requests": 200,
      "requests_by_purpose": { "zapier": 140, "n8n": 30, "google_sheets": 0, "custom": 30 }
    }
  ]
}
```

Errors:
- `400` invalid `user_id` or date params, or missing `user_id` for admin requests without an authenticated user.
- `401` unauthorized.
- `500` internal error.
