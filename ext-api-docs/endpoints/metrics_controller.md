# Metrics endpoints (metrics_controller.go)

## Overview
- Source: `services/go/app/cmd/controllers/metrics_controller.go`
- Base path: `/api/v1`
- Auth: API key (ApiKeyAuth)
- Access: user-scoped; admins can query other users via `user_id`.

## GET /api/v1/metrics/verifications
Purpose: return verification metrics for a user.

Auth: required.

Query parameters:
- `user_id` (UUID, admin only)
- `from` (RFC3339, optional): filter metrics from this date
- `to` (RFC3339, optional): filter metrics up to this date

Notes:
- Series data is only included when both `from` and `to` are provided.

Example request:
```bash
curl -X GET \
  'https://api.example.com/api/v1/metrics/verifications?from=2025-01-01T00:00:00Z&to=2025-01-07T00:00:00Z' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `200 OK`

Example response:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_verifications": 1234,
  "total_tasks": 12,
  "unique_email_addresses": 1200,
  "job_status": {
    "pending": 0,
    "processing": 0,
    "completed": 1200,
    "failed": 34
  },
  "verification_status": {
    "exists": 900,
    "not_exists": 200,
    "catchall": 50,
    "invalid_syntax": 20,
    "unknown": 64
  },
  "total_catchall": 50,
  "total_role_based": 42,
  "total_disposable_domain_emails": 5,
  "last_verification_requested_at": "2025-01-07T12:00:00Z",
  "last_verification_completed_at": "2025-01-07T12:05:00Z",
  "series": [
    {
      "date": "2025-01-01",
      "total_verifications": 200,
      "total_tasks": 2,
      "unique_email_addresses": 195,
      "job_status": { "pending": 0, "processing": 0, "completed": 200, "failed": 0 },
      "verification_status": { "exists": 150, "not_exists": 30, "catchall": 10, "invalid_syntax": 5, "unknown": 5 },
      "total_catchall": 10,
      "total_role_based": 5,
      "total_disposable_domain_emails": 1
    }
  ]
}
```

Errors:
- `400` invalid `user_id` or date params, or missing `user_id` for admin requests without an authenticated user.
- `401` unauthorized.
- `500` internal error.

