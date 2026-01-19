# Task endpoints (task_controller.go)

## Overview

- Source: `services/go/app/cmd/controllers/task_controller.go`
- Base path: `/api/v1`
- Auth: Composite (API key or Supabase JWT)
- Access: user-scoped. Non-admin requests are restricted to their own user_id.
- Admins can query across users using `user_id` where allowed.
- `user_id` is never accepted in request bodies.

## POST /api/v1/tasks

Purpose: create a bulk verification task (up to 10,000 emails). Emails are grouped by domain and queued for processing. Optional webhook to receive completion callbacks.

Auth: required.

### Request

Headers:

- `Authorization: Bearer <api_key_or_jwt>` or `X-API-Key: <api_key>`
- `Content-Type: application/json`

Body:

- `emails` (array of string, required, max 10,000)
- `webhook_url` (string, optional, must be a valid URL)

Example request:

```bash
curl -X POST \
  'https://api.example.com/api/v1/tasks' \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  -H 'Content-Type: application/json' \
  -d '{
    "emails": ["user1@example.com", "user2@example.com"],
    "webhook_url": "https://example.com/webhook"
  }'
```

### Response

Status: `201 Created`

Example response:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "webhook_url": "https://example.com/webhook",
  "source": "frontend",
  "created_at": "2025-01-01T12:00:00Z",
  "email_count": 2,
  "domain_count": 1
}
```

Response fields:

- `id`: task UUID.
- `user_id`: derived from auth (may be null for dev keys).
- `webhook_url`: webhook URL stored for the task.
- `source`: indicates task origin (`frontend` or `api_key`).
- `created_at`: task creation timestamp.
- `email_count`: total emails submitted.
- `domain_count`: number of unique domains queued.

Errors:

- `400` invalid payload (invalid emails, webhook URL, or >10,000 emails).
- `401` unauthorized.
- `429` rate limited.
- `500` internal error.

## GET /api/v1/tasks

Purpose: list tasks with optional filters, including file-backed status.

Auth: required.

### Request

Query parameters:

- `limit` (int, default 10, max 100)
- `offset` (int, default 0)
- `user_id` (UUID, admin only)
- `is_file_backed` (bool, optional, `true` or `false`)
- `created_after` (RFC3339 timestamp)
- `created_before` (RFC3339 timestamp)

Example request:

```bash
curl -X GET \
  'https://api.example.com/api/v1/tasks?limit=10&offset=0&is_file_backed=true' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response

Status: `200 OK`

Example response:

```json
{
  "tasks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "webhook_url": "https://example.com/webhook",
      "is_file_backed": true,
      "file": {
        "upload_id": "550e8400-e29b-41d4-a716-446655440111",
        "task_id": "550e8400-e29b-41d4-a716-446655440000",
        "filename": "emails.csv",
        "email_count": 123,
        "status": "completed",
        "created_at": "2025-01-01T12:00:00Z",
        "updated_at": "2025-01-01T12:05:00Z"
      },
      "source": "frontend",
      "created_at": "2025-01-01T12:00:00Z",
      "updated_at": "2025-01-01T12:05:00Z",
      "metrics": {
        "total_email_addresses": 2,
        "job_status": {
          "pending": 0,
          "processing": 0,
          "completed": 2,
          "failed": 0
        },
        "progress": 1,
        "progress_percent": 100,
        "verification_status": {
          "exists": 2,
          "not_exists": 0,
          "catchall": 0,
          "invalid_syntax": 0,
          "unknown": 0,
          "role_based": 0,
          "disposable_domain_emails": 0
        },
        "last_verification_requested_at": "2025-01-01T12:00:01Z",
        "last_verification_completed_at": "2025-01-01T12:04:59Z"
      }
    }
  ],
  "count": 1,
  "limit": 10,
  "offset": 0
}
```

Response fields:

- `tasks`: array of task summaries (see fields below).
- `source`: optional overall task source when all tasks share the same origin (`frontend` or `api_key`).
- `count`, `limit`, `offset`: pagination metadata.

Task summary fields:

- `id`, `user_id`, `webhook_url`, `source`, `created_at`, `updated_at`.
- `is_file_backed`: indicates whether the task originated from a file upload.
- `file`: batch upload metadata (present only when `is_file_backed` is true, otherwise omitted or null).
- `file.upload_id`: UUID of the batch upload.
- `file.task_id`: UUID of the associated task.
- `file.filename`: original filename of the uploaded file.
- `file.email_count`: number of emails in the uploaded file.
- `file.status`: upload processing status (`processing`, `completed`, `failed`).
- `file.created_at`, `file.updated_at`: upload timestamps.
- `metrics`: aggregated task metrics (see TaskMetrics fields).

Errors:

- `400` invalid query parameters.
- `401` unauthorized.
- `429` rate limited.
- `500` internal error.

## GET /api/v1/tasks/{id}

Purpose: retrieve a single task with aggregated metrics.

Auth: required. Non-admins can only access their own tasks.

Path parameter:

- `id` (UUID, required)

Example request:

```bash
curl -X GET \
  'https://api.example.com/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response

Status: `200 OK`

Example response:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "webhook_url": "https://example.com/webhook",
  "is_file_backed": true,
  "file": {
    "upload_id": "550e8400-e29b-41d4-a716-446655440111",
    "task_id": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "emails.csv",
    "email_count": 123,
    "status": "completed",
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:05:00Z"
  },
  "source": "frontend",
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-01T12:05:00Z",
  "started_at": null,
  "finished_at": null,
  "metrics": {
    "total_email_addresses": 2,
    "job_status": {
      "pending": 0,
      "processing": 0,
      "completed": 2,
      "failed": 0
    },
    "progress": 1,
    "progress_percent": 100,
    "verification_status": {
      "exists": 2,
      "not_exists": 0,
      "catchall": 0,
      "invalid_syntax": 0,
      "unknown": 0,
      "role_based": 0,
      "disposable_domain_emails": 0
    },
    "last_verification_requested_at": "2025-01-01T12:00:01Z",
    "last_verification_completed_at": "2025-01-01T12:04:59Z"
  }
}
```

Errors:

- `400` invalid ID.
- `401` unauthorized.
- `403` forbidden (non-admin accessing another user).
- `404` task not found.
- `429` rate limited.
- `500` internal error.

## GET /api/v1/tasks/{id}/series

Purpose: daily metrics series for a task between `from` and `to` dates (max 90 days).

Auth: required. Non-admins can only access their own tasks.

Query parameters:

- `from` (RFC3339, optional)
- `to` (RFC3339, optional)

Rules:

- If both `from` and `to` are omitted, last 7 days are returned.
- If either is provided, both must be provided.
- Max range is 90 days.

Example request:

```bash
curl -X GET \
  'https://api.example.com/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000/series?from=2025-01-01T00:00:00Z&to=2025-01-07T00:00:00Z' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response

Status: `200 OK`

Example response:

```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "frontend",
  "series": [
    {
      "date": "2025-01-01",
      "total_email_addresses": 2,
      "job_status": {
        "pending": 0,
        "processing": 0,
        "completed": 2,
        "failed": 0
      },
      "progress": 1,
      "progress_percent": 100,
      "verification_status": {
        "exists": 2,
        "not_exists": 0,
        "catchall": 0,
        "invalid_syntax": 0,
        "unknown": 0,
        "role_based": 0,
        "disposable_domain_emails": 0
      },
      "last_verification_requested_at": "2025-01-01T12:00:01Z",
      "last_verification_completed_at": "2025-01-01T12:04:59Z"
    }
  ]
}
```

Response fields:

- `task_id`: task UUID.
- `source`: task origin (`frontend` or `api_key`).
- `series`: list of daily metrics points.

Errors:

- `400` invalid ID or date parameters.
- `401` unauthorized.
- `403` forbidden.
- `404` task not found.
- `500` internal error.

## GET /api/v1/tasks/{id}/jobs

Purpose: get a paginated list of email jobs for a specific task, including nested verification results (when available).

Auth: required. Non-admins can only access their own tasks.

Path parameter:

- `id` (UUID, required)

Query parameters:

- `limit` (int, default 10, max 100)
- `offset` (int, default 0)

Notes:

- Each job includes `email` data when the job is associated with an `emails` record (i.e. when `email_id` is set). Otherwise `email` is omitted.
- Results are ordered by `created_at DESC`.

Example request:

```bash
curl -X GET \
  'https://api.example.com/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000/jobs?limit=10&offset=0' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response

Status: `200 OK`

Example response:

```json
{
  "jobs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "task_id": "550e8400-e29b-41d4-a716-446655440000",
      "email_address": "user1@example.com",
      "status": "completed",
      "email": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user1@example.com",
        "status": "exists",
        "is_role_based": false,
        "is_disposable": false,
        "has_mx_records": true,
        "has_reverse_dns": true,
        "domain_name": "example.com",
        "host_name": "mx.example.com",
        "server_type": "Unknown",
        "is_catchall": false,
        "validated_at": "2025-01-01T12:04:59Z",
        "unknown_reason": null,
        "needs_physical_verify": false
      },
      "created_at": "2025-01-01T12:00:01Z",
      "updated_at": "2025-01-01T12:05:00Z"
    }
  ],
  "count": 1,
  "limit": 10,
  "offset": 0
}
```

Email fields:

- `id`, `email`, `status`, `is_role_based`.
- `is_disposable`, `has_mx_records`, `has_reverse_dns`.
- `domain_name`, `host_name`, `server_type`, `is_catchall`.
- `validated_at`, `unknown_reason`, `needs_physical_verify`.

Errors:

- `400` invalid ID or pagination parameters.
- `401` unauthorized.
- `404` task not found.
- `500` internal error.

## GET /api/v1/tasks/{id}/download

Purpose: download task results as a file.

Auth: required. Non-admins can only access their own tasks.

Query parameters:

- `task_id` (UUID, optional): overrides the task ID from the path.
- `format` (string, optional): `csv`, `txt`, or `xlsx` (default `csv`).

Example request:

```bash
curl -L \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  'https://api.example.com/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000/download?format=csv' \
  -o task-results.csv
```

### Response

Status: `200 OK`

- Response body is a file download.

Errors:

- `400` invalid ID or format.
- `401` unauthorized.
- `403` forbidden.
- `404` task not found.
- `500` internal error.

## TaskMetrics fields

- `total_email_addresses`: total emails in the task.
- `job_status`: counts per job status (`pending`, `processing`, `completed`, `failed`).
- `progress`: float ratio of completed/failed over total.
- `progress_percent`: integer percent (0-100).
- `verification_status`: counts by result (`exists`, `not_exists`, `catchall`, `invalid_syntax`, `unknown`) plus `role_based` and `disposable_domain_emails`.
- `last_verification_requested_at`: last time a verification was requested.
- `last_verification_completed_at`: last time a verification completed.
