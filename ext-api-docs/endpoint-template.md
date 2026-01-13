# API Documentation — @services/go/app

## Base URL
- **Production:** `https://api.example.com`
- **Staging:** `https://staging-api.example.com`
- **Local:** `http://localhost:8080`

## Auth
- **Type:** Bearer token (JWT)
- **Header:** `Authorization: Bearer <token>`
- **Scopes/Roles:** (if applicable)

## Conventions
- **Content-Type:** `application/json`
- **Date/Time:** ISO 8601 (UTC)
- **Pagination:** `page`, `limit` (if used)
- **Error format:** See "Error Responses" section

---

# Endpoints

## [METHOD] /path/to/endpoint
**Summary:** One-line description of what this endpoint does.

**Auth Required:** Yes/No
**Rate Limit:** (if known)
**Idempotent:** Yes/No
**Tags:** (optional)

### Request
**Headers**
- `Authorization: Bearer <token>` (required if auth)
- `Content-Type: application/json`

**Path Params**
| Name | Type | Required | Description | Example |
|------|------|----------|-------------|---------|
| id   | string | Yes | Resource ID | `abc_123` |

**Query Params**
| Name | Type | Required | Default | Description | Example |
|------|------|----------|---------|-------------|---------|
| page | int  | No | 1 | Page number | `1` |

**Body**
```json
{
  "fieldA": "string",
  "fieldB": 123,
  "fieldC": {
    "nested": true
  }
}
```

**Body Fields**
| Field | Type | Required | Constraints | Description | Example |
|------|------|----------|-------------|-------------|---------|
| fieldA | string | Yes | min=1, max=255 | Name | "John" |
| fieldB | integer | No | min=0 | Count | 5 |
| fieldC.nested | boolean | No | - | Flag | true |

### Responses

**200 OK - Success**
```json
{
  "status": "ok",
  "data": {
    "id": "abc_123",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Response Fields**
| Field | Type | Description |
|------|------|-------------|
| status | string | Operation status |
| data.id | string | Resource ID |
| data.createdAt | string | ISO 8601 timestamp |

**400 Bad Request - Validation Error**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "fieldA is required",
    "details": [
      { "field": "fieldA", "reason": "required" }
    ]
  }
}
```

**401 Unauthorized**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid token"
  }
}
```

**404 Not Found**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

**500 Internal Server Error**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Unexpected server error"
  }
}
```

### Notes
- Edge cases, common pitfalls, business rules, etc.

### Examples
**cURL**
```bash
curl -X [METHOD] \
  'https://api.example.com/path/to/endpoint' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "fieldA": "string",
    "fieldB": 123
  }'
```

---

# Error Responses (Global)
**Format**
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message",
    "details": [ { "field": "x", "reason": "y" } ]
  }
}
```

**Common Codes**
| Code | Meaning |
|------|--------|
| VALIDATION_ERROR | Request body or params invalid |
| UNAUTHORIZED | Missing/invalid auth |
| FORBIDDEN | Not enough permissions |
| NOT_FOUND | Resource missing |
| CONFLICT | Duplicate or invalid state |
| INTERNAL_ERROR | Server error |

---

# Changelog
| Date | Author | Change |
|------|--------|--------|
| 2025-01-01 | You | Initial draft |
