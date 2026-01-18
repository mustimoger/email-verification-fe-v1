# Handover — Pricing V2 (Parallel Rollout)

## Context + Decisions
- Goal: Implement new volume pricing slider in parallel with current fixed-plan flow. Do **not** disrupt v1.
- Decisions recorded in `newpricing.md`:
  - V2 endpoints under `/api/billing/v2/*`.
  - Separate Supabase tables for v2 (`billing_pricing_config_v2`, `billing_pricing_tiers_v2`).
  - Separate UI route `/pricing-v2` only.
  - New Paddle catalog in **sandbox** only.
  - Feature flag env var: `PRICING_V2`.
- Rounding model: unit price per 1,000 credits in Paddle (cents only), then whole-dollar rounding adjustment in backend/UI to match display totals exactly.

## Completed Work (to date)

### Supabase (V2 isolated tables)
- Created and seeded:
  - `billing_pricing_config_v2` (1 active row)
  - `billing_pricing_tiers_v2` (33 rows: payg + monthly + annual)
- Seed source: `boltroute_pricing_config_FINAL.json`.
- Validation:
  - `select count(*) from billing_pricing_config_v2` -> 1
  - `select count(*) from billing_pricing_tiers_v2` -> 33

### Paddle Sandbox Catalog (V2)
- Created **new product** in sandbox:
  - `pro_01kf8ty1659c4dff5c5f0wdwy7` — “Email Verification Credits (Volume V2)”
- Created **33 prices** (payg + monthly + annual) with metadata in `custom_data`:
  - `custom_data.catalog = "pricing_v2"`
  - Includes `tier`, `mode`, `interval`, `min_quantity`, `max_quantity`, `credits_per_unit`, `units_min`, `units_max`, `unit_amount_raw`, `unit_amount_cents`.
- `unit_amount_cents` is **rounded to integer cents** (Paddle requirement); whole‑dollar rounding is now handled by the backend (see below).

### Sync Script (V2)
- New script: `backend/scripts/sync_paddle_pricing_v2.py`
  - Filters Paddle prices by `custom_data.catalog == "pricing_v2"` only.
  - Upserts into `billing_pricing_tiers_v2` by `(mode, interval, min_quantity, max_quantity)`.
  - Preserves seeded values and adds `paddle_price_id` + `paddle_custom_data` to metadata.
- Ran sync against sandbox:
  - `PYTHONPATH=backend python backend/scripts/sync_paddle_pricing_v2.py --environment sandbox --catalog pricing_v2`
  - Verified: `billing_pricing_tiers_v2` has 33 rows with non‑null `paddle_price_id`.

### Backend V2 endpoints + pricing service
- Added `backend/app/services/pricing_v2.py`:
  - Loads v2 config + tiers from Supabase.
  - Validates min/max/step and tier contiguity; logs explicit errors.
  - Computes totals using Decimal math and exposes rounding adjustment amounts.
- Added `backend/app/api/billing_v2.py`:
  - `POST /api/billing/v2/quote` — returns tier + raw/rounded totals + rounding adjustment.
  - `POST /api/billing/v2/transactions` — resolves tier by quantity (or price_id), validates ranges, creates Paddle transaction.
  - `GET /api/billing/v2/config` — returns pricing config + checkout metadata for the v2 UI.
- Wired router into `backend/app/main.py` (kept v1 untouched).

### Whole‑dollar rounding adjustments (backend)
- Implemented in `/api/billing/v2/transactions`:
  - **Negative adjustment** -> transaction‑level `discount` (flat amount, cents). This reduces total to the rounded amount.
  - **Positive adjustment** -> add a non‑catalog fee item using the **same product_id** as the tier’s Paddle price (resolved via `GET /prices/{id}`) with a custom unit price in cents.
- Added rounding description support via config metadata:
  - `metadata.rounding_fee_description` / `metadata.rounding_discount_description` (falls back to `metadata.rounding_description` or “Rounding adjustment” with a warning log).
- Paddle client models updated (`backend/app/paddle/client.py`) to support `discount`, non‑catalog price items, and `product_id` on price responses.

### Tests
- Added `backend/tests/test_pricing_v2.py` covering:
  - Quote math + rounding adjustment values.
  - Validation errors for invalid steps.
  - Transaction payloads + fee/discount behavior.
  - Config endpoint metadata response.
- Tests run with venv active:
  - `pytest backend/tests/test_pricing_v2.py` (pass; warnings from pyiceberg/pydantic only).
  - `npx tsx tests/pricing-v2-utils.test.ts` (pass).

### Frontend `/pricing-v2` UI
- Added `app/pricing-v2` route gated by `PRICING_V2`.
- Ported the `boltroute_pricing_page.jsx` design into Tailwind components with light surfaces and dark-mode variables.
- Wired slider + plan toggles to `/api/billing/v2/config` + `/api/billing/v2/quote`, and checkout to `/api/billing/v2/transactions`.
- Added `app/pricing-v2/utils.ts` + unit tests for pricing-v2 formatting/validation helpers.

## Key Files Updated
- `backend/app/services/pricing_v2.py` — v2 pricing config/tier loading and math.
- `backend/app/api/billing_v2.py` — v2 quote + transaction endpoints.
- `backend/app/paddle/client.py` — support for non‑catalog price items and transaction discounts.
- `backend/tests/test_pricing_v2.py` — v2 pricing tests.
- `app/pricing-v2/page.tsx` — feature-flag gated v2 pricing route.
- `app/pricing-v2/pricing-v2-client.tsx` — v2 pricing UI + checkout wiring.
- `app/pricing-v2/pricing-v2-sections.tsx` — shared UI sections.
- `app/pricing-v2/pricing-v2.module.css` — slider styling + light/dark tokens.
- `app/pricing-v2/utils.ts` — v2 UI helpers.
- `tests/pricing-v2-utils.test.ts` — v2 UI unit tests.
- `PLAN.md`, `newpricing.md` — updated step statuses and explanations.

## Current State Summary
- **V1 pricing flow unchanged** and still active.
- **V2 data tables populated** and Paddle sandbox catalog created; price IDs synced.
- **V2 endpoints live** (`/api/billing/v2/quote`, `/api/billing/v2/transactions`).
- **Rounding adjustment implemented** in transactions (fee item or flat discount).
- **UI `/pricing-v2` implemented** and gated behind `PRICING_V2`.
- **Webhook credit grants not updated** to check v2 tiers first.

## Next Steps (Priority Order)
1. **Webhook credit grants (v2)**
   - Check `billing_pricing_tiers_v2` by `paddle_price_id` first.
   - Fallback to v1 `billing_plans` if no v2 match.
   - Annual grants: `quantity * credits_per_unit * 12` upfront.
2. **Sandbox verification**
   - Run a v2 transaction checkout to confirm rounding fee/discount behavior in Paddle totals.
3. **Volume table data source**
   - Confirm `billing_pricing_config_v2.metadata.display_prices` is populated; if not, decide whether to compute volume-table entries from tiers or add a dedicated tiers endpoint.

## Useful Commands / Checks
- Run v2 tests:
  - `source .venv/bin/activate`
  - `pytest backend/tests/test_pricing_v2.py`
- Run v2 sync again if needed:
  - `source .venv/bin/activate`
  - `PYTHONPATH=backend python backend/scripts/sync_paddle_pricing_v2.py --environment sandbox --catalog pricing_v2`
- Verify price IDs in Supabase:
  - `select count(*) as total, count(paddle_price_id) as with_ids from public.billing_pricing_tiers_v2;`

## Notes / Risks
- Paddle docs describe `discount` flat amounts as requiring `currency_code` in narrative, but the JSON schema doesn’t show `currency_code` for custom discounts; verify in sandbox if Paddle accepts the discount without it.
- Positive rounding uses a non‑catalog price item and requires `product_id` for the existing tier price. This is resolved via a Paddle `GET /prices/{id}` call; consider caching/storing product_id in v2 tiers if this becomes a hot path.
- `backend/app/api/billing.py` is >600 lines; v2 logic intentionally lives in a separate router to avoid expanding it.
- `/pricing-v2` volume table currently relies on `billing_pricing_config_v2.metadata.display_prices.payg`; if missing it will show a fallback message until populated.

## Git Status at Handover
- Latest pricing v2 backend + rounding changes committed and pushed: `0514102`.
- Working tree after this handover update:
  - Modified: `handover.md` (not committed yet).
