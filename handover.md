# Handover (Paddle Billing checkout troubleshooting in progress)

## Current State
- Paddle Billing MVP implemented: config loader (sandbox/prod), Paddle client, billing API (`/api/billing/plans`, `/transactions`, `/webhook`), webhook credit grants to Supabase `user_credits` with idempotent `billing_events`, auto-create/reuse Paddle customer/address per user, pricing page wired to backend, Paddle.js installed.
- Supabase tables: `billing_events`, `paddle_customers` exist. Address defaults in `.env` set (US + line1/city/region/postal).
- Plans endpoint fetches real price amounts; pricing page shows $29.00 for innovator plan (sandbox).
- API-keys bootstrap to external service still 503 (known upstream issue), not blocking billing.

## Blocking Issue
- Checkout fails with 409 Conflict from `/api/billing/transactions` after a Paddle customer create 409. Logs:
  - POST /customers → 409
  - GET /customers?search=mustimoger@gmail.com → 200
  - `billing.customer.conflict_no_match` logged; search result not parsed into a reusable customer.
- Latest code logs conflict details and search_res (generic dict), but we haven't seen the body yet.
- The backend now parses search/list responses generically and should log `conflict_details` and `search_res` on conflict.
- A syntax error in billing.py was fixed (commit `091e45c`); backend must be restarted with that code.

## Next Steps (high priority)
1) Restart backend with latest main (`091e45c`) and retry checkout once to capture the new conflict logs. Inspect the log output for `billing.customer.conflict_no_match` to see `conflict_details` and `search_res`.
2) Based on logs, implement reuse:
   - If search_res.data contains a customer id, reuse it and skip creation.
   - If conflict details include an existing customer id, parse and reuse.
3) If address creation later conflicts, reuse the first address from `list_addresses` (already in place).
4) Retest checkout (sandbox) with Playwright/local auth token; expect Paddle checkout to open.

## Commands/Env Notes
- Backend run: `cd backend && source ../.venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8001`
- Frontend env: `.env.local` uses `NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api`.
- Supabase session for mustimoger is available (see user message; stored key `sb-zobtogrjplslxicgpfxc-auth-token`).
- Address defaults set in `.env`:
  - `PADDLE_BILLING_DEFAULT_COUNTRY=US`
  - `PADDLE_BILLING_DEFAULT_LINE1=123 Test St`
  - `PADDLE_BILLING_DEFAULT_CITY=Test City`
  - `PADDLE_BILLING_DEFAULT_REGION=CA`
  - `PADDLE_BILLING_DEFAULT_POSTAL=94016`
- Paddle sandbox price: `pri_01kakhgmqjkjre4tf8wgx4208c` (amount 2900 USD) in plan definitions.

## Recent Commits
- `091e45c` fix billing customer creation indentation (syntax error resolved).
- `cc5e17d` parse generic responses for search/list; log search_res.
- `fd5c7a7` parse search data for reuse.
- `7499d78` reuse customer/address on conflict.
- `c9856b4` add paddle-js, pricing wiring, supabase type fixes.

## Tests
- `backend/tests/test_billing.py` passing.
- `npm run build` passing after fixes.

## Known Warnings
- UI console: image size warning for logo; not blocking.
- API keys bootstrap 503 from external service; not blocking billing.
