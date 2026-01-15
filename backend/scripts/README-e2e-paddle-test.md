# Paddle Simulation E2E Test (Backend)

This guide explains how to run the simulation-based Paddle E2E test script and how to troubleshoot it. The script is `backend/scripts/paddle_simulation_e2e.py`.

## What this script does
- Creates a Paddle transaction using your backend logic (no mocks).
- Triggers a Paddle webhook simulation to your ngrok-backed webhook URL.
- Verifies the webhook wrote a `credit_grants` purchase record in Supabase.

This lets you validate the end-to-end billing flow without manual checkouts.

## Prerequisites
- Backend is running and reachable from ngrok.
- ngrok forwards to `/api/billing/webhook`.
- Paddle sandbox API keys are set in env and match `PADDLE_STATUS`.
- The webhook secret in env matches the notification destination you will use.
- The test user exists in Supabase `profiles` and the plan exists in `billing_plans`.

## Notification destination requirements
The script uses the default description `ngrok2-all`. The target notification destination must:
- Point to your ngrok URL (e.g. `https://<ngrok>.ngrok-free.app/api/billing/webhook`).
- Be set to `traffic_source=all` (or `simulation`).
- Use a secret that matches `PADDLE_BILLING_SANDBOX_WEBHOOK_SECRET`.

If you create multiple destinations, pick the one you want with:
```
--notification-description <description>
```

## How to run (sandbox)
From repo root:
```bash
source .venv/bin/activate
PYTHONPATH=backend python backend/scripts/paddle_simulation_e2e.py \
  --user-email dmktadimiz@gmail.com \
  --plan-key enterprise
```

### Supported selectors
Exactly one of these is required:
- `--price-id` (Paddle price ID)
- `--plan-key` (from `billing_plans.plan_key`)
- `--plan-name` (from `billing_plans.plan_name`)

Optional flags:
- `--quantity` (defaults to 1)
- `--notification-description` (defaults to `ngrok2-all`)
- `--notification-setting-id` (bypass description lookup)
- `--timeout-seconds` (defaults to 90)
- `--poll-interval-seconds` (defaults to 2)
- `--include-inactive` (allow inactive plans)

## What success looks like
- The script logs `paddle_simulation_e2e.success`.
- A `credit_grants` row exists for the generated `transaction_id` (source=`purchase`).
- `credits_granted` matches `plan_credits * quantity`.

## Common failures and fixes
### 1) “notification setting cannot be used for simulation traffic”
Cause: the destination is platform-only.  
Fix: set `traffic_source=all` or `simulation` in Paddle.

### 2) “signature_mismatch” in backend logs
Cause: webhook secret does not match the destination.  
Fix: set `PADDLE_BILLING_SANDBOX_WEBHOOK_SECRET` to the destination’s secret and restart backend.

### 3) “No profile found for email …”
Cause: the user email does not exist in `profiles`.  
Fix: create or update the profile in Supabase.

### 4) “No matching billing plan found …”
Cause: the plan selector doesn’t match `billing_plans`.  
Fix: confirm `billing_plans` rows or use `--price-id` directly.

### 5) “Timed out waiting for credit_grants”
Cause: webhook did not reach backend or mapping failed.  
Fix:
- confirm ngrok is running and forwarding to `/api/billing/webhook`,
- check backend logs for `signature_mismatch` or `missing_user`,
- ensure the webhook payload contains `custom_data.supabase_user_id`.

## Why Paddle Events show only created/ready
The script creates a real transaction via the Paddle API but does not perform a real checkout.  
As a result, Paddle’s platform event log only shows:
- `transaction.created`
- `transaction.ready`

The simulated `transaction.completed` event is delivered through the Paddle **Simulation** system and appears under:
- Paddle → Simulations → Runs/Events, or
- Paddle → Notifications for the simulation destination.

This is expected behavior; a true platform `transaction.completed` requires a real payment.

## Notes
- The script is sandbox-only and should not be used with production keys.
- For production-like test runs, set `PADDLE_STATUS=production` and provide production keys, but only after approvals.
