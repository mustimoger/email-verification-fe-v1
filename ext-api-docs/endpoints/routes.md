# Routes (routes.go)

## GET /health
Purpose: service health check.

Auth: none.

Example request:
```bash
curl -X GET 'https://api.example.com/health'
```

### Response
Status: `200 OK`

Example response:
```json
{ "status": "ok" }
```

Notes:
- This endpoint is excluded from auth middleware.
