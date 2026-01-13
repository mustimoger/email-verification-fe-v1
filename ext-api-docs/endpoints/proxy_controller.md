# Proxy endpoints (proxy_controller.go)

## Overview
- Source: `services/go/app/cmd/controllers/proxy_controller.go`
- Base path: `/api/v1`
- Auth: Composite (API key or Supabase JWT)
- Access: admin-only (access control).

Supported values:
- `connection_type`: `ipv4`, `ipv6`, `both`
- `service_types`: `syntax-validator`, `domain-validator`, `smtp-validator`, `inbox-validator`
- `status`: `active`, `inactive`, `unavailable`
- `protocol`: create/update currently enforce `socks5` only; bulk import accepts `http`, `https`, or `socks5`.

## POST /api/v1/proxies
Purpose: create a proxy.

Auth: required. Admin-only.

Body:
```json
{
  "protocol": "socks5",
  "name": "Proxy A",
  "host": "127.0.0.1",
  "port": 1080,
  "username": "user",
  "password": "pass",
  "connection_type": "ipv4",
  "service_types": ["domain-validator"],
  "skip_connectivity_test": false,
  "rate_limit_per_min": 60,
  "daily_rate_limit": 1000
}
```

Example request:
```bash
curl -X POST \
  'https://api.example.com/api/v1/proxies' \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"protocol":"socks5","name":"Proxy A","host":"127.0.0.1","port":1080,"username":"user","password":"pass","connection_type":"ipv4","service_types":["domain-validator"]}'
```

### Response
Status: `201 Created`

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "active",
  "protocol": "socks5",
  "name": "Proxy A",
  "host": "127.0.0.1",
  "port": 1080,
  "username": "user",
  "password": "pass",
  "ssh_private_key": "",
  "ssh_passphrase": "",
  "skip_connectivity_test": false,
  "last_checked_at": null,
  "connection_type": "ipv4",
  "service_types": ["domain-validator"],
  "last_success_at": null,
  "last_failure_at": null,
  "success_count": 0,
  "failure_count": 0,
  "consecutive_errors": 0,
  "avg_response_time": 0,
  "weight": 1,
  "rate_limit_per_min": 60,
  "daily_rate_limit": 1000,
  "daily_usage_count": 0,
  "daily_reset_at": null,
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-01T12:00:00Z"
}
```

Errors:
- `400` validation errors.
- `500` internal error.

## GET /api/v1/proxies
Purpose: list proxies.

Auth: required. Admin-only.

Query parameters:
- `limit` (int, default 10, max 100)
- `offset` (int, default 0)
- `status` (optional)
- `protocol` (optional)

### Response
Status: `200 OK`

Example response:
```json
{
  "proxies": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "active",
      "protocol": "socks5",
      "name": "Proxy A",
      "host": "127.0.0.1",
      "port": 1080,
      "username": "user",
      "password": "pass",
      "skip_connectivity_test": false,
      "connection_type": "ipv4",
      "service_types": ["domain-validator"],
      "success_count": 0,
      "failure_count": 0,
      "consecutive_errors": 0,
      "avg_response_time": 0,
      "weight": 1,
      "rate_limit_per_min": 60,
      "daily_rate_limit": 1000,
      "daily_usage_count": 0,
      "created_at": "2025-01-01T12:00:00Z",
      "updated_at": "2025-01-01T12:00:00Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

## GET /api/v1/proxies/{id}
Purpose: fetch a proxy by ID.

Auth: required. Admin-only.

### Response
Status: `200 OK`

Example response: same as single proxy above.

Errors:
- `400` invalid UUID.
- `404` not found.

## PUT /api/v1/proxies/{id}
Purpose: update a proxy.

Auth: required. Admin-only.

Body (any subset):
```json
{ "status": "inactive", "name": "Proxy A (paused)" }
```

### Response
Status: `200 OK`

Example response: updated proxy object.

## DELETE /api/v1/proxies/{id}
Purpose: delete a proxy by ID.

Auth: required. Admin-only.

### Response
Status: `204 No Content`

## POST /api/v1/proxies/bulk
Purpose: create multiple proxies in one request.

Auth: required. Admin-only.

Body:
```json
{
  "proxies": [
    {
      "protocol": "socks5",
      "name": "Proxy A",
      "host": "127.0.0.1",
      "port": 1080,
      "username": "user",
      "password": "pass",
      "connection_type": "ipv4"
    }
  ]
}
```

### Response
Status: `201 Created` or `206 Partial Content`

Example response:
```json
{
  "proxies": [ { "id": "550e8400-e29b-41d4-a716-446655440000", "name": "Proxy A" } ],
  "total": 1,
  "success": 1,
  "failed": 0
}
```

## DELETE /api/v1/proxies/bulk
Purpose: delete multiple proxies by ID.

Auth: required. Admin-only.

Body:
```json
{ "ids": ["550e8400-e29b-41d4-a716-446655440000"] }
```

### Response
Status: `204 No Content`

## POST /api/v1/proxies/bulk/import
Purpose: import proxies from a text file.

Auth: required. Admin-only.

### Request
Multipart fields:
- `file` (required): text file with one proxy per line in `USERNAME:PASSWORD@HOST:PORT` format.
- `connection_type` (optional): `ipv4`, `ipv6`, `both` (default `ipv4`).
- `protocol` (optional): `http`, `https`, `socks5` (default `socks5`).
- `skip_connectivity_test` (optional): `true`/`false` (default `false`).
- `service_types` (optional): comma-separated service types.

Example request:
```bash
curl -X POST \
  'https://api.example.com/api/v1/proxies/bulk/import' \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  -F 'file=@proxies.txt' \
  -F 'protocol=socks5' \
  -F 'connection_type=ipv4'
```

### Response
Status: `201 Created` or `206 Partial Content`

Example response:
```json
{
  "summary": {
    "total_lines_processed": 2,
    "proxies_parsed": 2,
    "proxies_created": 2,
    "parse_errors_count": 0,
    "creation_errors_count": 0
  },
  "configuration": {
    "connection_type": "ipv4",
    "protocol": "socks5",
    "skip_connectivity_test": false,
    "service_types": ["domain-validator"]
  },
  "created_proxies": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "active",
      "protocol": "socks5",
      "name": "Imported Proxy",
      "host": "127.0.0.1",
      "port": 1080,
      "username": "user",
      "password": "pass",
      "skip_connectivity_test": false,
      "connection_type": "ipv4",
      "service_types": ["domain-validator"],
      "success_count": 0,
      "failure_count": 0,
      "consecutive_errors": 0,
      "avg_response_time": 0,
      "weight": 1,
      "rate_limit_per_min": 0,
      "daily_rate_limit": 0,
      "daily_usage_count": 0,
      "created_at": "2025-01-01T12:00:00Z",
      "updated_at": "2025-01-01T12:00:00Z"
    }
  ]
}
```
