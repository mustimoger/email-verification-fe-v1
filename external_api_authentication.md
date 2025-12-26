# External API Authentication

This document describes how to authenticate requests to the external email verification endpoint.

**Endpoint:** `POST /api/v1/external/verify`

## Authentication Mechanism

The API uses a custom authentication mechanism based on an HMAC-SHA256 signature. This ensures that requests are recent, originate from a trusted source, and have not been tampered with.

### Headers

| Header Key             | Value                             | Description                                                               |
| :--------------------- | :-------------------------------- | :------------------------------------------------------------------------ |
| `X-Authentication-Key` | `<Nonce>.<Timestamp>.<Signature>` | Dot-separated string containing the nonce, timestamp, and HMAC signature. |

### Token Structure

The `X-Authentication-Key` value is constructed as follows:

```
Nonce + "." + Timestamp + "." + Signature
```

- **Nonce**: A random string (e.g., UUID or random bytes hex-encoded) to prevent replay attacks.
- **Timestamp**: RFC3339 formatted string (e.g., `2023-10-27T10:00:00Z`). Must be within +/- 5 minutes of server time.
- **Signature**: Hex-encoded HMAC-SHA256 hash.

### Signature Calculation

The signature is calculated using the following inputs:

```
Payload = Nonce + Timestamp + HTTP Method + Request Path
Signature = Hex(HMAC-SHA256(Payload, SecretKey))
```

- **SecretKey**: The shared `ENCRYPTION_KEY` (must be 16, 24, or 32 bytes).
- **HTTP Method**: e.g., `POST`.
- **Request Path**: e.g., `/api/v1/external/verify`.

### Example

**Inputs:**

- Nonce: `d4e5f6`
- Timestamp: `2023-10-27T10:00:00Z`
- Method: `POST`
- Path: `/api/v1/external/verify`
- SecretKey: `mysecretkey`

**Payload:** `d4e5f62023-10-27T10:00:00ZPOST/api/v1/external/verify`

**Signature:** `HMAC-SHA256(Payload, "mysecretkey")` -> `...hex string...`

**Header Value:** `d4e5f6.2023-10-27T10:00:00Z....hex string...`

## Implementation Examples

### Node.js / TypeScript

```typescript
import * as crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ""; // Must be 16, 24, or 32 bytes

function generateAuthToken(method: string, path: string): string {
  // 1. Generate Nonce
  const nonce = crypto.randomBytes(8).toString("hex");

  // 2. Get current timestamp in RFC3339 format
  const timestamp = new Date().toISOString();

  // 3. Construct Payload
  const payload = nonce + timestamp + method + path;

  // 4. Calculate Signature
  // Note: key must be a Buffer or string. If string, ensure it matches server encoding (usually utf8 or base64 decoded)
  // Assuming ENCRYPTION_KEY is a base64 string in environment, decode it first:
  const key = Buffer.from(ENCRYPTION_KEY, "base64");

  const hmac = crypto.createHmac("sha256", key);
  hmac.update(payload);
  const signature = hmac.digest("hex");

  // 5. Construct Header Value
  return `${nonce}.${timestamp}.${signature}`;
}

// Usage
const token = generateAuthToken("POST", "/api/v1/external/verify");
console.log("X-Authentication-Key:", token);
```
