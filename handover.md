# Handover

## Context
This repo is implementing the v2 pricing flow in parallel to existing billing. Work is tracked in `newpricing.md` (source of truth). The v2 flow uses `/api/billing/v2/*` endpoints and Supabase v2 pricing tables, while v1 billing remains intact. UI lives under `/pricing-v2` and is gated by `PRICING_V2=true`.

## What was completed in this session
### Step T0: Verify v2 pricing config in Supabase
- Backfilled `billing_pricing_config_v2.metadata.display_prices` from `metadata.source_config.display_prices`.
- This removed the `pricing_v2.display_prices_missing` warning and enabled the volume pricing table to render.

### Step T1: UI smoke test `/pricing-v2`
- Injected a valid Supabase session, opened `/pricing-v2`, verified the slider + quote calls succeed.
- Clicked "Buy Credits" and confirmed Paddle sandbox checkout opens (iframe overlay).
- Rounding adjustment visible in checkout summary (subtotal $7.40, rounding discount -$0.40, due $7.00).

### Step T2: Paddle webhook e2e simulation (v1)
- Confirmed Paddle notification destination `ngrok2-all` is active and points to the ngrok URL.
- Ran `backend/scripts/paddle_simulation_e2e.py` (v1) and confirmed `paddle_simulation_e2e.success` with a purchase credit grant written.

### Step T3: Paddle webhook e2e simulation (v2 tiers)
- Updated `backend/scripts/paddle_simulation_e2e.py` to support `--pricing-version v2` with mode/interval/quantity.
- Updated `backend/scripts/README-e2e-paddle-test.md` with v2 usage.
- Ran the v2 simulation for payg 2,000 credits; credit grant written successfully.
- Backend logged warnings for missing rounding metadata (`pricing_v2.rounding_description_missing`, `pricing_v2.discount_prefix_missing`) but the flow succeeded.

### Plan/docs updates
- `newpricing.md` updated for T0/T1/T2/T3 statuses and added T4 for annual subscription simulation.
- `PLAN.md` still points to `newpricing.md`.

## Tests run
- `source .venv/bin/activate && PYTHONPATH=backend python backend/scripts/paddle_simulation_e2e.py --user-email dmktadimiz@gmail.com --plan-key enterprise --notification-description ngrok2-all`
- `source .venv/bin/activate && PYTHONPATH=backend python backend/scripts/paddle_simulation_e2e.py --pricing-version v2 --user-email dmktadimiz@gmail.com --quantity 2000 --mode payg --interval one_time --notification-description ngrok2-all`

## Known warnings
- `backend/app/api/billing.py` is >600 lines.
- `app/lib/api-client.ts` is >600 lines.
- `pricing_v2.rounding_description_missing` and `pricing_v2.discount_prefix_missing` warnings during v2 checkout/simulation.
- Signup bonus 409 and trial bonus duplicate in frontend console for the test user (expected once claimed).

## Environment notes
- ngrok: `https://7f9a7449cd09.ngrok-free.app` -> `http://localhost:8001`.
- Paddle notification destination `ngrok2-all` active, trafficSource=all, includes transaction completed events.
- Backend running on `localhost:8001` (uvicorn); Next dev server on `localhost:3000` (if still running).

## Current status / remaining work
- T4: Run v2 annual subscription simulation to validate the 12x credit multiplier in webhook processing.
- Optional: add rounding metadata fields in `billing_pricing_config_v2.metadata` (`rounding_fee_description`, `rounding_discount_description`, `rounding_discount_code_prefix`) to remove warnings.
- Full test suite still not run (frontend + backend).

## Uncommitted/untracked
- `backend/scripts/paddle_simulation_e2e.py` (updated for v2 mode)
- `backend/scripts/README-e2e-paddle-test.md` (v2 usage added)
- `newpricing.md` (T0-T4 updates)
- `key-value-pair.txt` (updated session token)

## Key files touched
- `backend/scripts/paddle_simulation_e2e.py` (v2 simulation path)
- `backend/scripts/README-e2e-paddle-test.md`
- `newpricing.md`
