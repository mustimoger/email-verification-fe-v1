# Handover — External API First Refactor (Phase 1 complete, credits shift + UX verification in progress)

## Current Status Summary
- External API is the source of truth for verification data, tasks, metrics, and API keys.
- Supabase is for profiles + billing + append-only credit grants (purchases + signup bonus).
- Local credit enforcement removed from backend task/verify routes.
- Billing webhooks write purchase grants to `credit_grants` (no `user_credits` mutation).
- Signup bonus claim now runs after a confirmed session is established (non-blocking).

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
- Runtime limits alignment:
  - `MANUAL_MAX_EMAILS` defaults were set to 10,000 in `backend/.env.example` and test fixtures, keeping upload size limits intact while aligning the manual/batch cap.
- API key caching removal (Phase 2):
  - `/api/api-keys` now proxies external keys directly with no cache fallback or secret storage, maps external `purpose` to integration IDs for UI display, and removes the `/api/api-keys/bootstrap` endpoint; key preview is no longer persisted after creation.
- Credits ownership shift (external-only view):
  - `/api/overview` and `/api/account/credits` return nullable `credits_remaining` with explicit logs.
  - Overview + Account UI show `ext api data is not available` for credits.
- Account purchase history moved to credit grants:
  - `/api/account/purchases` reads `credit_grants` (source=`purchase`), maps only valid rows, and logs missing/invalid fields.
- Paddle E2E script updated:
  - `backend/scripts/paddle_simulation_e2e.py` validates `credit_grants` (source=`purchase`) and `credits_granted` instead of `billing_purchases`/`user_credits`.
  - README updated to reflect the new success criteria and timeout messaging.
- Signup bonus trigger fixed:
  - Bonus claim now runs after confirmed-session checks, so users who confirm email before signing in still receive the bonus.

## UI Re-verification (Latest)
Session injected via `key-value-pair.txt` (confirmed user). Observations:
- `/overview`: renders, shows `ext api data is not available` for credits; no layout issues.
- `/verify` manual: submitted 2 emails, queued state shown; jobs polling to `/api/tasks/{id}/jobs` returned 404; manual export still succeeded with pending rows.
- `/verify` upload: CSV uploads failed header parsing; XLSX upload succeeded (column assignment → upload summary), and submission logged `verify/upload` success.
- `/history`: after refresh, rows displayed with `ext api data is not available` in Task/Total due to missing `file_name`.

## New/Updated Endpoints
- `POST /api/credits/signup-bonus`
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
- Local artifacts created for UI tests (untracked): `verify-upload.csv`, `verify-upload2.csv`, `verify-upload3.csv`, `verify-upload.xlsx`.
- `key-value-pair.txt` contains a fresh localStorage session token (do not commit).

## Key Files Updated (Recent)
- `backend/app/api/account.py` — purchase history now reads `credit_grants`.
- `backend/app/api/overview.py` — credits now nullable (external-only view).
- `backend/scripts/paddle_simulation_e2e.py` — validates `credit_grants`.
- `backend/scripts/README-e2e-paddle-test.md` — updated success criteria.
- `app/components/auth-provider.tsx` — signup bonus claim after confirmed session.
- `app/lib/messages.ts` — shared `ext api data is not available` constant.
- `refactor.md` — refreshed with current refactor status + gaps.

## Tests Run (Recent)
- `source .venv/bin/activate && pytest backend/tests/test_account_purchases.py`
- `source .venv/bin/activate && pytest backend/tests/test_signup_bonus.py`
- `source .venv/bin/activate && npm run test:auth-guard`

## Known Gaps / Risks
- CSV uploads fail with “Unable to parse CSV headers” in Verify; XLSX works. Needs investigation to unblock CSV uploads.
- Local dev backend on `localhost:8001` still returns 404s for POST `/api/credits/signup-bonus` and GET `/api/tasks/{id}/jobs` (health is 200). Code/tests confirm the routes exist, so the running server is likely an older build or different entrypoint—restart the backend to pick up current routes.
- `cached_api_keys` table remains in Supabase even though API key caching has been removed; drop it only after external-only key flow is verified in production.

## External API Gaps (Still Pending)
- Task list/detail do not include `file_name` (upload response includes filename).
- Credit usage/spend endpoints not documented yet; external API will compute balances from `credit_grants` once ready.
- Mapping of external metrics to UI “credits used”/usage totals remains unconfirmed.

## Next Steps (Ordered)
1) Investigate CSV header parsing failure on Verify file uploads.
2) Confirm backend routes for `/api/credits/signup-bonus` and `/api/tasks/{id}/jobs` on the running dev server.
3) Re-run UI verification after backend route confirmation: manual jobs polling, history refresh, and CSV uploads.

## Process Reminders
- For any code changes: state plan first, update root plan/progress markdowns after completion, ask for confirmation before next task.
- Activate Python venv before running tests or scripts.
- Keep UI design unchanged while wiring backend.
