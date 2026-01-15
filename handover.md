# Handover — External API First Refactor (Phase 1 completed, credits shift in progress)

## Current Status Summary
- External API is the source of truth for verification data, tasks, metrics, and API keys.
- Supabase is for profiles + billing + append-only credit grants (purchases + signup bonus).
- Local credit enforcement (debit/reserve/release) has been removed from backend task/verify routes.
- Billing webhooks now write purchase grants to `credit_grants` and no longer touch `user_credits`.
- Signup bonus endpoint exists and signup flow attempts to call it once (non-blocking).

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
- Local credit enforcement removed:
  - `/api/verify`, `/api/tasks`, `/api/tasks/{id}`, `/api/tasks/{id}/download`, `/api/tasks/upload` no longer apply debits/reservations or return 402.
  - UI 402 parsing remains only for upstream errors.
- Credit grants write‑path updated:
  - Paddle webhook now upserts `credit_grants` (source=`purchase`, source_id=`transaction_id`) and keeps `billing_events` idempotency.
  - `billing_purchases` is still written for now (needed until purchase history is migrated).
- Signup bonus implemented:
  - New endpoint `POST /api/credits/signup-bonus` validates account age + email confirmation, then upserts `credit_grants` (source=`signup`, source_id=`user_id`).
  - Signup flow calls the endpoint once after successful signUp if a session exists; failures are logged and do not block signup.

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
- Files over 600 lines: `backend/app/api/tasks.py`, `app/verify/page.tsx`, `app/verify/utils.ts`.

## Key Files Updated
- `backend/app/api/billing.py` — webhook now writes to `credit_grants` only.
- `backend/app/api/credits.py` — signup bonus endpoint with eligibility checks.
- `backend/app/core/settings.py` — new signup bonus settings.
- `backend/app/main.py` — includes credits router.
- `app/components/auth-provider.tsx` — signup now calls `claimSignupBonus` (non‑blocking).
- `app/lib/api-client.ts` — added `claimSignupBonus` client.
- `backend/tests/test_billing.py` — updated for credit_grants.
- `backend/tests/test_signup_bonus.py` — signup bonus eligibility coverage.

## Tests Run
- `source .venv/bin/activate && pytest backend/tests/test_billing.py backend/tests/test_signup_bonus.py`
  - Result: 10 passed (pyiceberg/pydantic warnings only).
- Prior runs still relevant for task proxying/manual flow; see earlier entries in this handover history.

## Known Gaps / Risks
- **Signup bonus may be skipped if Supabase signUp returns no session.**
  - Current flow calls `/credits/signup-bonus` only when `supabase.auth.getSession()` returns a session.
  - If email confirmation is required, Supabase often returns `session: null`; bonus will not be claimed automatically after confirm/sign-in.
  - Decide whether to trigger the bonus on first confirmed sign‑in or after confirmation callback.
- **Account/overview credits still local.**
  - `/api/overview` and `/api/account/credits` still read `user_credits`; should be switched to “unavailable” until external API exposes balances.
- **Purchase history still local.**
  - `/account` purchase history uses `billing_purchases`; needs migration to `credit_grants`.

## External API Gaps (Still Pending)
- Task list/detail do not include `file_name` (upload response includes filename).
- Credit usage/spend endpoints not documented yet; external API will compute balances from `credit_grants` once ready.
- Mapping of external metrics to UI “credits used”/usage totals remains unconfirmed.

## Next Steps (Ordered)
1) Credits ownership shift — update `/api/overview` + `/api/account/credits` to return unavailable and show `ext api data is not available` in UI.
2) Credits ownership shift — migrate account purchase history to `credit_grants` (source=`purchase`) and remove dependence on `billing_purchases`.
3) Update Paddle E2E script + README to assert `credit_grants` instead of `user_credits`.
4) Resolve signup bonus trigger behavior for email‑confirmed flow (see risk above).
5) UI re‑verification: manual history/export + file upload summary + missing `file_name` messaging.

## Process Reminders
- For any code changes: state plan first, update root plan/progress markdowns after completion, ask for confirmation before next task.
- Activate Python venv before running tests or scripts.
- Keep UI design unchanged while wiring backend.
