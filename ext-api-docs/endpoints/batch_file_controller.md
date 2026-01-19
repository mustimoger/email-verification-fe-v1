# Batch file endpoints (batch_file_controller.go)

## Overview
- Source: `services/go/app/cmd/controllers/batch_file_controller.go`
- Base path: `/api/v1`
- Auth: Composite (API key or Supabase JWT)
- Access: user-scoped. Non-admin requests are restricted to their own user_id.

## POST /api/v1/tasks/batch/upload
Purpose: upload a file containing email addresses for batch verification. Processing happens asynchronously.

Auth: required.

### Request
Headers:
- `Authorization: Bearer <api_key_or_jwt>` or `X-API-Key: <api_key>`
- `Content-Type: multipart/form-data`

Form fields:
- `file` (required): the email list file.
- `webhook_url` (optional): webhook URL for notifications.
- `email_column` (optional): column header or 1-based index for CSV/XLSX.
- `column` (optional): alias for `email_column`.

Notes:
- Allowed formats and max file size are enforced by server config. Supported extensions: `.txt`, `.csv`, `.xlsx`.
- `email_column` is not supported for `.txt` files.
- `user_id` is not allowed in the form body.
- Maximum of 10,000 emails per file.

Example request:
```bash
curl -X POST \
  'https://api.example.com/api/v1/tasks/batch/upload' \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  -F 'file=@emails.csv' \
  -F 'webhook_url=https://example.com/webhook' \
  -F 'email_column=email'
```

### Response
Status: `202 Accepted`

Example response:
```json
{
  "upload_id": "7d3df4c6-9a7d-4d16-9f2b-2a5ddf4f4f53",
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "emails.csv",
  "email_count": 123,
  "status": "processing",
  "message": "File uploaded successfully and is being processed",
  "uploaded_at": "2025-01-01T12:00:00Z"
}
```

Response fields:
- `upload_id`: UUID for this upload.
- `task_id`: task created for processing.
- `filename`: original file name.
- `email_count`: emails queued for processing.
- `status`: current status (`processing`, `completed`, `failed`).
- `message`: human-readable status message.
- `uploaded_at`: timestamp of the upload.

Errors:
- `400` file missing, unsupported file format, invalid file, invalid webhook URL, invalid `email_column`, no valid emails, email limit exceeded, or validation failures.
- `401` unauthorized.
- `500` internal error.

## GET /api/v1/tasks/batch/uploads/{upload_id}
Purpose: fetch the current status of a batch upload and its task.

Auth: required. Non-admins can only access their own uploads.

Path parameter:
- `upload_id` (UUID)

Example request:
```bash
curl -X GET \
  'https://api.example.com/api/v1/tasks/batch/uploads/7d3df4c6-9a7d-4d16-9f2b-2a5ddf4f4f53' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

### Response
Status: `200 OK`

Example response:
```json
{
  "upload_id": "7d3df4c6-9a7d-4d16-9f2b-2a5ddf4f4f53",
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "emails.csv",
  "email_count": 123,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "created_at": "2025-01-01T12:00:00Z",
  "updated_at": "2025-01-01T12:05:00Z",
  "task": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "webhook_url": "https://example.com/webhook",
    "created_at": "2025-01-01T12:00:00Z",
    "updated_at": "2025-01-01T12:05:00Z"
  }
}
```

Response fields:
- `upload_id`, `task_id`, `filename`, `email_count`, `status`.
- `user_id`: owner of the upload (omitted for dev keys).
- `created_at`, `updated_at`: upload timestamps.
- `task`: task record created for this upload.

Errors:
- `400` invalid UUID.
- `401` unauthorized.
- `403` forbidden.
- `404` upload not found.
- `500` internal error.
