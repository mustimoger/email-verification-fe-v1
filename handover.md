# Handover (Paddle Billing checkout verified in sandbox)

## Current State
- Paddle Billing MVP is live in sandbox: config loader (sandbox/prod), Paddle client, billing API (`/api/billing/plans`, `/transactions`, `/webhook`), webhook credit grants to Supabase `user_credits` with idempotent `billing_events`, auto-create/reuse Paddle customer/address per user, pricing page wired to backend, Paddle.js installed.
- Supabase tables: `billing_events`, `paddle_customers` exist. Address defaults in `.env` set (US + line1/city/region/postal).
- Plans endpoint fetches real price amounts; pricing page shows $29.00 for innovator plan (sandbox).
- API-keys bootstrap to external service still 503 (known upstream issue), not blocking billing.
- Profile backfill: billing upserts profile email/display_name from Supabase auth claims if profile row lacks email; supabase-py upsert fixed (no `.select()`).
- Paddle customer reuse: on 409, uses exact email filter then fuzzy search. Works for existing users.
- Frontend pricing: initializes Paddle.js with backend status (sandbox). Checkout succeeds; sandbox checkout modal completes payment (see screenshots).

## Recent Outcomes
- New user (`dmktadimiz@gmail.com`, user_id `c105fce3-786b-4708-987c-edb29a8c8ea0`): checkout succeeds, transactions created (e.g., `txn_01kcpj9a28s0h13ztq3qtn71g1`, `txn_01kcpjcmysrzvsm2f59by590fj`) with customer `ctm_01kcpgkex4242hzxg5s22ps9kj`, address `add_01kcpgkfj320wne5dprcngj8xr`. Paddle modal shows success (Screenshot_2.png).
- Existing user (`mustimoger@gmail.com`) reuses existing Paddle customer via email filter (validated via earlier CLI).

## Remaining Issues / Warnings
- UI warnings: Next/Image logo aspect ratio warning (cosmetic). CSP report-only warnings from Paddle/Sentry/Kaspersky; checkout still works.
- External `/api-keys/bootstrap` still 503 from upstream; unrelated to billing.
- Sandbox checkout script currently from env; could swap to `https://sandbox-cdn.paddle.com/paddle/v2/paddle.js` to align domains and possibly reduce CSP noise.

## Next Steps (priority)
1) Cosmetic: set logo width/height auto to silence Next/Image warning.
2) Monitor billing webhooks (if enabled) to ensure credits grant on transaction completion; transactions currently created and modal completes in sandbox.
3) Upstream `/api-keys` 503 remains; retry once upstream is fixed.

## Commands/Env Notes
- Backend run: `cd backend && source ../.venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8001`
- Frontend env: `.env.local` uses `NEXT_PUBLIC_API_BASE_URL=http://localhost:8001/api`.
- Supabase session token for dmktadimiz provided by user (key `sb-zobtogrjplslxicgpfxc-auth-token`).
- Address defaults set in `.env`:
  - `PADDLE_BILLING_DEFAULT_COUNTRY=US`
  - `PADDLE_BILLING_DEFAULT_LINE1=123 Test St`
  - `PADDLE_BILLING_DEFAULT_CITY=Test City`
  - `PADDLE_BILLING_DEFAULT_REGION=CA`
  - `PADDLE_BILLING_DEFAULT_POSTAL=94016`
- Paddle sandbox price: `pri_01kakhgmqjkjre4tf8wgx4208c` (amount 2900 USD) in plan definitions.

## Recent Commits
- `32edf03` billing: fix supabase profile upsert and paddle env init; checkout flow working.
- Earlier: `091e45c` fix billing customer creation indentation; `cc5e17d` generic search/list parsing; `fd5c7a7` parse search data; `7499d78` reuse customer/address on conflict; `c9856b4` paddle-js wiring.

## Tests
- `backend/tests/test_billing.py` passing.
- `npm run build` last known passing; rerun if needed after env/script swap.

## Assets / Evidence
- `Screenshot_1.png`: sandbox checkout form with card/PayPal options.
- `Screenshot_2.png`: sandbox checkout success confirmation modal.
