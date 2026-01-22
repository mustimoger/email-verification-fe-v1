# Handover (email-verification-fe-v1)

## Current status
- Focus: pricing overhaul to match new `pricing.csv` with 1,000‑step interpolation, floor rounding, and Paddle base+increment item model.
- Last changes pushed: `31584c0` (on `main`).
- Local-only files (do not commit): `key-value-pair.txt`, `handover.md`.

## What changed (and why)
### Step 13 (Supabase pricing config)
- **What:** Replaced the active `billing_pricing_config_v2` metadata with new `pricing.csv` anchors and interpolation rules.
- **Why:** Old FINAL pricing no longer applies; new pricing is authoritative and must be data‑driven.
- **How:** Supabase SQL update (via MCP) set:
  - `rounding_rule = floor_whole_dollar`.
  - `metadata.anchors` for `payg`, `monthly`, `annual` (from `pricing.csv`).
  - `metadata.interpolation.step_size=1000`, `rounding=floor`, `extrapolate_min_from={min:10000,max:25000}` (2k–10k uses 10k–25k slope).
  - `metadata.display_prices.payg` updated to new anchor totals (UI volume table uses this only).
  - `metadata.discounts = {monthly_percent:30, annual_percent:50}`.
  - **Removed** old FINAL config + display prices to avoid stale pricing.

### Step 14 (backend + UI)
- **What:** Implemented segment base + increment pricing in code, floor rounding, and UI savings/annual display updates.
- **Why:** Avoid thousands of Paddle prices and keep UI, Supabase, and Paddle aligned with `pricing.csv`.
- **How (key logic):**
  - Base price = anchor price at segment min.
  - Increment price = slope per 1,000 credits between anchors.
  - Total = `base + increment * ((quantity - segment_min)/1000)`.
  - **Rounding:** floor to whole dollars (`floor_whole_dollar`).
  - **2k–10k:** extrapolate using 10k–25k slope.
  - **Paddle transaction items:** base price (qty 1) + increment price (qty steps).
  - **Webhook credit grants:** base item grants `tier.min_quantity` credits, increment item grants `credits_per_unit * qty`.

## Code changes (where/how)
### Backend
- `backend/app/services/pricing_v2.py`
  - `compute_pricing_totals_v2(quantity, tier, config)` now requires config.
  - Added anchor parsing + segment slope computation from `config.metadata.anchors`.
  - Added `increment_price_id` to `PricingTierV2`.
  - Added base/increment cents extraction (`increment_unit_amount_cents` required in metadata).
  - Floor rounding via `rounding_rule` (errors if unsupported).

- `backend/app/api/billing_v2.py`
  - Builds Paddle items as base (qty 1) + increment (qty steps).
  - Requires `increment_price_id` when increment units > 0.

- `backend/app/api/billing.py`
  - Webhook uses price role (base vs increment) to compute credits.
  - Base line item credits = `tier.min_quantity`.
  - Increment line item credits = `credits_per_unit * qty`.

- `backend/scripts/paddle_simulation_e2e.py`
  - v2 simulation now constructs webhook payload with base+increment items.

### Frontend
- `app/pricing/pricing-quote-utils.ts`
  - `resolveDisplayTotals` now **floors** totals (month/year) to avoid cents.
- `app/pricing/pricing-client.tsx`
  - Savings badge uses metadata discounts when provided (`monthly_percent`, `annual_percent`).
  - Keeps annual monthly‑equivalent display (`/month` + “billed annually”).

### Tests
- Updated tests to use new base+increment model and floor rounding:
  - `backend/tests/test_pricing_v2.py`
  - `backend/tests/test_billing.py`
  - `backend/tests/test_trial_bonus.py`
- Added test stubs to bypass external credit grants (avoids missing env in tests).

## Tests run
- `source .venv/bin/activate && PYTHONPATH=backend pytest backend/tests/test_pricing_v2.py backend/tests/test_billing.py backend/tests/test_trial_bonus.py`
- Result: **19 passed** (with existing deprecation warnings).

## Important behavior changes to know
- **Pricing now depends on Supabase config metadata**; old FINAL config no longer used.
- **Checkout will fail for quantities above a segment minimum until Step 15** adds `increment_price_id` and `increment_unit_amount_cents` into tier metadata.
- UI savings badges are now fixed at 30% (monthly) and 50% (annual) if provided in config metadata.

## Pending work (next steps)
### Step 15 - Create/Sync Paddle base + increment prices
- **What:** Create Paddle prices for each segment and plan (base + increment) = 48 total.
- **Why:** Transactions require base and increment price IDs to exist and be linked to tiers.
- **How:**
  - Create Paddle prices with custom_data:
    - `catalog=pricing_v2`, `mode`, `interval`, `min_quantity`, `max_quantity`, `credits_per_unit=1000`.
    - Add `price_role=base|increment`.
  - For each segment, base price amount = price at segment min; increment price amount = slope per 1,000.
  - Update `billing_pricing_tiers_v2.metadata` to include:
    - `increment_price_id` (the Paddle price ID for increment).
    - `increment_unit_amount_cents` (the per‑1k increment price in cents).
  - **Note:** `backend/scripts/sync_paddle_pricing_v2.py` currently does not understand base/increment roles. Either extend it to map increment prices into tier metadata, or update tiers via SQL after creating prices.

### Step 16 - Validation
- Run `backend/scripts/paddle_simulation_e2e.py` for payg/month/annual using v2.
- Verify:
  - Paddle checkout totals are whole dollars (floor).
  - Supabase `credit_grants` and external ledger reflect expected credits.
  - UI `/pricing` shows no cents and shows correct savings badges (30%/50%).

## Notes / Constraints
- **Do not disrupt UI design.** UI changes were logic-only.
- **Minimum purchase remains 2,000**; 2k–10k uses 10k–25k slope.
- **Annual remains billed yearly in advance**; credits multiplier remains `12` (from config).
- `backend/app/api/billing.py` exceeds 600 lines (keep edits minimal).

## Repo status
- Pushed commit: `31584c0` (segment pricing model + floor rounding).
- Uncommitted local files: `key-value-pair.txt`, `handover.md`.
