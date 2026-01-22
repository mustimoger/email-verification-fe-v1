# Handover (email-verification-fe-v1)

## Current status (what/why/how)
- **Focus:** Annual credit grants now match the UI quantity after removing the 12× multiplier; annual webhook re-validation is still pending.
- **Why:** Users should receive exactly the credits shown in the UI; the annual multiplier previously over-granted despite annual pricing being correct.
- **How:** Removed the annual multiplier in `backend/app/api/billing.py`, updated the annual webhook unit test, and aligned the Paddle e2e expected credits calculation.

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
  - Updated `backend/scripts/create_paddle_pricing_v2.py` to compute segment-aligned max increment units and create prices with explicit quantity limits (base min/max = 1; increment max = segment max units).
  - Replaced increment prices missing limits by creating new Paddle prices with matching amounts and required quantity limits.
  - Updated `backend/scripts/sync_paddle_pricing_v2.py` to select increment prices that match required quantity limits and sync tier metadata to the new price IDs.
  - Reran the annual v2 simulation after the update; Paddle accepted 150 increment units (`txn_01kfk4q7he19w4p288z08t4zxm`).

## Step 19 - Full UI one-time checkout validation (1,000,000 credits)
- **What:** Completed the `/pricing` one-time purchase flow for 1,000,000 credits and verified ledger updates.
- **Why:** Confirms end-to-end one-time checkout posts a completed Paddle transaction and writes credit grants to local + external ledgers.
- **How:**
  - Playwright checkout succeeded (sandbox card).
  - Paddle transaction: `txn_01kfk5d7f5evyd91df7parm74x` (status `completed`, invoice `inv_01kfk5e6sq3tk5c9s8qgk2cxzq`, invoice `74722-10031`, `subscriptionId=null`).
  - Line items: base `pri_01kfk279twkwb0bnv5sgvd53d3` (qty 1), increment `pri_01kfk4p6g3p13kmpahc74mj2wt` (qty 500), rounding adjustment `pri_01kfk5d7fybme1m8racwcr5fd5` (qty 1).
  - Supabase `credit_grants`: `credits_granted=1000000`, `amount=42600`, `transaction_id=txn_01kfk5d7f5evyd91df7parm74x`.
  - Supabase `billing_events`: `event_id=evt_01kfk5e8q2f181pgev5fhkh7w9`, `transaction.completed`, `credits_granted=1000000`.
  - External `credit_transactions`: `amount=1000000`, `reason=purchase`, metadata includes `transaction_id=txn_01kfk5d7f5evyd91df7parm74x`.

## Step 20 - Full UI monthly checkout validation (1,000,000 credits)
- **What:** Completed the `/pricing` monthly subscription flow for 1,000,000 credits and verified recurring billing setup.
- **Why:** Confirms monthly subscription creates an active Paddle subscription and ledger updates for the first billing cycle.
- **How:**
  - Playwright checkout succeeded (sandbox card + recurring consent).
  - Paddle transaction: `txn_01kfk5r8280kp6nanx34az55y0` (status `completed`, invoice `inv_01kfk5sqvencmfyvj5shsw68rn`, invoice `74722-10032`).
  - Paddle subscription: `sub_01kfk5sqte2tgwrr4ykftw3b25` (status `active`, interval `month`, `nextBilledAt=2026-02-22T15:40:03.632439Z`).
  - Line items: base `pri_01kfk27pc7kdy181rctg6r13bq` (qty 1), increment `pri_01kfk4p9dch5zrw973e0vy946p` (qty 500).
  - Supabase `credit_grants`: `credits_granted=1000000`, `amount=29800`, `transaction_id=txn_01kfk5r8280kp6nanx34az55y0`.
  - Supabase `billing_events`: `event_id=evt_01kfk5ssjmgysdzcmk0f59vps5`, `transaction.completed`, `credits_granted=1000000`.
  - External `credit_transactions`: `amount=1000000`, metadata includes `transaction_id=txn_01kfk5r8280kp6nanx34az55y0`.

## Step 21 - Full UI annual checkout validation (1,000,000 credits)
- **What:** Completed the `/pricing` annual subscription flow for 1,000,000 credits and verified yearly billing setup.
- **Why:** Confirms annual subscription creates an active Paddle subscription and ledger updates for the first yearly billing cycle.
- **How:**
  - Playwright checkout succeeded (sandbox card + recurring consent).
  - Paddle transaction: `txn_01kfk5xysh3v1h877sk9bq8tk4` (status `completed`, invoice `inv_01kfk5yjf5w3kjwvteyvmg4rew`, invoice `74722-10033`).
  - Paddle subscription: `sub_01kfk5yjdm9yys5wnfzsjwqe9x` (status `active`, interval `year`, `nextBilledAt=2027-01-22T15:42:42.282023Z`).
  - Line items: base `pri_01kfk27w2396j0yae9ech03pv8` (qty 1), increment `pri_01kfk4pccfmzq9xcvreekcz6h9` (qty 500), rounding adjustment `pri_01kfk5xyt96tyr10ae0dv3tjt2` (qty 1).
  - Supabase `credit_grants`: `credits_granted=12000000` (12×), `amount=255600`, `transaction_id=txn_01kfk5xysh3v1h877sk9bq8tk4`.
  - Supabase `billing_events`: `event_id=evt_01kfk5ym9d0m5zy991xm89sede`, `transaction.completed`, `credits_granted=12000000`.
  - External `credit_transactions`: `amount=12000000`, metadata includes `transaction_id=txn_01kfk5xysh3v1h877sk9bq8tk4`.

## Commands/scripts used (for reproducibility)
- `PYTHONPATH=backend python backend/scripts/create_paddle_pricing_v2.py`
- `PYTHONPATH=backend python backend/scripts/sync_paddle_pricing_v2.py`
- `PYTHONPATH=backend pytest backend/tests/test_pricing_v2.py backend/tests/test_billing.py backend/tests/test_trial_bonus.py`
- `PYTHONPATH=backend python backend/scripts/paddle_simulation_e2e.py --pricing-version v2 --user-email dmktadimiz@gmail.com --quantity 50000 --mode payg --interval one_time`
- `PYTHONPATH=backend python backend/scripts/paddle_simulation_e2e.py --pricing-version v2 --user-email dmktadimiz@gmail.com --quantity 75000 --mode subscription --interval month`
- `PYTHONPATH=backend python backend/scripts/paddle_simulation_e2e.py --pricing-version v2 --user-email dmktadimiz@gmail.com --quantity 250000 --mode subscription --interval year`
- Playwright UI checkout for one-time/monthly/annual 1,000,000 credits (sandbox card).
- Paddle MCP: `list_customers`, `list_transactions`, `get_subscription`.
- Supabase MCP SQL: `credit_grants`, `billing_events`, `credit_transactions` verification queries.

## Repo status / commits
- Latest commits pushed:
  - `38fe1db` feat: enforce paddle price quantity limits
  - `ed48182` docs: outline step 18 plan
  - `f83739a` docs: update handover and pricing migration
- No new commits in this session (docs-only updates pending).

## Notes / environment
- Backend server was restarted after Step 17 so webhook changes are live.
- `key-value-pair.txt` refreshed with a new Supabase token (not committed).
- Notification setting used for simulations: `ngrok2-all` -> `https://772d28b0ba31.ngrok-free.app/api/billing/webhook`.
- Playwright localStorage auth seeded via `key-value-pair.txt` for UI checkout validation.

## Files changed in this session
- `handover.md`
- `pricing-migration.md`
- `new-design.md`

## Open questions
- Re-run the annual Paddle simulation to confirm webhook grants match selected credits with the multiplier removed.
