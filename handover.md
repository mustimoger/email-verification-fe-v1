# Handover — External API First Refactor (Phase 1 + Phase 2 complete, Phase 3 backend usage removal done; frontend pending)

## Current Status Summary
- External API is the source of truth for verification data, tasks, metrics, and API keys.
- Supabase is for profiles + billing + append-only credit grants (purchases + signup bonus). `cached_api_keys` table still exists but is no longer used by the backend.
- Local credit enforcement removed from backend task/verify routes.
- Billing webhooks write purchase grants to `credit_grants` (no `user_credits` mutation).
- Signup bonus claim now runs after a confirmed session is established (non-blocking).
- API key cache/secret storage removed; `/api/api-keys` now proxies external keys directly and maps external `purpose` to integration IDs.
- Local usage tracking removed: `record_usage` is gone, Supabase `api_usage` reads removed, and `/api/usage/summary` now proxies external verification metrics. `/api/usage` list was removed.

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
  - `/api/api-keys` now proxies external keys directly with no cache fallback or secret storage.
  - External `purpose` values are mapped to integration IDs for UI display.
  - `/api/api-keys/bootstrap` was removed; auth provider no longer calls it.
  - Key preview is no longer persisted after creation (UI shows blank preview when external API does not return a secret).
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
- Phase 3 backend usage removal (external-only):
  - Removed local usage storage (`usage.py`, `usage_summary.py`, `fetch_usage`, `record_usage` call sites).
  - `/api/usage/summary` now uses `/api/v1/metrics/verifications` for totals/series; per-key summaries return unavailable (empty series + total null).
  - Added shared helpers for date-range parsing and verification metrics series mapping to reuse across overview/usage.
- Phase 3 frontend usage messaging:
  - `/api` usage chart now shows `ext api data is not available` for missing data points (per-key charts and external-metrics outages).
  - Totals keep numeric values when available; only missing totals show the explicit unavailable message.

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
- Files over 600 lines: `app/overview/page.tsx`, `app/verify/page.tsx`, `app/verify/utils.ts`, `app/api/page.tsx`.
- Local artifacts created for UI tests (untracked): `verify-upload.csv`, `verify-upload2.csv`, `verify-upload3.csv`, `verify-upload.xlsx`.
- `key-value-pair.txt` contains a fresh localStorage session token (do not commit).
- `package-lock.json` has a local change; user requested to keep it as-is.

## Key Files Updated (Recent)
- `backend/app/api/account.py` — purchase history now reads `credit_grants`.
- `backend/app/api/overview.py` — credits now nullable (external-only view).
- `backend/app/api/api_keys.py` — external-only API key proxying; purpose→integration mapping; no cache fallback.
- `backend/app/services/api_keys.py` — removed (cached API key storage eliminated).
- `backend/app/api/usage.py` — `/api/usage/summary` now proxies external metrics; per-key summary marked unavailable; `/api/usage` list removed.
- `backend/app/services/date_range.py` — shared RFC3339 parsing helper (used by api_keys + usage).
- `backend/app/services/verification_metrics.py` — shared verification metrics series mapping (used by overview + usage).
- `backend/scripts/paddle_simulation_e2e.py` — validates `credit_grants`.
- `backend/scripts/README-e2e-paddle-test.md` — updated success criteria.
- `app/components/auth-provider.tsx` — signup bonus claim after confirmed session.
- `app/components/auth-provider.tsx` — removed API key bootstrap call.
- `app/lib/messages.ts` — shared `ext api data is not available` constant.
- `app/lib/api-client.ts` — removed bootstrap API key helper.
- `app/api/page.tsx` — API key preview display now handles missing secrets cleanly.
- `refactor.md` — refreshed with current refactor status + gaps.

## Tests Run (Recent)
- No tests run after the Phase 3 backend usage removal + frontend usage messaging changes.

## Known Gaps / Risks
- CSV uploads fail with “Unable to parse CSV headers” in Verify; XLSX works. Needs investigation to unblock CSV uploads.
- Local dev backend on `localhost:8001` still returns 404s for POST `/api/credits/signup-bonus` and GET `/api/tasks/{id}/jobs` (health is 200). Code/tests confirm the routes exist, so the running server is likely an older build or different entrypoint—restart the backend to pick up current routes.
- `cached_api_keys` table remains in Supabase even though API key caching has been removed; drop it only after external-only key flow is verified in production.
- Phase 3 frontend handling is still pending: UI must show `ext api data is not available` for missing usage data points (including per-key charts until the external endpoint exists).
- Supabase `api_usage` table still exists and needs a separate migration to drop later.

## External API Gaps (Still Pending)
- Task list/detail do not include `file_name` (upload response includes filename).
- Credit usage/spend endpoints not documented yet; external API will compute balances from `credit_grants` once ready.
- Per-key usage chart endpoint is not available yet; UI must show `ext api data is not available` for per-key chart data.

## Next Steps (Ordered)
1) Run targeted tests: `backend/tests/test_usage_summary_route.py`, `backend/tests/test_usage_purpose_route.py`, and `tests/api-usage-utils.test.ts` (with venv activated).
2) Investigate CSV header parsing failure on Verify file uploads.
3) Confirm backend routes for `/api/credits/signup-bonus` and `/api/tasks/{id}/jobs` on the running dev server.
4) Re-run UI verification after backend route confirmation: manual jobs polling, history refresh, and CSV uploads.
5) Drop `cached_api_keys` table after external-only key flow is verified in production.
6) Drop Supabase `api_usage` table after Phase 3 frontend is verified.

## Process Reminders
- For any code changes: state plan first, update root plan/progress markdowns after completion, ask for confirmation before next task.
- Activate Python venv before running tests or scripts.
- Keep UI design unchanged while wiring backend.
