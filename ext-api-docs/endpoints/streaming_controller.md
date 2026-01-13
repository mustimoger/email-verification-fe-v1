# Streaming endpoints (streaming_controller.go)

## Overview
- Source: `services/go/app/cmd/controllers/streaming_controller.go`
- Base path: `/api/v1`
- Auth: Composite (API key or Supabase JWT)
- Availability: endpoints are registered only when `Server.StreamingEnabled` is true.

## GET /api/v1/verify/stream (WebSocket)
Purpose: stream real-time verification progress over WebSocket.

Auth: required (API key or Supabase JWT).

### Request
Upgrade to WebSocket, then send a single JSON message within 5 seconds:
```json
{ "email": "user@example.com" }
```

Example (wscat):
```bash
wscat -c 'wss://api.example.com/api/v1/verify/stream' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
# Then send:
# {"email":"user@example.com"}
```

### Response (streamed events)
Each WebSocket message is a JSON-encoded progress event:
```json
{
  "type": "step_started",
  "email": "user@example.com",
  "step": "smtp",
  "status": "started",
  "metadata": {
    "host": "mx1.example.com"
  },
  "timestamp": "2025-01-01T12:00:00Z",
  "duration_ms": 120
}
```

Event fields:
- `type`: one of `verification_started`, `step_started`, `step_completed`, `step_failed`, `verification_completed`, `verification_failed`.
- `email`: email being verified.
- `step`: one of `syntax`, `domain`, `smtp`, `inbox` (omitted for verification-level events).
- `status`: one of `pending`, `started`, `completed`, `failed` (omitted for verification-level events).
- `metadata`: step-specific info (may include host, DNS data, errors).
- `timestamp`: event time (RFC3339).
- `duration_ms`: elapsed milliseconds since verification started.

Errors:
- If the initial message is invalid or email fails validation, the server sends a `verification_failed` event and closes the connection.
- Timeouts produce a `verification_failed` event with `metadata.timeout=true`.

## GET /api/v1/verify/stream/sse
Purpose: stream real-time verification progress using Server-Sent Events (SSE).

Auth: required (API key or Supabase JWT).

### Request
Query parameters:
- `email` (string, required)

Example request:
```bash
curl -N \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  'https://api.example.com/api/v1/verify/stream/sse?email=user@example.com'
```

### Response (SSE stream)
Events are sent in SSE format:
```sse
id: 1735732800000000000
event: step_completed
data: {"type":"step_completed","email":"user@example.com","step":"domain","status":"completed","metadata":{"has_mx":true},"timestamp":"2025-01-01T12:00:00Z","duration_ms":480}

```

Notes:
- The server emits an initial `retry:` directive using `Server.SSERetryInterval` (defaults to 2000 ms).
- Connection stays open until verification completes or fails.

Errors:
- `400` when `email` query parameter is missing.
- `400` when email fails validation.
