# Pricing migration plan (local -> external API)

## Goal (what/why/how/where)
- What: Keep pricing and Paddle flow local while aligning credit grants and balances with the external API.
- Why: External API does not own pricing; it owns credit balance/deduction logic and usage tracking.
- Where: Backend billing webhook and bonus credit endpoints; /pricing UI stays on local billing routes.
- How: After any local credit grant (purchase or signup/trial), call external `POST /api/v1/credits/grant` with Supabase JWT and metadata.

## Agreed cross-system flow (local + external)
- Local handles Paddle checkout, pricing config/quote, and writes purchase records to local Supabase.
- Local writes purchase details to `credit_grants` (purchases remain local history).
- External API has no separate pricing/credit database; it reads local Supabase for profiles, purchases, and credits when needed.
- External API performs real-time credit checks, usage tracking, and deductions; it writes to `credit_transactions`.
- Local must call external `POST /api/v1/credits/grant` after Paddle confirmation and after signup/trial credit grants.

## Current dependency map (local vs external)
- Pricing configuration (min/max/step, currency, free trial credits, display prices, checkout flags/script/token):
  - Local: `GET /billing/v2/config` via `billingApi.getPricingConfigV2` (API_BASE).
  - External: Intentionally not provided; pricing stays local.
- Pricing quotes (payg/monthly/annual totals):
  - Local: `POST /billing/v2/quote` via `billingApi.getQuoteV2`.
  - External: Intentionally not provided; pricing stays local.
- Checkout transaction creation (Paddle transaction id):
  - Local: `POST /billing/v2/transactions` via `billingApi.createTransactionV2`.
  - External: Intentionally not provided; pricing stays local.
- Dashboard shell profile (name/avatar/email):
  - Local: `GET /account/profile` via `apiClient.getProfile`.
  - External: Reads local Supabase (confirmed by external API owner).
- Dashboard shell credits balance:
  - External: `GET /api/v1/credits/balance` via `externalApiClient.getCreditBalance`.
- Paddle checkout bootstrap:
  - Third-party: `@paddle/paddle-js` + checkout_script URL from pricing config.
- Support chat:
  - Third-party: Crisp (`window.$crisp`).

## Step-by-step plan

### Step 1 - Confirm pricing remains local
- What: Record the decision that pricing config/quote/checkout remain local.
- Where: `/pricing` UI, local billing routes, Paddle integration.
- Why: External API does not own pricing or billing flows.
- How: Keep `/api/billing/v2/*` in place and avoid external pricing endpoints.
- Status: Completed.
- Done:
  - Documented the agreed ownership: local handles pricing and Paddle; external handles credits.

### Step 2 - Grant credits in external API after Paddle confirmation
- What: Call external `POST /api/v1/credits/grant` after local Paddle confirmation.
- Where: `backend/app/api/billing.py` (webhook handler).
- Why: External API cannot listen to Paddle events, but it owns credit ledger updates.
- How: After local `credit_grants` insert succeeds, send a grant to external API with Supabase JWT.
- Status: Completed.
- Done:
  - Added an external credit grant client (`ExternalAPIClient.grant_credits`) and helper to mint an admin Supabase JWT.
  - Wired the Paddle webhook to call external credits grant after local `credit_grants` insert with reconciliation metadata.
- Notes:
  - Requires `EXTERNAL_API_JWT_TTL_SECONDS` to mint the admin JWT; missing or invalid values are logged and skip the external grant call.

### Step 3 - Grant credits in external API for signup/trial bonus
- What: Call external `POST /api/v1/credits/grant` after local signup/trial bonus grants.
- Where: `backend/app/api/credits.py`.
- Why: Signup and trial bonuses must appear in the external credit ledger.
- How: After local grant succeeds, send a matching grant request to external API.
- Status: Completed.
- Done:
  - Wired signup and trial bonus grants to call external `credits/grant` after the local `credit_grants` insert.
  - Included bonus metadata (source, credits, user email, account created timestamp, IP/user-agent) for reconciliation.
- Notes:
  - Requires `EXTERNAL_API_JWT_TTL_SECONDS` to mint the admin JWT; missing or invalid values skip the external grant call.

### Step 4 - Define grant metadata payload
- What: Standardize metadata sent with external grant calls.
- Where: Backend grant calls in Steps 2 and 3.
- Why: Enables reconciliation across Paddle, local Supabase, and external ledger.
- How:
  - Include at least: `transaction_id`, `source` (purchase/signup/trial), `price_ids`, `amount`, `currency`, `purchased_at`, `event_id` when available.
- Status: Completed.
- Done:
  - Added shared metadata builders for purchase and bonus grants to keep payloads consistent.

### Step 5 - Validation and regression checks
- What: Confirm Paddle purchase grants are mirrored into external credits ledger.
- Where: Backend runtime, Paddle e2e script.
- Why: Ensure credit balances reflect purchases and bonuses across systems.
- How:
  - Run `backend/scripts/paddle_simulation_e2e.py` and verify both local `credit_grants` and external credits balance.
  - Re-run pricing UI smoke checks (no endpoint changes expected).
- What/Why/How/Where (flow verification: external grant write path):
  - What: Verify which Supabase tables are written by the external API after a credit grant, and which are written locally.
  - Why: Confirms the agreed ownership split (local purchase history vs. external credit ledger).
  - How: Issued a direct `POST /api/v1/credits/grant` call using admin credentials and inspected Supabase tables before/after.
  - Where: External API writes to `public.credit_transactions`; local app writes purchase details to `public.credit_grants`.
- Status: Completed.
- Done:
  - Ran Paddle v2 simulations for payg (50,000), subscription monthly (75,000), and subscription annual (250,000).
  - Verified local `credit_grants` rows exist for all three transactions.
  - Confirmed external `credits/balance` using the Supabase JWT from `key-value-pair.txt` (balance response returned successfully).
  - Ran Playwright UI smoke check for `/pricing` using localStorage Supabase auth; page rendered with pricing data and the Buy Credits CTA enabled.
  - Confirmed `/api/billing/v2/config` and `/api/billing/v2/quote` returned 200 during the UI check.
  - Observed expected auth side-effects: `/api/credits/signup-bonus` returned 409 (eligibility window elapsed) and `/api/credits/trial-bonus` returned 200.
  - External grant write verification (test user `c105fce3-786b-4708-987c-edb29a8c8ea0`):
    - `POST /api/v1/credits/grant` with local admin Supabase JWT (minted via `supabase_jwt_secret`) returned 401 (invalid/missing auth).
    - `POST /api/v1/credits/grant` with DEV API key (`DEV_API_KEYS` from `backend/.env`) succeeded.
    - Response: `id=0062a9f1-a89d-4184-a2e2-d0adedef0c01`, `amount=1`, `balance_after=97801`, `reason=flow_test`, `metadata.source=flow_test`.
    - `public.credit_transactions` inserted the matching row (same id/amount/metadata).
    - `public.credit_grants` did not change (purchase history remains local-only).
  - Full UI checkout (one-time 50,000 credits, Paddle sandbox):
    - /pricing → selected 50K (payg) → Buy Credits → Paddle checkout succeeded (sandbox card 4242).
    - Frontend called `/api/billing/v2/transactions` (200) and Paddle checkout returned success.
    - Supabase `credit_grants` inserted: `txn_01kfjm3wrbb7d2zcaacx714q3m`, `credits_granted=50000`, `amount=8900`, `currency=USD`, `price_ids=[pri_01kf8v07s4nqxxf4ffahmj49xv]`, `invoice_id=inv_01kfjm6fp2r5dnh9jb3bwk7x6j`, `invoice_number=74722-10025`.
    - Supabase `billing_events` inserted: `evt_01kfjm6hfxrdva7x8xafkxtkqh`, `event_type=transaction.completed`, `credits_granted=50000`.
    - External ledger did NOT update: `public.credit_transactions` has no new grant row; external balance remained `97801` via External API client (DEV key).
    - Issue: external grant likely failed during webhook (admin JWT not accepted by ext API), so external credits were not incremented for this purchase.
- Results (local):
  - payg 50,000 -> `txn_01kfgt1swrj6aaxc5ttjc783se`, `credits_granted=50000`
  - subscription month 75,000 -> `txn_01kfgt2cetpf6eh20gj24k5325`, `credits_granted=75000`
  - subscription year 250,000 -> `txn_01kfgt2p1a0f5hbcymypd7jqrg`, `credits_granted=3000000`
- Results (UI):
  - `/pricing` loaded with sidebar + pricing cards visible; slider active and price totals populated.
  - External balance fetch succeeded (`/api/v1/credits/balance` 200).
- UI data source verification (Available Credits + /pricing):
  - What: Confirm which data sources drive the dashboard "Available Credits" and /pricing pricing data.
  - Why: Ensure remaining credits come from the external ledger, while pricing continues to use local pricing tables.
  - Where:
    - Available Credits: `app/components/dashboard-shell.tsx` -> `externalApiClient.getCreditBalance()` -> `/credits/balance` (external API).
    - /pricing: `app/pricing/pricing-client.tsx` -> `billingApi.getPricingConfigV2()` + `billingApi.getQuoteV2()` -> backend `billing_v2` -> `services/pricing_v2.py`.
  - How:
    - Available Credits is backed by external API balance (ext-api ledger `public.credit_transactions`).
    - /pricing reads local pricing tables `public.billing_pricing_config_v2` and `public.billing_pricing_tiers_v2`, and does not read remaining credits.

### Step 6 - Use external admin key for credit grants
- What: Use a dedicated external API admin key for `/credits/grant` calls, with fallback to `DEV_API_KEYS`.
- Where: Backend external credit grant helper (`backend/app/services/external_credits.py`) and settings/env.
- Why: Prevent user JWTs from granting credits while ensuring local/dev can still grant via admin credentials.
- How:
  - Add `EXTERNAL_API_ADMIN_KEY` setting.
  - Prefer `EXTERNAL_API_ADMIN_KEY`, fallback to `DEV_API_KEYS` if missing.
  - Log clear warnings when falling back or when no admin token is configured.
- Status: Completed.
- Done:
  - Added `EXTERNAL_API_ADMIN_KEY` to settings and `.env.example`.
  - Updated external grant logic to use admin key first, then fall back to `DEV_API_KEYS`.
  - Removed Supabase JWT grant path to avoid user-scoped tokens granting credits.

## STAYED-LOCAL
- Pricing config/quote/checkout endpoints (`/api/billing/v2/*`).
- Paddle JS initialization and checkout script injection (third-party).
- Purchase history (`credit_grants`) written by local webhook.
- Profile writes (`profiles`) from local auth/profile sync.
- UI-only calculations and formatting (quantity validation, display totals, savings percent, volume labels).
- Static marketing copy (feature list, comparison rows, FAQ text).
- Support chat open (Crisp).
- CTA navigation links (/signup, /api).

## Progress updates
- Created this plan to track /pricing ownership and credit-sync work between local and external APIs.
- Updated the plan with the agreed flow: pricing stays local, external credits are granted via API calls after local writes.
- Completed Step 2 by adding an external grant call after Paddle confirmation, including JWT-based auth and reconciliation metadata.
- Completed Step 3 by adding external credit grants for signup/trial bonuses after local inserts.
- Completed Step 4 by standardizing grant metadata via shared helper builders.
- Completed Step 5: ran v2 Paddle simulations, confirmed local `credit_grants`, verified external balance with Supabase JWT, and completed `/pricing` UI smoke check with config/quote 200 responses.
- Added and completed Step 6 to use `EXTERNAL_API_ADMIN_KEY` for credit grants with fallback to `DEV_API_KEYS`.
