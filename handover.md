# Handover (email-verification-fe-v1)

## Current status (what/why/how)
- **Focus:** Pricing v2 migration (pricing.csv anchors + base/increment pricing) and Step 16 validation.
- **Why:** Pricing must be data-driven from `pricing.csv`, with Paddle base+increment items to avoid thousands of prices.
- **How:** Added scripts to create base/increment Paddle prices, sync those into Supabase tier metadata, and aligned pricing math + webhook credit grants to step-size segment mins.

## Major changes completed
### Step 15 (Create/Sync Paddle base + increment prices)
- **What:** Created base + increment Paddle prices for all 33 v2 tiers (66 prices total) and synced metadata to Supabase.
- **Why:** Checkout requires base + increment price IDs and increment unit cents.
- **How:**
  - Added `create_price` to Paddle client.
  - Added `backend/scripts/create_paddle_pricing_v2.py` to compute base/increment amounts from `pricing.csv` anchors and create missing Paddle prices.
  - Extended `backend/scripts/sync_paddle_pricing_v2.py` to read `price_role` and write `increment_price_id` + `increment_unit_amount_cents` into tier metadata while keeping base `paddle_price_id`.
  - Ran creation + sync scripts in sandbox; all 33 tiers now have both price IDs.
- **Note:** Legacy Paddle prices without `price_role` still exist and are ignored by sync.

### Step 17 (Fix v2 base credit grant alignment)
- **What:** Webhook credit grants now align base credits to step-size segment mins (not raw tier min) to prevent +1 grants.
- **Why:** v2 tiers have `min_quantity` like 5001/10001/25001; using raw min caused off-by-one credits in base grant.
- **How:**
  - Exposed `resolve_segment_min_quantity` in `backend/app/services/pricing_v2.py`.
  - Webhook base credit now uses aligned segment min in `backend/app/api/billing.py`.
  - Added regression test `test_webhook_grants_v2_base_alignment` in `backend/tests/test_billing.py`.
  - Ran tests: `PYTHONPATH=backend pytest backend/tests/test_pricing_v2.py backend/tests/test_billing.py backend/tests/test_trial_bonus.py` (20 passed, only dependency warnings).

## Step 16 validation status (unit + integration)
- **Unit tests:** Completed (20 passed).
- **UI smoke check:** Completed with refreshed Supabase token:
  - `/pricing` loads, config + quote calls 200, no cents in totals.
  - One-Time $26, Monthly $19, Annual $13/month with $161/year.
- **Paddle v2 simulations (sandbox):**
  - **Payg 50,000:** PASS (`txn_01kfk3p42x24ae6epx3cyk0p0v`).
  - **Monthly 75,000:** PASS (`txn_01kfk3pek9b1vyzw9jxw19bkah`).
  - **Annual 250,000:** PASS (`txn_01kfk4q7he19w4p288z08t4zxm`).

## Step 18 - Set Paddle quantity limits for increment prices (done)
- **What:** Allow increment line item quantities > 100 by setting price-level quantity limits.
- **Why:** Annual tiers can require more than 100 increments.
- **How:**
  - Updated `backend/scripts/create_paddle_pricing_v2.py` to set quantity limits on price creation (base min/max = 1; increment max = segment max increment units) and replace increment prices missing limits.
  - Updated `backend/scripts/sync_paddle_pricing_v2.py` to select increment prices that match required quantity limits and sync tier metadata to the new price IDs.
  - Reran the annual v2 simulation after the update; Paddle accepted 150 increment units.

## Commands/scripts used (for reproducibility)
- `PYTHONPATH=backend python backend/scripts/create_paddle_pricing_v2.py`
- `PYTHONPATH=backend python backend/scripts/sync_paddle_pricing_v2.py`
- `PYTHONPATH=backend pytest backend/tests/test_pricing_v2.py backend/tests/test_billing.py backend/tests/test_trial_bonus.py`
- `PYTHONPATH=backend python backend/scripts/paddle_simulation_e2e.py --pricing-version v2 --user-email dmktadimiz@gmail.com --quantity 50000 --mode payg --interval one_time`
- `PYTHONPATH=backend python backend/scripts/paddle_simulation_e2e.py --pricing-version v2 --user-email dmktadimiz@gmail.com --quantity 75000 --mode subscription --interval month`
- `PYTHONPATH=backend python backend/scripts/paddle_simulation_e2e.py --pricing-version v2 --user-email dmktadimiz@gmail.com --quantity 250000 --mode subscription --interval year`

## Repo status / commits
- Latest commits pushed:
  - `7c8e4e3` feat: add base/increment pricing sync
  - `e7534f5` docs: update pricing migration status
  - `be85f78` fix: align v2 credit grants

## Notes / environment
- Backend server was restarted after Step 17 so webhook changes are live.
- `key-value-pair.txt` refreshed with a new Supabase token (not committed).
- Notification setting used for simulations: `ngrok2-all` -> `https://772d28b0ba31.ngrok-free.app/api/billing/webhook`.

## Files changed in this session
- `backend/app/paddle/client.py`
- `backend/scripts/create_paddle_pricing_v2.py` (new)
- `backend/scripts/sync_paddle_pricing_v2.py`
- `backend/app/services/pricing_v2.py`
- `backend/app/api/billing.py`
- `backend/tests/test_billing.py`
- `pricing-migration.md`

## Open questions
- None. Proceed with Step 18 to set Paddle price quantity limits, then rerun annual simulation.
