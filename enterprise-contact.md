# Enterprise Contact Plan: Dashboard `/pricing` "Contact Sales"

## Goal
- Implement a production-ready "Contact Sales" flow on the dashboard `/pricing` page that always gives users a working next step.

## Current State
- The button exists in `apps/dashboard/app/pricing/pricing-client.tsx`.
- Click behavior currently opens Crisp chat only when `$crisp` is available.
- If Crisp is unavailable, the code only logs `pricing_v2.contact_requested` to console and provides no user-facing outcome.

## First-Principles MVP (Implement First)
1. Persist a contact request server-side.
2. Give immediate user feedback (loading/success/error).
3. Guarantee a fallback action if chat/integrations are unavailable.

### MVP UX Flow
1. User clicks `Contact Sales`.
2. Frontend sends `POST /api/sales/contact-request` with contextual payload.
3. Backend validates payload and stores request (or forwards to configured destination).
4. Frontend shows success message with request reference.
5. Frontend then tries optional convenience actions in order:
- Open Crisp with context (if available).
- Else open scheduler URL (if configured).
- Else open prefilled `mailto:` fallback.

## API Contract (MVP)

### Endpoint
- `POST /api/sales/contact-request`

### Request Body
```json
{
  "source": "dashboard_pricing",
  "plan": "payg | monthly | annual",
  "quantity": 100000,
  "contactRequired": true,
  "page": "/pricing"
}
```

### Server-Enriched Fields (Do Not Trust Client)
- `user_id` from session/auth token.
- `account_email` from authenticated account.
- `request_ip` and `user_agent` from request context.

### Response (Success)
```json
{
  "ok": true,
  "requestId": "salesreq_xxx",
  "message": "Sales request submitted"
}
```

### Response (Error)
```json
{
  "ok": false,
  "error": "rate_limited | invalid_payload | service_unavailable",
  "message": "Human readable message"
}
```

## Frontend Changes (MVP)
- Replace chat-only/no-op logic with async submit flow.
- Add local states: `idle | submitting | submitted | failed`.
- Disable button during submit to prevent duplicate clicks.
- Show clear success and failure notices.
- Keep fallback behavior explicit when external services are unavailable.

## Backend Changes (MVP)
- Add authenticated route in dashboard backend for contact requests.
- Add minimal persistence target:
- Preferred: table `sales_contact_requests`.
- Acceptable MVP alternative: send structured notification email and log request ID.
- Return deterministic `requestId` in responses.

## Reliability, Security, and Abuse Controls
- Require authentication for dashboard-origin requests.
- Add per-user and per-IP rate limiting.
- Add idempotency key support to avoid duplicate ticket creation.
- Validate/sanitize all user-provided fields.
- Never expose PII in URL params or browser logs.

## Observability
- Emit structured events:
- `pricing_contact_sales_clicked`
- `pricing_contact_sales_submitted`
- `pricing_contact_sales_failed`
- Include `plan`, `quantity_bucket`, `source`, and `requestId` (if created).

## Acceptance Criteria
- Button always produces user-visible outcome (success or actionable fallback).
- Contact request is persisted or delivered to configured destination.
- Duplicate rapid clicks do not create duplicate requests.
- Failure states are explicit and actionable.
- Analytics events are emitted for click, success, and failure.

## Testing Plan

### Unit
- Payload validation and error mapping.
- Frontend state transitions for success/failure/timeout.
- Fallback selection order (Crisp -> scheduler -> mailto).

### Integration
- Authenticated request path end-to-end.
- Rate limit behavior.
- Idempotency behavior.
- Backend persistence or outbound notification success/failure handling.

## Rollout Plan
1. Ship MVP endpoint + frontend submit flow behind feature flag (optional).
2. Validate in staging with test accounts.
3. Enable in production.
4. Monitor submission/failure metrics for 48 hours.
5. Add post-MVP enhancements (CRM sync, SLA automations, assignment rules).

## Out of Scope (MVP)
- Full CRM bidirectional sync.
- Sales territory routing engine.
- Advanced lead scoring.

## Notes
- This file is a planning artifact only. No runtime code is implemented by this document update.
