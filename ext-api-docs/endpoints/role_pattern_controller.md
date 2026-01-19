# Role pattern endpoints (role_pattern_controller.go)

## Overview
- Source: `services/go/app/cmd/controllers/role_pattern_controller.go`
- Base path: `/api/v1`
- Auth: API key (Swagger: `ApiKeyAuth`).
- Access: admin-only (access control).

Role patterns are used to detect role-based emails (e.g., admin@, support@).

## POST /api/v1/role_patterns
Purpose: create a new role pattern.

Auth: required. Admin-only.

Body:
```json
{
  "pattern": "admin",
  "category": "generic",
  "domain": "",
  "description": "Generic admin mailbox",
  "active": true
}
```

Example request:
```bash
curl -X POST \
  'https://api.example.com/api/v1/role_patterns' \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"pattern":"admin","category":"generic","domain":"","description":"Generic admin mailbox","active":true}'
```

### Response
Status: `201 Created`

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "pattern": "admin",
  "category": "generic",
  "domain": "",
  "description": "Generic admin mailbox",
  "active": true,
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-01T12:00:00Z"
}
```

Errors:
- `400` validation errors.
- `429` rate limit exceeded.
- `500` internal error.

## GET /api/v1/role_patterns
Purpose: list role patterns with optional filtering.

Auth: required. Admin-only.

Query parameters:
- `limit` (int, default 10, max 100)
- `offset` (int, default 0)
- `category` (string, optional)
- `domain` (string, optional)
- `active_only` (bool, optional, default false)

Example request:
```bash
curl -X GET \
  'https://api.example.com/api/v1/role_patterns?category=generic&active_only=true' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `200 OK`

Example response:
```json
{
  "role_patterns": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "pattern": "admin",
      "category": "generic",
      "domain": "",
      "description": "Generic admin mailbox",
      "active": true,
      "created_at": "2025-01-01T12:00:00Z",
      "updated_at": "2025-01-01T12:00:00Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

## GET /api/v1/role_patterns/{id}
Purpose: get a single role pattern by ID.

Auth: required. Admin-only.

Path parameter:
- `id` (UUID)

### Response
Status: `200 OK`

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "pattern": "admin",
  "category": "generic",
  "domain": "",
  "description": "Generic admin mailbox",
  "active": true,
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-01T12:00:00Z"
}
```

Errors:
- `400` invalid UUID.
- `404` not found (if repository returns not-found).
- `429` rate limit exceeded.

## PUT /api/v1/role_patterns/{id}
Purpose: update a role pattern by ID.

Auth: required. Admin-only.

Body:
```json
{
  "pattern": "admin",
  "category": "generic",
  "domain": "",
  "description": "Updated description",
  "active": true
}
```

### Response
Status: `200 OK`

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "pattern": "admin",
  "category": "generic",
  "domain": "",
  "description": "Updated description",
  "active": true,
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-02T12:00:00Z"
}
```

Errors:
- `400` validation errors or invalid UUID.
- `404` not found (if repository returns not-found).
- `429` rate limit exceeded.

## DELETE /api/v1/role_patterns/{id}
Purpose: delete a role pattern by ID.

Auth: required. Admin-only.

### Response
Status: `204 No Content`

Errors:
- `400` invalid UUID.
- `404` not found (if repository returns not-found).
- `429` rate limit exceeded.

## POST /api/v1/role_patterns/bulk
Purpose: create multiple role patterns in one request.

Auth: required. Admin-only.

Body:
```json
{
  "patterns": [
    { "pattern": "admin", "category": "generic", "domain": "", "description": "", "active": true },
    { "pattern": "support", "category": "generic", "domain": "", "description": "", "active": true }
  ]
}
```

### Response
Status: `201 Created`

Example response:
```json
{
  "role_patterns": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "pattern": "admin",
      "category": "generic",
      "domain": "",
      "description": "",
      "active": true,
      "created_at": "2025-01-01T12:00:00Z",
      "updated_at": "2025-01-01T12:00:00Z"
    }
  ],
  "errors": []
}
```

Partial success:
- Status: `207 Multi-Status` when some patterns fail.

## PUT /api/v1/role_patterns/bulk
Purpose: update multiple role patterns in one request.

Auth: required. Admin-only.

Body:
```json
{
  "updates": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "pattern": "admin",
      "category": "generic",
      "domain": "",
      "description": "Updated",
      "active": true
    }
  ]
}
```

### Response
Status: `200 OK`

Example response:
```json
{
  "updated_patterns": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "pattern": "admin",
      "category": "generic",
      "domain": "",
      "description": "Updated",
      "active": true,
      "created_at": "2025-01-01T12:00:00Z",
      "updated_at": "2025-01-02T12:00:00Z"
    }
  ],
  "errors": []
}
```

Partial success:
- Status: `207 Multi-Status` when some updates fail.

## DELETE /api/v1/role_patterns/bulk
Purpose: delete multiple role patterns by ID.

Auth: required. Admin-only.

Body:
```json
{ "ids": ["550e8400-e29b-41d4-a716-446655440000"] }
```

### Response
Status: `200 OK`
```json
{ "deleted_count": 1, "errors": [] }
```

Partial success:
- Status: `207 Multi-Status` when some deletes fail.

## POST /api/v1/role_patterns/refresh_cache
Purpose: refresh the role-based detector cache.

Auth: required. Admin-only.

Example request:
```bash
curl -X POST \
  'https://api.example.com/api/v1/role_patterns/refresh_cache' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `200 OK`

Example response:
```json
{
  "success": true,
  "message": "Role pattern cache refreshed successfully",
  "refreshed_at": "2025-01-01T12:00:00Z",
  "pattern_count": 120
}
```

Errors:
- `429` rate limit exceeded.
- `500` internal error.

## GET /api/v1/role_patterns/status
Purpose: get role-based detector status.

Auth: required. Admin-only.

### Response
Status: `200 OK`

Example response:
```json
{
  "last_refresh_time": "2025-01-01T12:00:00Z",
  "refresh_interval": "10m",
  "is_active": true,
  "pattern_count": 120
}
```

Errors:
- `429` rate limit exceeded.
- `500` internal error.
