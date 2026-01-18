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

## Completed Work (This Session)

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
- `unit_amount_cents` is **rounded to integer cents** (Paddle requirement). Whole‑dollar rounding will be handled by backend adjustments later.

### Sync Script (V2)
- New script: `backend/scripts/sync_paddle_pricing_v2.py`
  - Filters Paddle prices by `custom_data.catalog == "pricing_v2"` only.
  - Upserts into `billing_pricing_tiers_v2` by `(mode, interval, min_quantity, max_quantity)`.
  - Preserves seeded values and adds `paddle_price_id` + `paddle_custom_data` to metadata.
- Ran sync against sandbox:
  - `PYTHONPATH=backend python backend/scripts/sync_paddle_pricing_v2.py --environment sandbox --catalog pricing_v2`
  - Verified: `billing_pricing_tiers_v2` has 33 rows with non‑null `paddle_price_id`.

## Key Files Updated
- `newpricing.md` — v2 decisions + status updates, Paddle catalog status, v2 sync status.
- `PLAN.md` — v2 table creation, v2 catalog creation, v2 sync marked complete.
- `backend/scripts/sync_paddle_pricing_v2.py` — new script.
- `handover.md` — this file.

## Current State Summary
- **V1 pricing flow unchanged** and still active.
- **V2 data tables populated** and Paddle sandbox catalog created.
- **V2 price IDs synced** into Supabase.
- **No backend v2 endpoints yet**; no UI `/pricing-v2` yet.

## Next Steps (Priority Order)
1. **Backend V2 endpoints**
   - Add `/api/billing/v2/quote` and `/api/billing/v2/transactions`.
   - Use `billing_pricing_config_v2` + `billing_pricing_tiers_v2` only.
   - Enforce min/max/step (2,000–10,000,000, step 1,000). Reject above max with “Contact us”.
   - Select tier by quantity (volume pricing).

2. **Rounding adjustment mechanism**
   - Apply whole‑dollar rounding (0.5 up) in backend quote + transactions.
   - Use a Paddle‑compatible adjustment (fee/discount line item) so charged total equals rounded UI total.

3. **Webhook credit grants**
   - Update webhook mapping to check v2 tiers first (by `paddle_price_id` in `billing_pricing_tiers_v2`).
   - Fallback to v1 `billing_plans` if no v2 match to keep legacy flow intact.
   - Annual grants: `quantity * credits_per_unit * 12` upfront.

4. **Frontend `/pricing-v2`**
   - New slider UI that calls v2 quote + transactions.
   - Use `PRICING_V2` flag to control exposure if needed.

5. **Tests**
   - Backend: tier selection, quote math, rounding adjustment, transaction payloads.
   - Frontend: slider state + disabled states + contact CTA.

## Useful Commands / Checks
- Run v2 sync again if needed:
  - `source .venv/bin/activate`
  - `PYTHONPATH=backend python backend/scripts/sync_paddle_pricing_v2.py --environment sandbox --catalog pricing_v2`
- Verify price IDs are present:
  - `select count(*) as total, count(paddle_price_id) as with_ids from public.billing_pricing_tiers_v2;`

## Notes / Risks
- Paddle requires integer cents, so `unit_amount_cents` is rounded from `unit_amount_raw`. Whole‑dollar rounding must be reconciled with an explicit adjustment line item during checkout; otherwise checkout totals won’t match UI.
- Ensure v1 flow remains untouched until v2 is verified.

## Git Status at Handover
- Modified: `PLAN.md`, `newpricing.md`
- New: `backend/scripts/sync_paddle_pricing_v2.py`
- Untracked: `handover.md`
- These changes are not committed/pushed yet.
