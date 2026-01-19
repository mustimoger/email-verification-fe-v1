# Domain endpoints (domain_controller.go)

## Overview
- Source: `services/go/app/cmd/controllers/domain_controller.go`
- Base path: `/api/v1`
- Auth: ApiKeyAuth (API key or Supabase JWT)
- Access: admin-only (access control).

## GET /api/v1/domains
Purpose: list verified domains with validation results.

Auth: required. Admin-only.

### Request
Query parameters:
- `limit` (int, default 10, max 100)
- `offset` (int, default 0)
- `preloads` (string, optional): comma-separated associations to preload. Allowed values: `DNSRecords`, `Emails`, `Hosts`.

Example request:
```bash
curl -X GET \
  'https://api.example.com/api/v1/domains?limit=10&offset=0&preloads=DNSRecords' \
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
      "domain": "example.com",
      "is_registered": true,
      "has_mx": true,
      "has_reverse_dns": true,
      "has_dns_poisoning": false,
      "is_disposable": false,
      "last_checked_at": "2025-01-01T12:00:00Z",
      "created_at": "2025-01-01T12:00:00Z",
      "updated_at": "2025-01-01T12:00:00Z",
      "dns_records": [],
      "emails": [],
      "hosts": []
    }
  ],
  "count": 500,
  "limit": 10,
  "offset": 0
}
```

Domain fields:
- `id`, `domain`.
- `is_registered`: domain registration status.
- `has_mx`: true if MX records exist.
- `has_reverse_dns`: true if reverse DNS exists.
- `has_dns_poisoning`: true if poisoning suspected.
- `is_disposable`: true if domain is disposable.
- `last_checked_at`: last validation timestamp.
- `dns_records`, `emails`, `hosts`: populated only when requested via `preloads`.

Errors:
- `429` rate limited.
- `500` internal error.

## GET /api/v1/domains/{identifier}
Purpose: fetch a specific domain by UUID or by domain name.

Auth: required. Admin-only.

Path parameter:
- `identifier`: UUID or domain name. If UUID parse succeeds it is treated as ID; otherwise treated as a domain name.

Query parameters:
- `preloads` (optional): same as list.

Example request (by ID):
```bash
curl -X GET \
  'https://api.example.com/api/v1/domains/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

Example request (by name):
```bash
curl -X GET \
  'https://api.example.com/api/v1/domains/example.com' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `200 OK`

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "domain": "example.com",
  "is_registered": true,
  "has_mx": true,
  "has_reverse_dns": true,
  "has_dns_poisoning": false,
  "is_disposable": false,
  "last_checked_at": "2025-01-01T12:00:00Z",
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-01T12:00:00Z",
  "dns_records": [],
  "emails": [],
  "hosts": []
}
```

Errors:
- `400` identifier is required (defensive; empty path).
- `404` domain not found.
- `429` rate limited.
- `500` internal error.
