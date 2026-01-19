# Email endpoints (email_controller.go)

## Overview
- Source: `services/go/app/cmd/controllers/email_controller.go`
- Base path: `/api/v1`
- Auth: Composite (API key or Supabase JWT)
- Access: `/emails/*` is admin-only (access control). `/verify` is user-scoped.

## POST /api/v1/verify
Purpose: verify a single email address in real time (syntax, domain, SMTP, inbox checks).

Auth: required (API key or Supabase JWT).

### Request
Headers:
- `Authorization: Bearer <api_key_or_jwt>` or `X-API-Key: <api_key>`
- `Content-Type: application/json`

Body:
- `email` (string, required): email address to verify.

Example request:
```bash
curl -X POST \
  'https://api.example.com/api/v1/verify' \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com"}'
```

### Response
Status: `200 OK` (or `408 Request Timeout` with partial results)

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
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

Response fields:
- `id`: UUID of the stored email record when available.
- `email`: the verified email address.
- `status`: overall verification result. Values: `exists`, `not_exists`, `catchall`, `invalid_syntax`, `unknown`.
- `is_role_based`: true if the local part is a role account (e.g., admin@).
- `is_disposable`: true if domain is known disposable.
- `has_mx_records`: true if the domain has MX records.
- `has_reverse_dns`: true if reverse DNS records exist for the mail host.
- `domain_name`: resolved domain name.
- `host_name`: mail host (MX) used for SMTP.
- `server_type`: mail server type reported by verifier.
- `is_catchall`: true if domain accepts any address.
- `validated_at`: RFC3339 timestamp of verification completion.
- `unknown_reason`: reason when `status` is `unknown`.
- `needs_physical_verify`: true when inbox check requires manual/physical verification.

Errors:
- `400` invalid body or email syntax.
- `401` unauthorized (missing/invalid auth).
- `403` forbidden (admin-only access).
- `408` verification timed out.
- `429` rate limited.
- `500` internal error.

## GET /api/v1/emails
Purpose: list all verified emails with their verification results.

Auth: required. Admin-only.

### Request
Query parameters:
- `limit` (int, default 10, max 100)
- `offset` (int, default 0)

Example request:
```bash
curl -X GET \
  'https://api.example.com/api/v1/emails?limit=10&offset=0' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `200 OK`

Example response:
```json
{
  "emails": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
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
  ],
  "count": 1000,
  "limit": 10,
  "offset": 0
}
```

Response fields:
- `emails`: array of `EmailVerificationResponse` objects (see response fields above).
- `count`: total records available.
- `limit`: page size used.
- `offset`: page offset used.

Errors:
- `401` unauthorized (missing/invalid auth).
- `403` forbidden (admin-only access).
- `429` rate limited.
- `500` internal error.

## GET /api/v1/emails/{identifier}
Purpose: get a single email verification result by ID or by address.

Auth: required. Admin-only.

Path parameter:
- `identifier`: UUID or full email address. If UUID parse succeeds, it is treated as ID; otherwise it is treated as an email address.

Example request (by ID):
```bash
curl -X GET \
  'https://api.example.com/api/v1/emails/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

Example request (by address):
```bash
curl -X GET \
  'https://api.example.com/api/v1/emails/user@example.com' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `200 OK`

Example response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
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

Errors:
- `400` invalid UUID or invalid email address.
- `401` unauthorized (missing/invalid auth).
- `403` forbidden (admin-only access).
- `404` email not found.
- `429` rate limited.
- `500` internal error.
