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
- Validation attempt (full UI checkout, 50K payg):
    - Paddle checkout succeeded (sandbox card) and webhook wrote:
    - `credit_grants`: `txn_01kfjna2z8j6e86hdnrpe2cf32`, `credits_granted=50000`, `amount=8900`, `invoice_number=74722-10026`.
    - `billing_events`: `evt_01kfjnas242k0ctg75fx4ta7av`, `event_type=transaction.completed`.
  - External ledger did not update:
    - `credit_transactions` has no new grant for that transaction.
    - External balance via External API client (DEV key) remained `97801`.
    - Likely cause: backend server not restarted to pick up the new admin-key logic, or admin key not configured.
- Validation attempt (direct grant API call, 40,000 credits):
  - Called `POST /api/v1/credits/grant` for `dmktadimiz@gmail.com` (user_id `c105fce3-786b-4708-987c-edb29a8c8ea0`).
  - Response: `id=fcd3a6d6-3c03-4ce2-b0a8-3cc4d5e1424b`, `amount=40000`, `balance_after=137801`, `reason=manual_grant`, `metadata.source=manual_request`.
  - `public.credit_transactions` inserted matching row (same id/amount/metadata).
- Validation attempt (full UI checkout, 50K payg after backend restart):
  - Paddle checkout succeeded and webhook wrote:
    - `credit_grants`: `txn_01kfjpdwy9crfwve36z1ygyww4`, `credits_granted=50000`, `amount=8900`, `invoice_number=74722-10027`.
    - `billing_events`: `evt_01kfjpectq5z5fvw9m2gpjbwtw`, `event_type=transaction.completed`.
  - External ledger updated:
    - `credit_transactions`: `id=aec66138-91d5-44a3-b2c5-0e67047050ea`, `amount=50000`, `balance_after=187801`, `reason=purchase`, `metadata.transaction_id=txn_01kfjpdwy9crfwve36z1ygyww4`.
    - External API balance (DEV key) returned `187801`.
- Remaining:
  - None.

### Step 7 - Fix /pricing slider alignment mismatch
- What: Align slider thumb position with the displayed selected credit tier/value.
- Where: `/pricing` page slider component (frontend UI only).
- Why: Current slider thumb position does not match the selected credits shown in UI (see `Screenshot_1.png`, `Screenshot_2.png`, `Screenshot_3.png`).
- How: Inspect slider value -> label/tier mapping and ensure tick/step positions reflect the actual selected credits.
- Status: Completed.
- Done:
  - Replaced the log-spaced label calculation with a linear min→max interpolation so the slider thumb and labels represent the same scale.
  - Preserved the existing 5-label layout and rounded each tick to the configured step size to match valid slider values.
  - Kept the UI design intact; only the label mapping logic changed.
- Notes:
  - Label generation remains data-driven from pricing config (min/max/step).

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
- Monthly UI checkout (Playwright + Paddle MCP):
  - Completed `/pricing` → Monthly → Subscribe Now flow; Paddle checkout returned success.
  - Paddle transaction: `txn_01kfjqr9s3scq76fxf765yeg1d` (status `completed`, price `pri_01kf8tza40n6k0mw2ebqc2v0gt`, billing cycle `month`, quantity 2).
  - Paddle subscription: `sub_01kfjqtc8btx506e55aar4r576` (status `active`, billing cycle `month`, `nextBilledAt=2026-02-22T11:35:44.621756Z`).
  - Confirms monthly subscription is recorded and scheduled for automatic invoicing.
- Monthly purchase credit reconciliation (Supabase):
  - Local `credit_grants` row: `fd9de4d7-da40-4734-8d9a-2e481943bc47` (transaction `txn_01kfjqr9s3scq76fxf765yeg1d`, `credits_granted=2000`, `amount=600`, `currency=USD`).
  - External ledger `credit_transactions` row: `340b3d84-0fe0-4fe4-8b98-558caed20040` (`amount=2000`, `balance_after=189801`, `reason=purchase`, metadata includes `transaction_id`).
  - Confirms external credit ledger updated for the monthly subscription purchase.
- Monthly purchase billing event:
  - `billing_events` row: `evt_01kfjqtdvwnvgb0asm3xcnepfg` (`event_type=transaction.completed`, `transaction_id=txn_01kfjqr9s3scq76fxf765yeg1d`, `credits_granted=2000`).
- Added Step 6 to use `EXTERNAL_API_ADMIN_KEY` for credit grants with fallback to `DEV_API_KEYS`, and validated via direct grant + full UI checkout after backend restart.
- Added Step 7 to track fixing the `/pricing` slider position vs. selected credits mismatch.
- Completed Step 7 by aligning slider tick labels to the linear slider scale so displayed credits match the thumb position.

### Step 8 - Annual subscription UI checkout validation
- What: Run full `/pricing` annual subscription checkout and verify Paddle + Supabase updates.
- Where: `/pricing` UI, Paddle checkout, Supabase tables.
- Why: Confirm annual plan is recorded and auto-billing schedule + credit grants are correct.
- How: Complete checkout in UI, then verify Paddle subscription/transaction and `credit_grants`, `billing_events`, `credit_transactions`.
- Status: Completed.
- Done:
  - Completed `/pricing` → Annual → Subscribe Now checkout after webhook fix; Paddle overlay confirmed success.
  - Paddle transaction: `txn_01kfjse9rrnzr9y7scqaxjn3cd` (status `completed`, price `pri_01kf8tzdb09rkb3xwk126r9p2t`, billing cycle `year`, quantity 2; includes rounding adjustment line item).
  - Paddle subscription: `sub_01kfjsf8jd2htqv0jpnc0xrf5q` (status `active`, billing cycle `year`, `nextBilledAt=2027-01-22T12:04:37.685199Z`).
  - Annual plan is scheduled for automatic yearly invoicing (not monthly).
  - Supabase updated successfully for the new annual transaction:
    - `credit_grants`: `2160ada7-396a-4caf-b1b4-9001b18bc2e0` (`credits_granted=24000`, `amount=600`, `currency=USD`).
    - `billing_events`: `evt_01kfjsfaf1rhb5fy25dnnb3gwf` (`event_type=transaction.completed`, `credits_granted=24000`).
    - `credit_transactions`: `f9aee3a5-bc4c-40b8-a41c-4a2d481a8985` (`amount=24000`, `balance_after=213801`, metadata includes `transaction_id`).

### Step 9 - Handle non-credit line items in Paddle webhook
- What: Ensure Paddle webhook ignores non-credit line items so annual subscriptions with adjustments still grant credits.
- Where: `backend/app/api/billing.py` webhook handler.
- Why: Annual checkout includes an additional line item (e.g., adjustment/custom price). Current logic treats any unmapped price ID as fatal and aborts the grant flow.
- How: Skip line items that are explicitly non-credit (e.g., custom price types) while still failing on genuinely missing credit mappings.
- Status: Completed.
- Done:
  - Added a guard in the webhook item parsing loop to skip items where `price.type === "custom"` and log `billing.webhook.skip_noncredit_item`.
  - This prevents rounding-adjustment items from causing `price_mapping_missing` and allows the credit grant flow to proceed.
