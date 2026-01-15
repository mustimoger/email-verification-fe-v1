# Handover — External API First Refactor (Phase 1 completed, credits shift in progress)

## Current Status Summary
- External API is the source of truth for verification data, tasks, metrics, and API keys.
- Supabase is for profiles + billing + append-only credit grants (purchases + signup bonus).
- Local credit enforcement (debit/reserve/release) has been removed from backend task/verify routes.
- Billing webhooks now write purchase grants to `credit_grants` and no longer touch `user_credits`.
- Signup bonus is claimed after a confirmed session is established (non-blocking).

## Core Decisions (Must Preserve)
- If external data is missing, UI must show exactly: `ext api data is not available`.
- Manual copy‑paste verification creates a task (`POST /api/v1/tasks`) and reads results from `/api/v1/tasks/{id}/jobs`.
- `/api/v1/verify` remains realtime only and does not return task_id.
- This codebase should only **write** credit grants to Supabase; external API owns balances/usage.

## Work Completed (Key Changes)
- Phase 1 task proxying (external‑only):
  - `/api/tasks`, `/api/tasks/{id}`, `/api/tasks/{id}/download`, `/api/tasks/upload` proxy external API directly.
  - `/api/tasks/latest-upload(s)` returns 204 with log `ext_api_missing_file_name` because list/detail lacks `file_name`.
  - Manual verification uses `/api/tasks` + `/api/tasks/{id}/jobs`; local task caching removed.
- Credits overview/account now external-only:
  - `/api/overview` and `/api/account/credits` no longer read Supabase credits; `credits_remaining` is nullable with explicit logs.
  - Overview + Account UI show `ext api data is not available` for credits while keeping layout intact.
- Account purchase history moved to credit grants:
  - `/api/account/purchases` now reads `credit_grants` with `source=purchase`, maps only valid rows, and logs missing/invalid fields.
- Paddle E2E script updated:
  - `backend/scripts/paddle_simulation_e2e.py` now validates `credit_grants` (source=`purchase`) and `credits_granted` instead of `billing_purchases`/`user_credits`.
  - README updated to reflect the new success criteria and timeout messaging.
- Local credit enforcement removed:
  - `/api/verify`, `/api/tasks`, `/api/tasks/{id}`, `/api/tasks/{id}/download`, `/api/tasks/upload` no longer apply debits/reservations or return 402.
  - UI 402 parsing remains only for upstream errors.
- Credit grants write‑path updated:
  - Paddle webhook now upserts `credit_grants` (source=`purchase`, source_id=`transaction_id`) and keeps `billing_events` idempotency.
  - `billing_purchases` is still written for now (pending cleanup).
- Signup bonus implemented:
  - New endpoint `POST /api/credits/signup-bonus` validates account age + email confirmation, then upserts `credit_grants` (source=`signup`, source_id=`user_id`).
  - Bonus claim now runs after the confirmed-session check so email-confirmed users receive it even if signup returns no session.

## New/Updated Endpoints
- `POST /api/credits/signup-bonus` (new):
  - Requires JWT, allows unconfirmed auth but enforces email confirmation depending on config.
  - Returns `status: applied|duplicate` with `credits_granted`.
  - Returns 503 if bonus is not configured.

## Required Config (Signup Bonus)
Set these env vars (no defaults):
- `SIGNUP_BONUS_CREDITS`
- `SIGNUP_BONUS_MAX_ACCOUNT_AGE_SECONDS`
- `SIGNUP_BONUS_REQUIRE_EMAIL_CONFIRMED`

If any are missing, `/api/credits/signup-bonus` returns 503 and logs `credits.signup_bonus.misconfigured`.

## Repo State / Alerts
- Files over 600 lines: `app/overview/page.tsx`, `app/verify/page.tsx`, `app/verify/utils.ts`.

## Key Files Updated
- `backend/app/api/billing.py` — webhook now writes to `credit_grants` only.
- `backend/app/api/credits.py` — signup bonus endpoint with eligibility checks.
- `backend/app/core/settings.py` — new signup bonus settings.
- `backend/app/main.py` — includes credits router.
- `app/components/auth-provider.tsx` — signup bonus claim runs after confirmed-session checks (non‑blocking).
- `app/lib/api-client.ts` — added `claimSignupBonus` client.
- `backend/tests/test_billing.py` — updated for credit_grants.
- `backend/tests/test_signup_bonus.py` — signup bonus eligibility coverage.

## Tests Run
- `source .venv/bin/activate && pytest backend/tests/test_billing.py backend/tests/test_signup_bonus.py`
  - Result: 10 passed (pyiceberg/pydantic warnings only).
- Prior runs still relevant for task proxying/manual flow; see earlier entries in this handover history.

## Known Gaps / Risks
- None beyond the external API gaps below.

## External API Gaps (Still Pending)
- Task list/detail do not include `file_name` (upload response includes filename).
- Credit usage/spend endpoints not documented yet; external API will compute balances from `credit_grants` once ready.
- Mapping of external metrics to UI “credits used”/usage totals remains unconfirmed.

## Next Steps (Ordered)
1) UI re‑verification: manual history/export + file upload summary + missing `file_name` messaging.

## Process Reminders
- For any code changes: state plan first, update root plan/progress markdowns after completion, ask for confirmation before next task.
- Activate Python venv before running tests or scripts.
- Keep UI design unchanged while wiring backend.
