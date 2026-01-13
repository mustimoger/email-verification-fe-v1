# API Documentation - Common

## Routing
- [Auth](#auth)
- [General API behavior](#general-api-behavior)
- [Third-party dependencies](#third-party-dependencies)
- [Endpoint index](#endpoint-index)

---

## Auth
Most `/api/v1/*` endpoints use composite auth (API key or Supabase JWT). The only endpoint with custom auth is `/api/v1/external/verify`.

### Composite auth (default for `/api/v1/*`)
- **Order:** API key is checked first. If invalid and Supabase auth is enabled, JWT is checked next.
- **Excluded paths:** `/health`, `/swagger/*`, `/metrics`, `/api/v1/external/verify`

#### API key
- **Header:** `X-API-Key: <key>`
- **Header:** `Authorization: Bearer <api_key>`
- Keys identify the caller; rotate on compromise.
- **Dev keys:** Optional static keys from config (for local/dev). These map to user_id `dev`.

#### Supabase JWT
- **Header:** `Authorization: Bearer <jwt>`
- JWT validation uses Supabase issuer/audience settings and JWKS or HMAC secret (based on token `alg`).
- Admin access is determined from role/claims on the JWT.

### External HMAC (only `/api/v1/external/verify`)
- **Header:** `X-Authentication-Key: <nonce>.<timestamp>.<signature>`
- **Timestamp:** RFC3339; must be within the past 5 minutes. Future timestamps are rejected.
- **Nonce:** Must be unique. Stored in Redis for 5 minutes (if `RequireNonceStore` is true and Redis is unavailable, requests are rejected).
- **Signature:** `HMAC-SHA256(payload, secret_key)` where:
  - `body_hash = sha256(raw_body)` (hex)
  - `path = Path + "?" + QueryString` (if query is present)
  - `payload = nonce + timestamp + method + path + body_hash`

---

## General API behavior
- **Content-Type:** `application/json`
- **Time:** ISO 8601 (UTC)
- **Request ID:** If provided, echo `X-Request-ID`; otherwise generate one.
- **Idempotency:** Use `Idempotency-Key` for safe retries on POST.
- **Pagination:** `page`, `limit` (or `cursor`, `limit`) when applicable.
- **Rate limiting:** `429` with `Retry-After` when limits are exceeded.
- **Errors:** JSON error format with `code`, `message`, and optional `details`.

Example error payload:
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message",
    "details": [
      { "field": "fieldA", "reason": "required" }
    ]
  }
}
```

---

## Third-party dependencies
Some endpoints rely on downstream or external systems (SMTP, DNS, message queues, blocklists, or vendor APIs).

### Behavior
- **Timeouts:** Requests to third parties have fixed timeouts; slow responses return a partial or failed result.
- **Retries:** Transient errors are retried with backoff; final failures surface as `5xx` or `424`.
- **Partial results:** If some checks succeed and others fail, the response includes per-check status.
- **Async work:** When a dependency is slow, the API may return `202 Accepted` with a job ID.

### Typical error codes
- `DEPENDENCY_TIMEOUT` - Downstream did not respond in time.
- `DEPENDENCY_UNAVAILABLE` - Downstream returned error or is down.
- `DEPENDENCY_RATE_LIMIT` - Downstream rate limit hit.

---

## Endpoint index
Draft template:
- `endpoint-template.md`

Per-file endpoint docs:
- `endpoints/routes.md`
- `endpoints/email_controller.md`
- `endpoints/streaming_controller.md`
- `endpoints/task_controller.md`
- `endpoints/batch_file_controller.md`
- `endpoints/external_controller.md`
- `endpoints/domain_controller.md`
- `endpoints/disposable_domain_controller.md`
- `endpoints/role_pattern_controller.md`
- `endpoints/proxy_controller.md`
- `endpoints/api_key_controller.md`
- `endpoints/metrics_controller.md`
