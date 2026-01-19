# Credit management endpoints (credit_transaction_controller.go)

## Base URL
- **Production:** `https://api.example.com`
- **Staging:** `https://staging-api.example.com`
- **Local:** `http://localhost:8080`

## Auth
- **Type:** Bearer token (API key or Supabase JWT)
- **Header:** `Authorization: Bearer <token>`

## Conventions
- **Content-Type:** `application/json`
- **Date/Time:** ISO 8601 (UTC)
- **Pagination:** `limit`, `offset`
- **Error format:** See "Error Responses (Global)" in `docs/api/endpoint-template.md`

---

# Endpoints

## GET /api/v1/credits/balance
**Summary:** Return the current credit balance for the authenticated user.

**Auth Required:** Yes
**Idempotent:** Yes
**Tags:** credits

### Request
**Headers**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Query Params**
| Name | Type | Required | Default | Description | Example |
|------|------|----------|---------|-------------|---------|
| user_id | string (uuid) | No | - | Target user ID (admins only) | `550e8400-e29b-41d4-a716-446655440000` |

### Responses

**200 OK - Credit balance**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "balance": 500
}
```

**Response Fields**
| Field | Type | Description |
|------|------|-------------|
| user_id | string | User UUID |
| balance | integer | Current credit balance |

**400 Bad Request - Invalid query parameters**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "user_id must be a valid UUID"
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
    "message": "User not found"
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
- Admin tokens that do not map to a user UUID must supply `user_id`.

### Examples
**cURL**
```bash
curl -X GET \
  'https://api.example.com/api/v1/credits/balance' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

---

## GET /api/v1/credits/transactions
**Summary:** List credit transactions for the authenticated user.

**Auth Required:** Yes
**Idempotent:** Yes
**Tags:** credits

### Request
**Headers**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Query Params**
| Name | Type | Required | Default | Description | Example |
|------|------|----------|---------|-------------|---------|
| user_id | string (uuid) | No | - | Target user ID (admins only) | `550e8400-e29b-41d4-a716-446655440000` |
| limit | integer | No | 50 | Number of transactions to return (1-100) | `50` |
| offset | integer | No | 0 | Number of transactions to skip | `0` |

### Responses

**200 OK - List of credit transactions**
```json
{
  "transactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "grant",
      "amount": 100,
      "balance_after": 500,
      "reason": "Manual adjustment",
      "metadata": { "source": "admin" },
      "created_at": "2023-01-01T12:00:00Z"
    }
  ],
  "total": 120,
  "limit": 50,
  "offset": 0
}
```

**Response Fields**
| Field | Type | Description |
|------|------|-------------|
| transactions | array | Credit transactions |
| transactions[].id | string | Transaction UUID |
| transactions[].user_id | string | User UUID |
| transactions[].type | string | `grant` or `deduction` |
| transactions[].amount | integer | Credit delta |
| transactions[].balance_after | integer | Balance after the transaction |
| transactions[].reason | string | Optional reason |
| transactions[].metadata | object | Optional metadata |
| transactions[].created_at | string | ISO 8601 timestamp |
| total | integer | Total number of transactions |
| limit | integer | Page size |
| offset | integer | Offset into the result set |

**400 Bad Request - Invalid query parameters**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "limit must be less than or equal to 100"
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
    "message": "User not found"
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
- Admin tokens that do not map to a user UUID must supply `user_id`.

### Examples
**cURL**
```bash
curl -X GET \
  'https://api.example.com/api/v1/credits/transactions?limit=50&offset=0' \
  -H 'Authorization: Bearer <api_key_or_jwt>'
```

---

## POST /api/v1/credits/grant
**Summary:** Grant credits to a user (admin only).

**Auth Required:** Yes
**Idempotent:** No
**Tags:** credits

### Request
**Headers**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Query Params**
| Name | Type | Required | Default | Description | Example |
|------|------|----------|---------|-------------|---------|
| user_id | string (uuid) | No | - | Target user ID (admins only) | `550e8400-e29b-41d4-a716-446655440000` |

**Body**
```json
{
  "amount": 100,
  "reason": "Manual adjustment",
  "metadata": {
    "source": "admin"
  }
}
```

**Body Fields**
| Field | Type | Required | Constraints | Description | Example |
|------|------|----------|-------------|-------------|---------|
| amount | integer | Yes | min=1 | Credits to add | 100 |
| reason | string | No | max=512 | Optional reason | "Manual adjustment" |
| metadata | object | No | - | Optional metadata | `{ "source": "admin" }` |

### Responses

**201 Created - Credit granted**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "grant",
  "amount": 100,
  "balance_after": 500,
  "reason": "Manual adjustment",
  "metadata": { "source": "admin" },
  "created_at": "2023-01-01T12:00:00Z"
}
```

**Response Fields**
| Field | Type | Description |
|------|------|-------------|
| id | string | Transaction UUID |
| user_id | string | User UUID |
| type | string | `grant` |
| amount | integer | Credit delta |
| balance_after | integer | Balance after the transaction |
| reason | string | Optional reason |
| metadata | object | Optional metadata |
| created_at | string | ISO 8601 timestamp |

**400 Bad Request - Invalid request**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amount is required"
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

**403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required for credit modifications"
  }
}
```

**404 Not Found**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
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
- Admin tokens that do not map to a user UUID must supply `user_id`.

### Examples
**cURL**
```bash
curl -X POST \
  'https://api.example.com/api/v1/credits/grant' \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 100,
    "reason": "Manual adjustment",
    "metadata": { "source": "admin" }
  }'
```

---

## POST /api/v1/credits/deduct
**Summary:** Deduct credits from a user (admin only).

**Auth Required:** Yes
**Idempotent:** No
**Tags:** credits

### Request
**Headers**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Query Params**
| Name | Type | Required | Default | Description | Example |
|------|------|----------|---------|-------------|---------|
| user_id | string (uuid) | No | - | Target user ID (admins only) | `550e8400-e29b-41d4-a716-446655440000` |

**Body**
```json
{
  "amount": 25,
  "reason": "Refund reversal",
  "metadata": {
    "source": "admin"
  }
}
```

**Body Fields**
| Field | Type | Required | Constraints | Description | Example |
|------|------|----------|-------------|-------------|---------|
| amount | integer | Yes | min=1 | Credits to deduct | 25 |
| reason | string | No | max=512 | Optional reason | "Refund reversal" |
| metadata | object | No | - | Optional metadata | `{ "source": "admin" }` |

### Responses

**201 Created - Credits deducted**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "deduction",
  "amount": 25,
  "balance_after": 475,
  "reason": "Refund reversal",
  "metadata": { "source": "admin" },
  "created_at": "2023-01-01T12:00:00Z"
}
```

**Response Fields**
| Field | Type | Description |
|------|------|-------------|
| id | string | Transaction UUID |
| user_id | string | User UUID |
| type | string | `deduction` |
| amount | integer | Credit delta |
| balance_after | integer | Balance after the transaction |
| reason | string | Optional reason |
| metadata | object | Optional metadata |
| created_at | string | ISO 8601 timestamp |

**400 Bad Request - Invalid request or insufficient balance**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Insufficient credit balance"
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

**403 Forbidden**
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required for credit modifications"
  }
}
```

**404 Not Found**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
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
- Admin tokens that do not map to a user UUID must supply `user_id`.

### Examples
**cURL**
```bash
curl -X POST \
  'https://api.example.com/api/v1/credits/deduct' \
  -H 'Authorization: Bearer <api_key_or_jwt>' \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 25,
    "reason": "Refund reversal",
    "metadata": { "source": "admin" }
  }'
```
