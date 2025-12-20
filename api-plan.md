# API Page Plan

Goal: deliver reliable API key management and usage visibility on `/api` for external integrations (Zapier, n8n, Google Sheets, Custom), with date‑range filtering and a real usage chart. Keep behavior general and fail loudly with logs when upstream data is missing.

## External API semantics (current)
- `GET /api/v1/api-keys` returns `total_requests` per key and accepts `from`/`to` (RFC3339). If `from`/`to` are omitted, totals are lifetime; if provided, totals are range‑scoped.
- `GET /metrics/api-usage` returns usage grouped by purpose with `from`/`to` (RFC3339) and totals for the same range.
- External API handles deduplication for all endpoints; do not re‑dedupe client‑side.

## Current status
- [x] API keys table wired to backend with masked secret preview (`key_preview`) and integration column.
  Explanation: backend derives `key_preview` from cached secrets so UI never shows key IDs.
- [x] Usage view selector (per‑key vs per‑purpose) wired to `/api-keys?from&to` and `/usage/purpose?from&to`.
  Explanation: per‑key totals come from `total_requests`, per‑purpose totals come from `/metrics/api-usage`, using lifetime totals when `from`/`to` are omitted.
- [x] Usage empty state shows totals when time‑series is missing.
  Explanation: chart area shows the total number if series data is not available.

## Remaining tasks (MVP)
- [x] Date range input: switch to native date inputs and convert selected dates to RFC3339 (`from`/`to`), logging invalid or partial ranges instead of silently failing.
  Explanation: inputs now use `type="date"` and convert to RFC3339 start/end‑of‑day ranges; invalid or partial ranges surface a UI error and log `api.usage.range.invalid`.
- [x] Usage chart: load `/api/usage/summary` with selected date range + api_key_id and render a real chart from its series.
  Explanation: `/api` now fetches `/api/usage/summary` alongside usage totals and renders a real line chart when `series` data exists; logs `api.usage.summary.loaded` or `api.usage.summary.failed` for diagnostics.
- [ ] Verification: add/update minimal tests for date range conversion and ensure `/api` renders the chart when series data is present.
  Explanation: Added unit tests for date range conversion (see `tests/api-usage-utils.test.ts`). UI verification via Playwright is blocked because the provided session triggers `Invalid Refresh Token: Already Used` and redirects to `/signin`. Provide a fresh session to complete the chart verification.

## Notes
- Keep UI layout and styling unchanged; only replace inputs and data plumbing.
- Avoid hardcoded fallbacks; when data is missing, show explicit empty states and log the reason.
