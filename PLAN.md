# Plan (carry forward)

- [ ] Current session execution order (requested) — implement in sequence and confirm before moving on.
  Explanation: Tracks the ordered backend wiring tasks for this session so progress is visible for handover.
  - [x] Step 1 — Confirm backend routes for `/api/credits/signup-bonus` and `/api/tasks/{id}/jobs` on the running dev server.
    Explanation: Code/test coverage confirms both routes exist, but the running server on `localhost:8001` still returns 404 for POST `/api/credits/signup-bonus` and GET `/api/tasks/{id}/jobs` (health is 200). This indicates the dev server is running an older build or different app entrypoint; restart the backend to pick up current routes.
  - [x] Step 2 — Align batch/manual verification limit to 10,000 via `MANUAL_MAX_EMAILS` (env + tests).
    Explanation: Updated the env example and test defaults to use `MANUAL_MAX_EMAILS=10000`, keeping upload behavior unchanged while making the manual limit consistent across settings/limits tests.
  - [ ] Step 3 — Phase 2: remove `cached_api_keys` usage and proxy external API keys directly.
    Explanation: External API becomes the source of truth for key lifecycle, removing local secret storage.
  - [ ] Step 4 — Phase 3: remove local usage tracking and proxy external metrics.
    Explanation: External metrics replace Supabase usage tables and record_usage calls.

- [x] Baseline setup — Next.js 14 (app router) with TypeScript, Tailwind, ESLint, npm, and alias `@/*`; React Compiler disabled. Clean base to layer dashboard features.
- [x] Layout shell + theming — Built shared sidebar/topbar shell per Figma: responsive drawer, notifications/profile, Nunito Sans, gradient surface. Sidebar uses `public/logo.png` (BoltRoute) image logo (matches `Screenshot_1.png`), not text. Avatar uses `public/profile-image.png` with fallback initials. Purpose: consistent chrome to reuse across pages.
- [x] Remove notifications icon from dashboard header — Bell icon is not needed; header should only show the profile menu.
  Explanation: Removed the notifications bell button and its badge state from `app/components/dashboard-shell.tsx`, leaving the top-right header focused on the profile menu only.
- [x] Fix Next/Image logo aspect warning — Set explicit width + auto height on the dashboard logo image so CSS sizing preserves the aspect ratio.
  Explanation: Replaced the Tailwind size class on the dashboard logo with inline style (`width: 140px`, `height: auto`) so Next can detect both dimensions and stop warning; the rendered size remains 140px wide.
- [x] Fix Recharts ResponsiveContainer warnings on Overview — Provide explicit positive chart height to avoid initial -1 sizing warnings.
  Explanation: Added a fixed `height={260}` prop to the Overview charts so Recharts sees a positive height before ResizeObserver reports actual width, eliminating the console warnings without changing layout.
- [x] Reject unsupported `user_id` on task creation/upload — Align backend payloads with external API by removing `user_id` from `/tasks` and `/tasks/batch/upload`.
  Explanation: External `/tasks` rejects `user_id` (400). Backend now blocks `user_id` query params with a clear 400 and no longer sends `user_id` in the external payload for manual tasks or uploads, while still recording tasks against the authenticated user locally.
- [x] Stabilize task upserts for TaskResponse payloads — Prevent 500s when external `/tasks` returns a minimal response without counts.
  Explanation: `TaskResponse` lacks `valid/invalid/catchall` counts, so `upsert_tasks_from_list` now uses safe attribute access and only reads metrics if present; added a unit test to ensure TaskResponse inputs upsert cleanly.
- [x] Overview content — Implemented Overview screen per Figma with typed mock data: stat summary cards, validation donut (Recharts Pie), credit usage line chart, current plan card, verification tasks table with status pills and month selector, profile dropdown. Responsive grid, lucide icons. This is the only built page; other nav items are marked unavailable.
- [x] Shadcn variant removal — Removed previous shadcn/ui variant to keep a single Tailwind implementation at `/overview` (root `/` redirects). Ensures one canonical path.
- [x] Overview stats: add Total Valid card — show all-time valid count from external verification metrics in the top stat cards.
  Explanation: Added a “Total Valid” stat card on `/overview` using `verification_totals.valid` from `/api/overview`, and adjusted the stats grid to five columns on large screens so the new card sits alongside the existing metrics.
- [x] GitHub workflow lock: add GitHub flow + multi-session timing rules to `AGENTS.md`.
  Explanation: Added a GitHub Flow checklist plus timing-based lock rules for shared files so multiple Codex sessions can coordinate without plan-file conflicts.
- [x] Dark mode plan — draft a step-by-step MVP-first plan in `drakmode-plan.md`.
  Explanation: Added `drakmode-plan.md` with a step-by-step MVP plan covering tokenization, theme state + persistence, UI toggle wiring, and required tests so newcomers can follow the dark mode rollout.
- [x] Redundant compute reduction plan Step 2 — classify redundancy candidates and Go dependencies in `redundant-compute-plan.md`.
  Explanation: Documented required vs removable compute paths and listed Go-side confirmations needed before removing any redundant work.
- [x] Redundant compute reduction plan Step 3 — avoid per-job iteration when metrics counts are available.
  Explanation: Updated `/api/tasks/{id}` and `/api/tasks/{id}/download` to use Go-provided metrics counts first, skipping redundant per-job loops when metrics already include verification status totals.
- [x] Redundant compute reduction plan Step 4 — run backend tests for metrics-first counts.
  Explanation: Created `.venv`, installed backend requirements, and ran targeted pytest for metrics-first count behavior; tests passed with dependency warnings.
- [x] Redundant compute reduction plan Step 5 — deploy to main after verification.
  Explanation: Deployment to main confirmed completed externally; no deploy action performed in this session.
- [x] Redundant compute reduction plan Step 6 backlog — documented post‑MVP removals with prerequisites.
  Explanation: Added a Step 6 backlog in `redundant-compute-plan.md` so future removals are listed with explicit Go confirmation requirements.
- [x] Redundant compute Step 6 — remove `refresh_details` lookup and rely on metrics-only counts.
  Explanation: `/api/tasks/latest-manual` no longer performs per-email refresh lookups, and `/api/tasks/{id}` + `/download` now rely exclusively on metrics counts; backend tests updated and re-run successfully.
- [x] Redundant compute Step 6 — remove upload parsing now that Go exposes `email_count`.
  Explanation: Uploads now rely on Go’s `email_count` from `/tasks/batch/upload` (and persisted counts from `/tasks/batch/uploads/:upload_id`), so local parsing was removed; credits are reserved using the Go count and tests cover the new flow.
- [x] Redundant compute Step 6 dependency — create a root-level task/progress doc in the Go repo to track the upload count contract work.
  Explanation: Created `batch-upload-count-plan.md` in the Go repo root with MVP steps, decisions, and scope so the upload count contract work is tracked for newcomers.

## Dark mode MVP implementation
- [x] Step 1 — Tokenize theme colors (light + dark) in `app/globals.css` and wire to Tailwind theme variables.
  Explanation: Added semantic color tokens for light/dark (surface, text, border, accent, ring, background) and mapped them into Tailwind theme variables; `body` background now uses a theme token so future components can rely on shared values.
- [x] Step 2 — Theme state + persistence + hydration-safe init.
  Explanation: Added a ThemeProvider with system-aware resolution and persistence, plus a pre-hydration script in `app/layout.tsx` to set `data-theme` early and prevent theme flash; logs are emitted for storage or system preference failures.
- [x] Step 3 — Wire the existing “Dark Mode” menu item to the theme toggle with clear state.
  Explanation: Wired the profile menu to display the current theme (system/light/dark) and added inline controls for switching themes without changing navigation behavior.
- [x] Step 4 — Replace hardcoded component colors with semantic tokens.
  Explanation: Replaced hardcoded hex colors with theme tokens across shared UI and page components, moved chart palettes/tooltip borders to CSS variables, and added global Tailwind color overrides so existing slate/white utilities resolve to semantic theme colors for dark mode support.
- [ ] Step 5 — Tests + manual verification (unit + integration).
  Explanation: Tests ran (`npm run test:overview`, `npm run test:history`, `npm run test:auth-guard`, `npm run test:account-purchases`) with the Python venv active. Manual verification via Playwright confirmed theme toggles (dark/light/system), `data-theme` persistence across `/overview`, `/verify`, `/api`, `/history`, `/integrations`, `/pricing`, `/account`, `/signin`, `/signup`, and chart contrast (see `overview-dark.png`). Remaining: human eye check for any first-load theme flash.
- [ ] Step 6 — Deploy to main after MVP verification.
  Explanation: Pending. Only after tests pass and manual verification is complete.
- [ ] Step 7 — Post‑MVP enhancements (optional).
  Explanation: Pending. Defer refinements until after MVP is stable in main.
- [x] Step 8 — Dark mode profile menu polish (pill overflow + label cleanup).
  Explanation: Removed the dynamic status text from the Dark Mode menu item and tightened the theme toggle pill sizing/gap so “System” fits cleanly without overflow while preserving the menu layout.
- [ ] Remaining pages — Verify, History, Integrations, API, Pricing, Account need to be built using the shared shell once Figma node details are provided. Use first-principles MVPs, no placeholders.
- [ ] API integration — Wire UI to FastAPI email verification backend once endpoint schemas/contracts are known. Replace mock data with typed fetch layer + error handling/logging; avoid hardcoded fallbacks.
- [x] External-API-first refactor plan doc — create `refactor.md` with a step-by-step transition plan to move dashboard data sourcing from Supabase to the external API (only keep Supabase for data the external API cannot provide).
  Explanation: Added `refactor.md` with phased tasks/subtasks, explicit external API dependencies (file_name, export fields, credit write-back), UI “data unavailable” handling, and the targeted end architecture so a newcomer can implement safely.
- [ ] External-API-first refactor Phase 0 — confirm external API dependencies (file_name, export detail fields, credit write-back, metrics mapping).
  Explanation: Added Phase 0 checkpoints to verify what the external API already provides so we can remove local caches without losing UI fields; will update each item with confirmed vs missing behavior before Phase 1.
- [x] Phase 0 — confirm file upload response includes filename, note task list/detail file_name gap.
  Explanation: `ext-api-docs/endpoints/batch_file_controller.md` confirms upload responses include `filename`, but `ext-api-docs/endpoints/task_controller.md` task list/detail schemas do not include `file_name`; UI should keep the field and show “data unavailable” until the API adds it.
- [x] Phase 0 — confirm export detail fields are admin-only for now.
  Explanation: `ext-api-docs/endpoints/email_controller.md` documents `/emails` and `/emails/{identifier}` as admin-only; user-scoped export detail fields are not available yet, so UI must show “data unavailable” until this is exposed.
- [x] Phase 0 — document missing/unclear external data and UI fallback message for ext API dev.
  Explanation: Updated `refactor.md` with an “IMPORTANT NOTE” section listing missing/unclear external API fields and requiring the UI to show `ext api data is not available` until those capabilities are delivered.
- [ ] Phase 0 — confirm external API writes credit usage/spend into Supabase.
  Explanation: Reviewed `ext-api-docs` and found no documented credit write-back or credits endpoints; external API dev is still waiting on the final Supabase schema, so credit tracking cannot be removed yet.
- [ ] Phase 0 — map external metrics to UI “credits used”/usage totals.
  Explanation: `ext-api-docs/endpoints/metrics_controller.md` exposes verification totals/series only (no explicit credit usage fields); mapping to UI credit labels remains unconfirmed and must be clarified with ext API dev to avoid misreporting.
- [x] Credits ownership shift (external API) — finalize Supabase credit grants table (Option A).
  Explanation: Added the `credit_grants` schema (documented in `refactor.md`) and `backend/app/services/credit_grants.py`, then applied the Supabase migration `create_credit_grants`.
- [x] Credits ownership shift — stop local credit enforcement and reservations.
  Explanation: Removed local debit/reserve/release logic from `/api/verify`, `/api/tasks`, `/api/tasks/{id}`, `/api/tasks/{id}/download`, and `/api/tasks/upload`, so the backend no longer returns 402 for local credit checks. Updated backend tests to assert the external-only flow; UI 402 parsing remains for upstream errors.
- [x] Credits ownership shift — update billing webhook + signup flow to write `credit_grants`.
  Explanation: Replaced webhook credit grants with `credit_grants` upserts (`source=purchase`, `source_id=transaction_id`) while keeping billing_events idempotency, added `/api/credits/signup-bonus` with account-age + email-confirm checks, and wired signup to call it once; added backend tests for purchase grant + signup bonus eligibility.
- [x] Credits ownership shift — update `/api/overview` + `/api/account/credits` to show external-only credits.
  Explanation: Removed Supabase credit lookups from overview/account endpoints, return `credits_remaining` as null with explicit logs, and updated the Overview + Account UI to display `ext api data is not available` while preserving existing layouts. Tests updated to assert the new nullable contract.
- [x] Credits ownership shift — update account purchase history to read from `credit_grants` (purchase source).
  Explanation: `/api/account/purchases` now pulls from `credit_grants` (source=`purchase`), maps only valid rows with structured logging for missing fields, and preserves the existing UI contract while removing the `billing_purchases` dependency for purchase history.
- [x] Credits ownership shift — update tests + scripts for the new credit grants flow.
  Explanation: Updated the Paddle E2E script + README to assert `credit_grants` (source=`purchase`) and `credits_granted` instead of `billing_purchases`/`user_credits`; backend credit-grant tests were already updated earlier.
- [x] Credits ownership shift — trigger signup bonus after confirmed sessions.
  Explanation: Moved the signup bonus claim to the confirmed-session check in the auth provider so users who confirm email before signing in still receive the bonus, removing the dependency on an immediate signup session.
- [ ] External-API-first refactor Phase 1 — remove task caching and proxy tasks directly to external API.
  Explanation: Phase 1 replaces Supabase task storage with direct external API calls and updates UI data mapping while preserving design; any missing fields must show `ext api data is not available` and be logged.
- [x] Phase 1 — backend tasks proxy (list/detail/download/upload) and remove Supabase task upserts/polling.
  Explanation: Task list/detail/download/upload now proxy the external API directly, Supabase upserts/polling were removed, and `latest-upload(s)` return 204 with a log noting missing `file_name`; credit reservations/manual results still write minimal task rows for internal state only.
- [x] Phase 1 — add `task_credit_reservations` table + service and move reservation reads/writes off `tasks`.
  Explanation: Added the Supabase `task_credit_reservations` table with a trigger-managed `updated_at`, created a dedicated service for reservation reads/writes, and rewired `backend/app/api/tasks.py` to use the new table so task reservations no longer depend on `tasks`.
- [x] Phase 1 — add `/api/tasks/{id}/jobs` proxy + external client types.
  Explanation: Added `TaskJobsResponse` + `list_task_jobs` to the external client and exposed `/api/tasks/{id}/jobs` with validation/logging; added backend tests to cover success and error handling so the manual flow can poll jobs once the UI is updated.
- [x] Phase 1 — switch manual verification flow to tasks/jobs (frontend wiring).
  Explanation: Verify manual copy‑paste now calls `/api/tasks` once, polls `/api/tasks/{id}/jobs` for results, builds CSV exports from job data, and persists the last manual task in localStorage for hydration; this removes per‑email `/verify` calls while keeping UI layout intact.
- [x] Phase 1 — retire `/api/tasks/latest-manual` after manual flow updates.
  Explanation: Removed the Supabase-backed latest-manual endpoint, its schema/type usage, and its backend tests so the manual path is fully external-only. This prevents stale manual hydrations now that `/verify` uses tasks/jobs with localStorage state.
  Completed steps:
  - Removed backend route + handler and dependent schema/type usage.
  - Removed client types/functions that called `/api/tasks/latest-manual`.
  - Deleted backend tests targeting the route.
  - Ran targeted backend tests for task proxying/related endpoints.
- [x] Phase 1 — backend cleanup of task cache services.
  Explanation: Removed `tasks_store`/`task_files_store` and moved shared metrics helpers into `task_metrics`. Manual verify no longer persists emails/results to Supabase, and Overview/debug now use external tasks/metrics with explicit logging when data is missing. Tests were updated to reflect the external-only flow.
  Completed steps:
  - Moved `counts_from_metrics` + `email_count_from_metrics` to `backend/app/services/task_metrics.py`.
  - Deleted `backend/app/services/tasks_store.py` and `backend/app/services/task_files_store.py`.
  - Removed Supabase manual persistence in `/api/verify` and `/api/tasks`.
  - Updated `/api/overview` + `/api/debug/tasks` to rely on external tasks/metrics only.
  - Updated overview/metrics/credit enforcement tests and ran targeted pytest.
- [x] Phase 1 — frontend History uses external task response format.
  Explanation: Updated History mapping to use external task metrics (verification_status + job_status) directly, removed reliance on Supabase fields, and ensured missing file_name is rendered as `ext api data is not available` without altering layout.
- [x] Phase 1 — History external mapping implementation (MVP) + missing-field messaging + tests.
  Explanation: Added metrics-aware mapping + status normalization in `app/history/utils.ts`, surfaced the required missing-field message, updated `tests/history-mapping.test.ts`, and ran `npm run test:history` with the Python venv active (output noted in handover).
- [x] Phase 1 — frontend Verify uses external task/verify responses.
  Explanation: Switched latest-upload hydration/refresh to `/api/tasks` (external task list), mapped external metrics into Verify summaries, and surfaced `ext api data is not available` for missing file/export detail fields while keeping the layout intact. Manual exports now rely on task jobs data with localStorage hydration.
- [x] Phase 1 — Verify external task wiring (MVP) + missing export detail messaging + tests.
  Explanation: Added task-based summary mapping in `app/verify/utils.ts`, disabled downloads when file name is missing, updated CSV export to emit `ext api data is not available` for missing detail fields, and ran `npx tsx tests/verify-mapping.test.ts` (after sourcing `.env.local`) with venv active.
- [x] Phase 1 — tests/verification for task proxying (remaining).
  Explanation: Added reservation/manual jobs flow tests and re-ran targeted pytest to validate task proxying coverage without regressions.
- [x] Phase 1 — add backend tests for `task_credit_reservations`.
  Explanation: Added `backend/tests/test_task_credit_reservations.py` to cover reservation upsert payloads, fetch success/miss, and error handling so the reservation table remains the single source of truth.
- [x] Phase 1 — add backend integration tests for manual task jobs flow.
  Explanation: Added `backend/tests/test_tasks_manual_jobs_flow.py` to exercise `/api/tasks` creation + `/api/tasks/{id}/jobs` polling with record_usage and reservation wiring using async ASGI clients.
- [x] Phase 1 — re-run targeted pytest for new reservation/manual-flow coverage.
  Explanation: Ran `pytest backend/tests/test_task_credit_reservations.py backend/tests/test_tasks_manual_jobs_flow.py backend/tests/test_tasks_jobs_proxy.py backend/tests/test_tasks_credit_reservation.py` with the venv active; all 12 tests passed (warnings only).
- [x] Phase 1 — update backend tests for external task proxy behavior.
  Explanation: Updated task list/latest upload/refresh tests to use async ASGI clients and new external-only behavior, removed upload polling test, and ran pytest for the affected suite (14 passed; warnings from pyiceberg/pydantic).
- [x] Session handover refresh — update `handover.md` with Phase 1 progress, test outcomes, and known test harness constraints.
  Explanation: Added a detailed Phase 1 handover including external-only task proxying, missing external data notes, test command/results, and the async ASGI client requirement to avoid TestClient hangs.
- [x] Session handover refresh — create a new root `handover.md` with full context, decisions, file changes, and next steps for the upcoming external-API refactor.
  Explanation: Added `handover.md` with decisions, dependencies, current repo state notes, and clear next steps for Phase 0/1 of the external-API-first refactor.
- [x] Session handover refresh — update `handover.md` with the latest external-API docs changes, manual task decision, and reservation table plan.
  Explanation: Updated `handover.md` with the new `/tasks/{id}/jobs` docs, the decision to move manual verification to `/tasks`, and the plan to replace task-based reservations with a minimal `task_credit_reservations` table.
- [x] Session handover — refresh `handover.md` with the credit-grants migration + external credit ownership decision.
  Explanation: Updated `handover.md` with the finalized `credit_grants` table (migration applied), external API credit ownership decision, and the ordered next steps for the credits shift.
- [ ] Investigate /api/verify 502 (external_api.request_error) and confirm external API reachability.
  Explanation: Observed request-level failures (no HTTP response). `EMAIL_API_BASE_URL` points to `https://email-verification.islamsaka.com/api/v1/`, and a direct curl from this host failed to connect on port 443, indicating the external service is unreachable from this environment; next step is to confirm service status/DNS/firewall and decide whether to update the base URL or network rules.
- [ ] Testing and staging — Add unit/integration coverage and deploy to staging after MVP pages and API wiring are in place; verify flows end-to-end.
- [x] Session handover — refresh `handover.md` with latest backend cleanup, tests, and next steps.
  Explanation: Updated `handover.md` with external-only overview/debug details, removed task cache notes, added recent commits, and captured targeted test runs so the next session can continue without re-discovery.
- [x] Session handover — refresh `handover.md` with latest credit-grants + signup-bonus wiring and remaining next steps.
  Explanation: Updated `handover.md` with the credit-grants purchase flow, signup bonus endpoint/config, known risks (signup session), and ordered next steps for the external-credits shift.
- [x] Refactor doc refresh — update `refactor.md` with latest credit_grants + signup bonus implementation details.
  Explanation: Updated `refactor.md` with the purchase grant write path, signup bonus endpoint/config, and the signup session gap note.
- [x] Overview backend alignment — Use credits-spent time series from Supabase tasks, add lifetime totals from external /metrics/verifications, and include latest Paddle plan + purchase date in /api/overview.
  Explanation: `/api/overview` now returns credits-spent totals/series from tasks, lifetime validation totals from external metrics (when available), and current plan data from `billing_purchases` + `billing_plans`, including “Multiple items” when a purchase has multiple price_ids.
- [x] Dashboard navigation latency — Reproduce the 60s sidebar navigation delay and "Failed to fetch" errors (DashboardShell/API page) using Playwright; capture console/network logs and identify the failing endpoints/base URL before changing code.
  Explanation: Using Playwright with the supplied localStorage token, navigated via sidebar to `/overview`, `/api`, `/history`, and `/pricing` on `http://localhost:3000`. No "Failed to fetch" errors appeared and navigation was fast. Network logs show frontend calling `http://localhost:8001/api/*` and all requests returned 200. Console warnings only (logo aspect). This does not reproduce the reported delay; please confirm the backend base URL/port used in your environment or provide a session that triggers the failure.
- [x] History page empty — Check Supabase `tasks` data for the current user to confirm whether history should be empty; report counts and latest rows before changing UI or backend.
  Explanation: Supabase shows 6 `tasks` rows for user `c105fce3-786b-4708-987c-edb29a8c8ea0`, all created at `2025-12-19 10:27:32+00` with `status`/counts and `api_key_id` null, and no `task_files` file_name. This means `/history` should not be empty when unfiltered, but key‑scoped views can be empty because `api_key_id` is missing.
- [x] History filter fix (code) — Default `/history` to an unfiltered view (“All keys”) so tasks with missing `api_key_id` are visible; keep key-specific filtering when selected and add minimal logging.
  Explanation: Added an “All keys” option (empty filter) and defaulted selection to unfiltered on key load; preserved key-specific filtering when a key is selected and logged the selected default. This allows Supabase tasks with null `api_key_id` to appear.
- [x] History behavior tests — Add/update tests for the unfiltered list, refresh button, cache reuse, and rows without `api_key_id`.
  Explanation: The key selector was removed, so tests should now cover the unfiltered list path, refresh behavior, cache reuse between navigations, and mapping for tasks even when `api_key_id` is null.
  Update: Added helper guards for cache reuse and refresh gating in History and extended mapping tests to cover cache reuse, refresh gating, and null `api_key_id` mapping.
- [x] Auth route prefix alignment — Ensure `/api/auth/confirmed` is served by the backend to match frontend base URL, and add a regression test.
  Explanation: Mounted the auth router at `/api` (keeping the existing `/auth` path) and added a backend test to confirm `/api/auth/confirmed` returns 200, eliminating 404s in the auth confirmation check.
- [x] Deprecation warnings cleanup — update Supabase Python client to remove `gotrue` deprecation and adjust httpx per-request cookies in tests.
  Explanation: Warnings only today; likely a dependency bump to `supabase`/`supabase_auth` and a small test change to set cookies on the client.
  Update: Bumped `supabase` to `2.27.0`, added `supabase_auth`, switched imports to `supabase_auth.types.User`, and updated auth tests to set cookies on the client while adding confirmed claims to avoid network lookups.
- [ ] Enhancements — Only after MVP + tests + staging verification.
- [ ] Investigate CSV header parsing failure on Verify file uploads.
  Explanation: Valid CSV files trigger “Unable to parse CSV headers” in the UI; XLSX uploads work. Needs follow-up to avoid blocking CSV uploads.
- [ ] Confirm backend routes for `/api/credits/signup-bonus` and `/api/tasks/{id}/jobs` on the running dev server.
  Explanation: UI verification observed 404 responses from `http://localhost:8001` for both endpoints; verify the backend instance is up-to-date and routes are mounted.
- [x] Session handover refresh — update `refactor.md` with latest refactor changes + open gaps.
  Explanation: Captured current credits/external-only changes, signup bonus trigger behavior, Paddle E2E update, and new UI verification gaps (CSV header parsing and 404s on signup-bonus/jobs) so the refactor doc stays the source of truth.
- [x] Session handover refresh — update `handover.md` with full context, explanations, and next steps.
  Explanation: Added a comprehensive handover including verification findings, risks, local artifacts, and ordered next steps for the next session.
- [x] Session handover — create root `handover.md` with current findings, changes, and next steps.
  Explanation: Added a new `handover.md` capturing dark mode progress, uncommitted changes, and the exact next steps/tests to run so the next session can resume without guessing.
- [x] Session handover — refresh `handover.md` after manual flow migration.
  Explanation: Updated `handover.md` with the task-jobs manual flow, localStorage hydration key, new jobs proxy/test coverage, and the remaining retirement/cleanup steps so the next session can continue without ambiguity.
- [x] Planning doc rename: `non-dashboard-api-usage-plan.md` -> `verify-plan.md`.
  Explanation: Renamed the external usage plan doc per request and updated references across planning docs to avoid broken links.
- [x] UI verification — `/api` usage views (per‑key/per‑purpose) with and without date range.
  Explanation: Verified locally using the session JSON from `key-value-pair.txt`. Per‑key view shows “Total: —” and “No usage data” both with no date range and with a valid RFC3339 range (no keys/usage for this user). Per‑purpose view loads options (Zapier, n8n, Google Sheets, Custom) and shows “Total: 0” both with no date range and with a date range. No blocking errors observed.
- [x] UI re-verification — `/api` usage views with real data (keys/tasks created).
  Explanation: Re-tested with refreshed session JSON. `/api` page loaded, but API Keys table still showed “No API keys yet” and the per-key selector only contained “All keys.” Per‑key totals stayed “—” with “No usage data,” and per‑purpose totals were `0` (options loaded: Custom, Zapier, n8n, Google Sheets). Console still logged a refresh-token warning (“Invalid Refresh Token: Already Used”), but the session remained active enough to load usage views; may need a brand‑new session if this persists.
- [x] UI re-verification — manual history/export + file upload summary + missing `file_name` messaging.
  Explanation: Manual verify shows queued state and export fallback works even when jobs polling fails; file upload flow succeeds with XLSX (column assignment → upload summary) and History rows render `ext api data is not available` for missing file names. Observed 404s for `/api/credits/signup-bonus` and `/api/tasks/{id}/jobs`, and valid CSV uploads failed to parse headers (XLSX works).

## Runtime limits alignment (batch vs upload)
- [x] Step 1 — remove `upload_max_emails_per_task` requirement and any upload email-count enforcement so file uploads are only size-limited.
  Explanation: Deleted the unused settings/env/tests wiring for `upload_max_emails_per_task` so startup no longer fails when it’s missing. Upload parsing already passes `max_emails=None`, so file uploads remain unlimited in email count while keeping the 10 MB size guard.
- [x] Step 2 — align batch/manual verification limit to 10,000 via `MANUAL_MAX_EMAILS` and reflect in env/test defaults.
  Explanation: Set `MANUAL_MAX_EMAILS=10000` in `backend/.env.example` and updated test defaults/expectations to match; manual limit tests that require smaller caps still override locally.

Notes for continuity: Python venv `.venv` exists (ignored). `node_modules` present locally (uncommitted). Root `/` redirects to `/overview`; main page at `app/overview/page.tsx`. A dev server may still be running on port 3001 (see handover if needed). External email verification API is reachable at `https://email-verification.islamsaka.com/api/v1/`; it accepts Supabase JWTs via `Authorization: Bearer <token>`. External usage endpoints return lifetime totals when no `from`/`to` is provided, and range totals when `from`/`to` is provided (per external dev). Supabase seeded for user `mustimoger@gmail.com` with credits and cached keys.

## Data ownership & key logic (current vs intended)
- Supabase (app-owned): profiles, user_credits, api_usage (filterable by api_key_id), cached_api_keys (key_id + name, no plaintext). No tasks stored locally.
- cached_api_keys now includes `key_plain` (server-side use) and `integration` metadata for user-selected platforms.
- External API (external-owned): tasks, jobs, API keys are scoped by the Bearer token used (Supabase JWT or API key).
- Current behavior: backend forwards the caller’s Supabase JWT for external `/tasks`, `/verify`, and `/api-keys`. Dashboard key bootstrap is disabled. `/api` filters external key list to those cached for the signed-in user.
- Intended: each user gets their own external API key(s) (per integration), stored in `cached_api_keys`, and proxy calls use the user’s JWT; internal “dashboard” key remains hidden from `/api`.

## Step-by-step plan for per-user key logic
1) DONE — Filter UI now: hide any dashboard/internal key from `/api` listings/selectors; key creation options limited to Zapier, n8n, Google Sheets, Custom (no Dashboard). Update usage selector to show “All keys” + user-owned keys only.  
   Explanation: `/api` now filters out keys named `dashboard_api`, defaults the usage selector to user-owned keys or “All keys”, and creation is restricted to integration/custom names with a custom-name field when needed to prevent exposing internal keys.
2) DONE — Resolve user key per request in backend proxy: before calling external `/tasks` or `/verify`, fetch the user’s external key from `cached_api_keys` (by type/name). If missing, create via external API using the dev master bearer, store in `cached_api_keys`, and use that key for the call.  
   Explanation: Added per-user resolver that looks up a cached key (now storing `key_plain`), creates one if absent, and returns an ExternalAPIClient bound to that secret. Usage logs now tag `api_key_id` for these calls.
3) DONE — Hidden dashboard key: provision/use a per-user key named `dashboard_api` (or similar) for manual/file verification flows; do not return it from `/api` routes.  
   Explanation: Tasks/verify now resolve a per-user `dashboard_api` key and use it for all external calls; `/api` listing rejects dashboard keys and creation rejects the reserved name.
4) DONE — Integration/custom keys: allow creating/listing/revoking user-specific keys for Zapier/n8n/Google Sheets/Custom, caching ids/names (and secrets) in Supabase. Usage filter now defaults to “All keys” and lists only user-visible keys. Dashboard key stays hidden and reserved.  
   Explanation: `/api` UI defaults usage to “All keys”; key creation restricted to integration/custom; backend caches created key secret and rejects dashboard name; listing filters out dashboard keys. History remains tied to the per-user dashboard key (not filterable by integration).
5) DONE — Logging and tests: added structured logs in key resolution; added backend tests to cover resolve path (create vs cached), dashboard key hiding, creation caching secrets, and reserved-name rejection.  
   Explanation: `backend/tests/test_api_keys.py` validates per-user key creation/caching and filters, ensuring dashboard key stays hidden and secrets are cached; logging already present on resolve/create paths.

### Next options
- Wire retention/cleanup: removed (uploads are external).
- Link integrations: add actionable links/CTAs for Zapier/n8n/Google Sheets and per-integration guides; surface integration metadata in UI where helpful.
- Expand history filtering: add richer status mapping and pagination; consider date range filters aligned with usage filters.
- Auth enhancements: password reset flow and improved session refresh handling.

## Auth onboarding
- [x] Supabase auth wiring — Added browser Supabase client with env validation, auth provider/context, and auto-attached `Authorization: Bearer` token on all API requests.  
  Explanation: Ensures FastAPI receives the Supabase JWT and prevents silent unauthenticated calls; fails fast if public Supabase env vars are missing. Wrapped app with `AuthProvider` for session awareness.
- [x] Signup and login screens — Built `/signup` and `/signin` per Figma (blue organic background, centered card, inputs, checkbox, CTA links) using existing Tailwind stack. Forms call Supabase email/password signup/signin, gate on required fields/terms, and redirect to `/overview` on success.  
  Explanation: Provides user-facing auth entry, aligns with design (node `65:3385` signup, `65:3343` signin), and logs/returns errors instead of hardcoded fallbacks. Remember/terms checkboxes are functional; “Forget Password?” is a placeholder link for future reset flow.
- [x] Auth-gated data fetching — Guarded dashboard API calls until a session exists and show friendly prompts instead of 401s. Added JWKS-based Supabase token validation with `audience=\"authenticated\"` for RS256/HS256 and correct JWKS URL (`/.well-known/jwks.json`).  
  Explanation: Prevents unauthorized calls and fixes “Invalid or expired authentication token” caused by audience/JWKS validation gaps. Pending: adjust `test_settings_missing_env_raises` separately.
- [x] Dashboard shell gating — Sidebar/topbar/footer now render only when authenticated; shell redirects to `/signin` and returns `null` for signed-out users. Added shared `resolveAuthState` helper and a unit test for guard logic.  
  Explanation: Ensures signed-out users only see auth pages (per screenshot_1), eliminating dashboard chrome flashes when no session is present.
- [x] Overview auth fetch gating — Ensure `/overview` and `/integrations` calls only fire once a Supabase session is established (no unauthenticated requests after redirect).  
  Explanation: Overview now reads `session` + `loading` from `useAuth` and skips both fetch effects until the session is hydrated, preventing 401s and `api.request_failed` logs caused by pre-auth requests.
- [x] Require confirmed email before sign-in/session use.
  Explanation: Added a Supabase Auth admin check in `get_current_user`, exposed `/auth/confirmed`, and updated the client to sign out unconfirmed sessions and surface the backend message on the sign-in screen so unverified users cannot access APIs or the dashboard.
- [x] Email confirmation enforcement tests.
  Explanation: Add unit/integration tests to cover confirmed vs unconfirmed access and ensure sign-in messaging is triggered; not implemented yet.
  Update: Added auth tests to cover confirmed claims bypass, confirmed lookup fallback, and unconfirmed denial to ensure enforcement behavior stays stable without live Supabase calls.

## Data flow alignment (frontend reads Supabase, backend proxies external)
- [x] Harden `/api/tasks` fallback so Supabase stays primary: if Supabase is empty and external `/tasks` fails, return an empty list without crashing or leaking upstream errors; keep logging. Add a regression test. No schema change expected.  
  Explanation: Guarded unresolved client use, always return a safe empty TaskList when external fails/returns none, and added `test_tasks_list_external_failure.py` to prevent UnboundLocal/500 regressions.
- [x] Provision hidden per-user dashboard key early (post-signup/signin) and cache it in Supabase so manual/file verification never attempts creation during history fetch; backend remains the sole caller to the external API. Frontend keeps using Supabase-backed data for UI.  
  Explanation: Added `/api/api-keys/bootstrap` to resolve/create the reserved `dashboard_api` key without returning secrets, and call it once after session is established in `AuthProvider`. Includes regression test `test_dashboard_key_bootstrap.py`.
- [x] Overview page wired to Supabase-backed overview data: aggregates validation counts from cached tasks, normalizes statuses, and maps recent tasks safely with tests.  
  Explanation: Added mapping helpers and tests for overview (status/date/count aggregation), switched Validation/Stats to use Supabase task counts, and rely solely on backend `/api/overview` data.
- [x] API keys list fallback to Supabase cache: when external `/api-keys` fails (e.g., auth unavailable), return cached user keys from Supabase (filtering dashboard unless requested) instead of 5xx.  
  Explanation: Added cache-based fallback in `/api/api-keys`, with tests to cover internal-key filtering and include_internal behavior.
- [x] External API diagnostic script — Added config-driven runner `backend/tests/external_api_test_runner.py` to hit `/tasks`, `/verify`, `/tasks/batch/upload`, and `/api-keys` with the user JWT from `key-value-pair.txt`, probing raw vs Bearer auth.
  Explanation: Run with `source .venv/bin/activate && python backend/tests/external_api_test_runner.py`; defaults use `backend/tests/external_api_test_config.json` and `EMAIL_API_BASE_URL`.
- [x] Webhook alternative noted — If external API later provides global usage/task webhooks, plan is to consume them (with polling as fallback). See `verify-plan.md`.

## Current sprint: Initial Verify page (first state only)
- [x] Pull Figma specs for the initial Verify page (layout, spacing, colors, interaction notes) via Figma MCP to drive implementation.  
  Explanation: fetched design context for node `51:306` (Verify initial page) and captured screenshot via Figma MCP (`get_screenshot`, see local session). Confirms layout: shared sidebar/topbar identical to Overview plus footer links (“Privacy Policy & Terms”, “Cookie Pereferences”), manual email input card with textarea + VERIFY button, results panel, file upload section with drag/drop and Browse button, light gray background.
- [x] Implement `/verify` using the shared sidebar/topbar shell: manual entry form + results display + file upload dropzone UI per design; enable nav entry (Overview shell reuse). Include footer per design.  
  Explanation: Refactored shared dashboard shell (sidebar/topbar/footer) and reused it for Overview + new `/verify`. Nav now links to `/verify` (others disabled). Verify page matches Figma: manual email textarea with VERIFY CTA, results panel (shows parsed emails as pending), file upload dropzone with drag/drop + Browse, and footer links. Added front-end limits (max 5 files, 5 MB each) and log events for manual and upload flows; no backend calls yet.
- [ ] Add basic client-side behavior/logging and minimal tests covering form state/validation wiring; leave clear integration hook for FastAPI when contracts arrive. (Logging and parsing in place; automated tests still needed.)
  Explanation: Added verify mapping unit tests (`tests/verify-mapping.test.ts`) covering upload mapping and task-detail result mapping; form state/validation tests still outstanding.
- [ ] Summarize changes and outcomes for newcomers; pause for confirmation before proceeding to popup flow/second Verify state.
- [x] Verify backend wiring: ingest external task metrics into Supabase on `/tasks` list/create/upload so manual/file flows surface real counts without placeholder data.
  Explanation: Added task metrics parsing (`verification_status`, `total_email_addresses`) to map counts into Supabase tasks; tests added and `pytest backend/tests` passed.
- [x] Frontend verify wiring (manual): replace per-email placeholder results with task detail results from `/api/tasks/{id}` and show statuses from the backend.
  Explanation: Manual verify now creates a task, shows pending rows, and polls `/api/tasks/{id}` to map real job statuses into the results list; pending is shown until jobs arrive.
- [x] Frontend verify wiring (file upload): replace synthetic per-file counts with backend task counts, and define a clear mapping between uploaded files and task records.
  Explanation: Upload flow now uses `/tasks/batch/upload` response `filename` + `task_id` to map each file to its task, fetches task detail per task id, and builds the summary from real task data without time-based selection.
- [x] File upload mapping update: use `task_id` from `/tasks/batch/upload` response to fetch task detail/counts per file; remove any time-based selection.
  Explanation: Removed task list polling/time-based mapping; summary counts now come from task detail linked directly by upload response `task_id`. Fixed the stale `deriveUploadSummary` reference in the file-chip removal flow.
- [x] External-native file upload: forward each file to external `/tasks/batch/upload` with `email_column` derived from the user’s manual mapping (column letter -> 1-based index string), skip local parsing/dedupe, and keep existing UI mapping flow unchanged.
  Explanation: Upload now proxies the file to the external API with `email_column` (1-based index), ignores local dedupe/row flags (logs this), and still stores minimal metadata for History without parsing emails. External API now supports deduplication server-side, so skipping local dedupe does not risk double counting.
- [x] Validate `task_files` schema (nullable `source_path`/`output_path`/`email_column_index`) before removing local file storage; adjust persistence to avoid invalid writes.
  Explanation: Applied migration to make `task_files.source_path` nullable, then removed local file persistence so uploads are fully external-native.
- [x] Manual verify limit: add `MANUAL_MAX_EMAILS` to backend settings; enforce in `/api/tasks` (manual copy/paste) and surface to UI via runtime limits endpoint.
  Explanation: Added `manual_max_emails` setting and enforcement in `/api/tasks`, plus runtime UI validation from `/api/limits` with clear errors when limits can’t be loaded.
- [x] Runtime limits endpoint: add `/api/limits` (auth-required) returning `manual_max_emails` and `upload_max_mb`; UI must fetch at runtime and avoid hardcoded values.
  Explanation: `/api/limits` now returns upload and manual limits with auth; Verify page loads limits on mount and uses them for manual and upload validation (no hardcoded sizes).
- [x] Supabase task_files table: persist file metadata per task (user_id, task_id, file_name, source_path, column mapping, flags) for History and downloads.
  Explanation: Added `task_files` table with file metadata + column info and indexes to link tasks to uploads for History and download output generation.
- [x] Multi-sheet handling: reject Excel files with multiple sheets and return a clear error to split into single-sheet files.
  Explanation: Client-side column reader already blocks multi-sheet spreadsheets to keep column mapping deterministic.
- [x] External-native download: proxy external `/tasks/{id}/download` (format=csv|txt|xlsx) and stop generating local output files.
  Explanation: Download proxies the external response (content + Content-Disposition); local output generation/caching removed.
- [x] Frontend verify: send column mapping + header/dedupe flags with file uploads; validate mapping before submit; wire download action to new backend endpoint.
  Explanation: Verify now reads columns locally, sends `file_metadata`, validates mapping before upload, and triggers downloads from the summary using `/api/tasks/{id}/download`.
- [x] History filenames: use task_files metadata to display file names for file-based tasks in History.
  Explanation: Tasks now attach `file_name` from `task_files`, and History mapping prefers it for labels.
- [x] Verify flow audit (manual + upload wiring) to capture remaining placeholders and mapping gaps.
  Explanation: Manual verify polls `/api/tasks/{id}` and maps job statuses; file uploads map counts by `task_id` returned from the upload response and no longer rely on time-based matching.
- [x] Persist latest file-upload summary on `/verify` after reload (server-driven, manual refresh).
  Explanation: External API does not expose file names in task lists or a "latest upload" endpoint, so `/verify` must hydrate from Supabase `task_files` metadata and allow manual status refresh without background polling.
  Update: Added `/api/tasks/latest-upload` with backend tests, and `/verify` now hydrates the latest file-based task on load with a manual refresh button plus frontend mapping tests.
- [x] Persist latest manual batch on `/verify` and hydrate the Results card from `/tasks/{id}` jobs only (manual batches only).
  Explanation: Manual verification results should survive reloads by fetching the latest manual task and mapping job emails to statuses; no local storage or placeholders.
  Update: `/verify` now hydrates from localStorage (`verify.manual.state`) and maps results from `/api/tasks/{id}/jobs`; `/api/tasks/latest-manual` has been removed.
- [x] Add `/api/tasks/latest-manual` (Supabase-backed) and tests.
  Explanation: Manual tasks are identifiable by missing file metadata; expose a lightweight endpoint so the UI can rehydrate without external API polling.
  Update: Endpoint and related store/test coverage were removed after migrating manual hydration to task jobs + localStorage.
- [x] Add Results refresh button for manual batches and remove background polling.
  Explanation: Per UX requirement, status updates are user-triggered only.
  Update: Results card now includes a “Refresh status” button that fetches the latest manual task and updates the results without polling.
- [x] Expire manual Results when the task completes (hide after refresh/hydration).
  Explanation: Completed manual batches should disappear from the Results card to avoid stale UI.
  Update: Manual results are cleared when the latest task is complete during hydration or refresh.
- [x] Replace single latest-upload summary with a latest-N uploads list (N=6), newest-first, persisted across reloads.
  Explanation: The upload status card should show the most recent file upload tasks (not just one) and remain stable across page loads without layout disruption.
  Update: `/verify` now hydrates a list of the latest file uploads and renders up to the configured limit.
- [x] Add backend endpoint to return latest-N file uploads with counts + metadata (Supabase-backed).
  Explanation: Supabase task_files metadata is the source of truth for file upload history; expose a list endpoint to hydrate the verify summary list.
  Update: Added `/api/tasks/latest-uploads` backed by `fetch_latest_file_tasks` and configurable `LATEST_UPLOADS_LIMIT`.
- [x] Update verify summary hydration to render latest-N uploads and refresh all tasks on demand.
  Explanation: Manual refresh should update the status/counts for every listed upload and re-render the table.
  Update: Refresh now fetches details for each listed upload before rebuilding the summary table.
- [x] Update the validation donut to summarize only the most recent upload, with a label indicating which task/file it represents.
  Explanation: Keep the donut focused on the newest file upload while the table shows the full latest-N list.
  Update: Donut aggregates come from the newest upload and the card labels the latest file.
- [x] Add `LATEST_UPLOADS_LIMIT` to backend `.env` and `.env.example` so the API boots after restart.
  Explanation: latest upload list is now required by settings; missing env blocks uvicorn startup and causes 400s via route fall-through.
  Update: Added `LATEST_UPLOADS_LIMIT=6` to `backend/.env.example` (documented default). `backend/.env` already contained it locally, so no further change needed there.
- [x] Fix `taskIds is not defined` in file upload summary logging.
  Explanation: Upload logging should only reference defined variables to avoid UI errors after file upload.
  Update: Updated Verify upload logging to derive `task_ids` from the resolved upload links so the console payload is always defined.

## Redundant compute reduction
- [x] Create a structured plan for removing redundant compute against the Go service.
  Explanation: Added `redundant-compute-plan.md` with an inventory of candidates, MVP-first steps, and testing/verification gates so newcomers can follow the sequence.
- [x] Prevent `/api/tasks/{task_id}` from capturing latest-* routes (UUID-only task IDs).
  Explanation: `/api/tasks/latest-*` must resolve to the internal endpoints; UUID path params avoid collisions and prevent external 400s.
  Update: Updated `/api/tasks/{task_id}` and `/api/tasks/{task_id}/download` to accept UUIDs only and consistently pass `str(task_id)` through credit/logging and external calls.
- [ ] Fix `taskIds is not defined` in file upload summary logging.
  Explanation: Upload logging should only reference defined variables to avoid UI errors after file upload.
- [x] Fix manual Results rehydration guard on `/verify` reloads (Strict Mode).
  Explanation: `latestManualHydratedRef` is set before fetching; in Strict Mode the first run is cleaned up and the second run bails, so Results never hydrate. Move the guard to lock only after a successful hydrate and add a regression test.
  Update: Added a shared hydration guard helper, moved the lock to the post-fetch path, and added verify-mapping tests that assert hydration is allowed on first load.

## Next: Second Verify state (post-upload)
- [x] Pull Figma specs for second Verify state via Figma MCP; captured screenshot (node `64:75`) showing results table + validation donut. Footer and shell unchanged.
- [x] Implement second Verify state UI: render verification summary (total emails, upload date), results table with per-file stats + download/pending badges, validation donut chart, keeping existing shell/footer. Reuse existing Verify route with conditional state.  
  Explanation: `/verify` now conditionally renders the post-upload state when files are selected: summary header, per-file stats table with download/pending pills, validation donut chart using aggregated counts, plus upload/reset actions. Data is derived deterministically from selected files (size/name) with console logs; clearly marked for backend replacement. Dropzone remains for pre-upload state; shell/footer unchanged.
- [ ] Update PLAN.md notes and await confirmation before moving to further pages or backend wiring.

## Upcoming: Verify flow popups
- [x] Pull Figma specs for Popup 1 (file verify popup stage 1) via Figma MCP (node `60:54`) and captured screenshot. Design: modal with pill chips for selected files, total email count notice, primary CTA “VERIFY EMAILS”, link to go back to upload.
- [x] Pull Figma specs for Popup 2 (file verify popup stage 2) via Figma MCP (node `60:86`) and captured screenshot. Design: modal for column mapping (per-file dropdowns for email column), two yes/no radio questions, CTA “PROCEED”, back link.
- [x] Implement both popups in Verify flow: trigger after file selection and before showing post-upload state; allow going back to upload; collect mapping + flags and feed into summary state. Follow shared shell/modal styling; no hardcoded fallbacks.  
  Explanation: `/verify` now stages file upload -> Popup 1 (file chips + total count + verify CTA) -> Popup 2 (column mapping per file, two yes/no radios) -> summary table/donut. State machine `flowStage` controls views; reset returns to upload. Mapping/flags stored and logged for backend handoff. Dropzone and manual input remain intact.

## History page
- [x] Pull Figma specs via MCP and capture screenshot (node `65:5`). Design: shared shell/footer, table listing history rows with columns DATE, FILENAME/TOTAL, VALID, INVALID, CATCH-ALL, ACTION (Download/Pending pills), pagination note “Showing 1-09 of 78”.
- [x] Implement History page UI per Figma using shared shell; align nav highlight, spacing, and pills per design. Use typed sample data; wire to backend later.  
  Explanation: Added `/history` with table layout (Date, Filename/Total, Valid, Invalid, Catch-all, Action) using shared shell/footer. Status pills for Download/Pending mirror design. Uses typed sample rows and formatting helpers; ready for backend data swap.
- [x] History filtering/pagination — Added API key selector (includes dashboard key) to scope tasks per key; supports paginated fetch (`PAGE_SIZE=10`) with Load more, richer pending status detection, and count display.  
  Explanation: History now calls backend with `api_key_id`, shows integration labels in the selector, and maps pending/processing/started/queued to the Pending pill. Load-more uses offset pagination and honors total count when provided.
- [x] History download action — Wire the Download pill to `/api/tasks/{id}/download` for file-based tasks with minimal error feedback.  
  Explanation: History now triggers verified file downloads using task id + stored file name and keeps Download disabled when no file is available.
- [x] History download proxy — Switch `/api/tasks/{id}/download` to proxy external downloads directly (no local output generation), and add backend tests.  
  Explanation: The download route now validates file-backed tasks and streams external download content with passthrough headers; local output writing is removed. Added `backend/tests/test_tasks_download_proxy.py` to cover missing-file and success cases.

## Integrations page
- [x] Pull Figma specs via MCP and capture screenshot (node `65:339`). Design: shared shell/footer, three integration cards (Zapier, n8n, Google Sheets), text “More coming soon...”.
- [x] Implement Integrations page UI per Figma using shared shell; render logo cards and supporting text; keep layout responsive. Wire real integration links later.  
  Explanation: Added `/integrations` with three logo cards (Zapier, n8n, Google Sheets) and CTAs linking to `/api` with the selected integration prefilled; copy clarifies keys are universal and integration choice only tags usage. Assets under `public/integrations/*.png`; shared shell/footer reused. Updated n8n card copy to emphasize keys are universal and can be used anywhere while selection just tags usage.
- [x] Dynamic integration config + modal key creation — Added backend integration config (`backend/config/integrations.json` + loader), `/api/integrations` endpoint, Supabase indexes on `cached_api_keys` (user+integration/name), and validation of integration ids on key creation. Frontend `/api` now fetches integrations and uses a popup to create keys with name + integration tags; API keys table shows integration column. Keys remain universal; tagging is for usage reporting. Additional platforms can be added by editing the JSON config without code changes.
  Explanation update: fixed integration config loader path to read `backend/config/integrations.json` so integrations populate in the modal.

## API page
- [x] Implement simplified API page: card 1 with API keys table (name, masked key, status pill, edit action); card 2 with usage controls (API key dropdown, date range, actions) and line chart placeholder with mock data/empty state. Shared shell/footer reused; console logs for future backend wiring.
- [x] Update API key display to show masked secret preview (first 3 chars + `***`) instead of masked key ID.
  Explanation: Backend now reads cached `key_plain` and derives `key_preview`, returning it alongside API key summaries. UI uses `key_preview` for the table and selector, avoiding ID display. Ran `pytest backend/tests/test_api_keys.py` and `tests/api-usage-utils.test.ts`.
- [x] Date range input — switched to native date inputs and convert selected dates to RFC3339 (`from`/`to`) with validation/logging.
  Explanation: `/api` now uses date pickers and converts to start/end‑of‑day UTC ISO timestamps; invalid/partial ranges surface an error and log `api.usage.range.invalid`.
- [x] Usage chart — load `/api/usage/summary` and render a real line chart when series data exists.
  Explanation: `/api` now fetches `/api/usage/summary` alongside usage totals and renders a single‑line chart from the returned series.
- [ ] API page verification — Tests for date range conversion added; UI chart verification pending due to session refresh token errors.
  Explanation: `tests/api-usage-utils.test.ts` now covers RFC3339 range conversion. Playwright verification of `/api` chart was blocked because the stored session caused `Invalid Refresh Token: Already Used` and redirected to `/signin`. A fresh session is required to confirm the chart renders in the UI.
- [ ] Detailed API page plan now tracked in `api-plan.md`.
- [ ] API usage date range — Switch to native date inputs, validate/convert to RFC3339 for `from`/`to`, and log invalid ranges instead of silently failing.
- [ ] API usage chart — Load `/api/usage/summary` with the selected range/key and render a real chart; keep the total/empty states for cases with no series data.

## Pricing page
- [x] Implemented initial Pricing page using `/api/billing/plans` data with shared shell/footer and Paddle checkout CTA.  
  Explanation: Current UI maps Supabase `billing_plans` into cards with name, credits note, price, and a single “Credits Never Expire” feature. It does **not** yet include the landing-page feature lists or the Custom Pricing card/Contact Us CTA. Alignment work is tracked in `pricing-plan.md`.
- [x] Pricing alignment data source chosen: use `billing_plans.custom_data` for features + CTA behavior.  
  Explanation: Confirms features/CTA labels will be data-driven (not hardcoded) and sets the baseline for adding a Custom Pricing card. A pending decision remains on how to store Custom Pricing within `billing_plans` given non-null Paddle columns; see `pricing-plan.md` Step 3.
- [x] Custom Pricing storage strategy defined + catalog seeded in Supabase.  
  Explanation: Added a display-only `billing_plans` row (`plan_key=custom_pricing`, synthetic IDs) with `custom_data.cta_action="contact"` plus feature list and display price. Existing plans now include `cta_action="checkout"` and `cta_label` in `custom_data`. Backend now blocks `/api/billing/transactions` when the plan’s `cta_action` is not `checkout`, preventing Paddle checkout for non-purchasable plans.
- [x] Pricing features now data-driven from Supabase `custom_data`.  
  Explanation: Updated Basic/Professional/Enterprise `custom_data.subtitle` + `custom_data.features` and wired `/pricing` to render subtitle + feature list from metadata without hardcoded fallback text. Custom Pricing remains hidden until Step 5.
- [x] Custom Pricing card enabled in dashboard `/pricing`.  
  Explanation: Pricing UI now renders all plans sorted by `custom_data.sort_order`, including the display-only Custom Pricing card with “Contact Us” label and feature list. CTA clicks log intent without triggering checkout, keeping behavior neutral until you decide next steps.
- [x] Pricing layout verification (responsive) done.  
  Explanation: Verified `/pricing` at 1366x768 (4-card row) and 390x844 (stacked cards, header/CTA/footer intact). Responsive behavior matches expectations; no layout regressions observed.

## Account page
- [x] Implemented Account page per Figma: profile card with avatar, edit link, username/email/password fields, and Update button; purchase history table with invoice download pills; total credits summary card. Uses typed data and shared shell/footer; backend wiring TBD.
- [x] Added password update flow matching design: Current/New password fields with Supabase re-auth + password change, in-card feedback, and disabled state until fields are filled. Keeps styling consistent with existing Account card.
- [x] Account avatar upload wired: “Edit Photo” opens file picker, uploads to backend `/api/account/avatar` -> Supabase Storage public URL, stores `avatar_url` in profiles, and surfaces avatar in header/account using user data. Bucket `avatars` must exist and be public in Supabase.
  Note: Existing user `c105fce3-786b-4708-987c-edb29a8c8ea0` had a stale localhost avatar; `avatar_url` was cleared. New uploads should produce Supabase Storage public URLs (no localhost images).

## Backend wiring plan (FastAPI + Supabase + external verification API)
- [x] Establish backend structure under `/backend/app` with FastAPI app factory, logging, CORS, and pydantic settings. Decisions: Python 3.12 + pip, uploads stored locally at `backend/uploads` (10 MB max, retention configurable), Next.js -> our FastAPI -> external API. Added `.env.example`, `requirements.txt`, `settings.py`, `logging.py`, `main.py` with `/health`, and created upload dir.
  Explanation: Skeleton in place so the frontend can call a stable FastAPI layer without exposing secrets; CORS defaults include localhost and boltroute domains; env-driven configuration recorded for newcomers.
- [x] Auth layer using Supabase JWT (validate with `SUPABASE_JWT_SECRET`/service role); read token from `Authorization: Bearer` or configured Supabase auth cookie.
  Explanation: Added `SUPABASE_AUTH_COOKIE_NAME` env, auth dependency (`core/auth.py`) decoding HS256 JWTs, extracting `sub`/`user_id`, logging missing/invalid tokens, and returning typed `AuthContext`. Ready to apply to routers for per-user scoping.
- [x] External API client wrappers for `/verify`, `/tasks`, `/tasks/{id}`, `/tasks/batch/upload`, `/api/v1/api-keys` with structured logging and typed responses.
  Explanation: Added `clients/external.py` with pydantic models, async httpx calls, unified error handling, and 10 MB upload guard; covers verify, create/list/detail tasks, file upload, and API key list/create/revoke with Bearer auth.
- [x] Routes for frontend pages: verify (manual + file upload), tasks/history listing, task detail, emails lookup, API keys CRUD, usage (Supabase-backed), account/profile (Supabase-backed stub), health.
  Explanation: Routers split: tasks (verify/create/list/detail/upload), api-keys (list/create/revoke + cache), account (profile/credits), usage (Supabase-backed). Upload supports multiple files sequentially; usage logging into Supabase after external calls.
- [x] Storage and housekeeping: local upload retention removed since uploads are external; housekeeping hooks deleted.
  Explanation: Matches requirement to retain files while users have credits, with env overrides to avoid disk bloat. Retention helper exists; scheduled hook still needed.
- [x] CORS/Env setup: default allow `http://localhost:3000`; read extra origins from env (staging/prod) via comma-separated `BACKEND_CORS_ORIGINS`. Added `.env.example` documenting keys (`EMAIL_API_BASE_URL/KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `BACKEND_CORS_ORIGINS`, `LOG_LEVEL`, `APP_ENV`, `UPLOAD_RETENTION_DAYS`).
  Explanation: Keeps secrets out of code and makes allowed origins configurable without redeploys. Added validator to split comma-separated origins; `.env.example` lists required keys with dev placeholders.
- [ ] Tests: unit tests for settings, auth dependency, upload guard, and external client parsing; integration-style tests for verify and task routes.
  Explanation: Added minimal smoke tests (settings validation, auth dependency, external client guard/parsing, retention); still need integration coverage for routes once wiring to frontend is finished.

## Supabase schema bootstrap
- [x] Create base tables via Supabase MCP: `profiles` (user_id PK, email, display_name, timestamps), `user_credits` (user_id FK, credits_remaining >= 0), and `api_usage` (usage logs with period and counts) plus index on user/period.
  Explanation: Provides minimal storage for profile data, credits/retention checks, and API usage metrics; built through Supabase migration for backend wiring.

## Latest backend wiring progress
- [x] Added Supabase client service using service role key and fetch/upsert helpers for profiles, credits, and usage.
  Explanation: Centralizes Supabase access with logging; powers account/usage routes and retention checks.
- [x] Added account and usage routes under `/api`: profile get/patch, credits fetch, and usage listing with optional date filters; all authenticated.
  Explanation: Frontend can now read/update profile info, get remaining credits, and fetch usage records from Supabase instead of mocks.
- [ ] Implement usage ingestion, account updates for all fields, and retention enforcement hooks; wire frontend to backend and add tests.
  Explanation: Usage logging added on verify/tasks/api-keys/account profile & credits & usage list; account profile uses EmailStr validation and has backend tests. Remaining: broaden account fields if needed; retention hooks removed with externalized uploads.
- [x] Repair API keys cache service after leftover patch artifacts.
  Explanation: Recreated `backend/app/services/api_keys.py` to restore `cache_api_key`/`list_cached_keys` with Supabase upsert/select and logging; removed broken patch markers that would have caused import errors.
- [x] Frontend env fix for API client.
  Explanation: Added `.env.local` with `NEXT_PUBLIC_API_BASE_URL` (now pointed to `http://localhost:8001/api` for local) so Next.js pages like `/verify` no longer throw at module load; keeps frontend base URL aligned with backend instance.
- [x] Verify page upload width restoration.
  Explanation: Made the “Upload a file” card span the full row when no popup/summary is shown by adding a conditional `lg:col-span-3`; keeps side-by-side layout only when secondary content (popups/summary) is present. Aligns with original Figma layout and avoids the narrow card regression on large screens.
- [x] External API client dependency fix and local port change.
  Explanation: Swapped FastAPI `Depends(...)` ellipsis for a real dependency (`get_external_api_client`) in task and API key routes so the backend boots. Adjusted local env to use API base `http://localhost:8001/api` to avoid a conflicting service on 8000; backend now runs on port 8001.
- [x] Per-user key resolution + integration metadata.
  Explanation: Tasks/verify now resolve a per-user hidden `dashboard_api` key; optional `api_key_id` query selects another user-owned key. API key creation caches secrets and integration metadata (`integration` column), listing can include internal keys when requested, and frontend API page creation sends integration choice. History page now offers a key selector (including dashboard) to filter task history per key.
- [x] Storage/retention cleanup hook.
  Explanation: Removed alongside retention logic since uploads are now external-only.
- [x] Remove upload retention/maintenance logic now that file uploads are fully external; delete retention service + maintenance endpoint, remove retention settings/tests/docs references, and update plan notes.
  Explanation: Deleted retention service/tests and maintenance endpoint; settings cleaned; plan updated to avoid incorrect ops guidance.
- [x] Post-upload task polling/backfill.
  Explanation: `/api/tasks/upload` now captures batch-upload tasks by polling `/tasks` with the user’s external key after uploads complete, comparing against a baseline, and upserting recent tasks into Supabase. Poll attempts/interval/page size are env-configurable (`UPLOAD_POLL_*`), with structured logs for baseline fetch, each poll attempt, and new task detection.
- [x] Avatar storage client fix.
  Explanation: `get_storage` now uses the Supabase storage property (not a callable) to stop `/api/account/avatar` 500s; added a regression test for the storage accessor and adjusted account tests for the avatar_url argument.
- [x] Avatar upload uses bytes + correct file options.
  Explanation: `/api/account/avatar` now reads file bytes and passes storage3 `FileOptions` (`content-type`, `upsert`) so uploads succeed; improved error logging and added regression test `test_account_avatar.py`.
- [x] Header avatar refresh.
  Explanation: Account avatar/profile updates now broadcast a `profile:updated` event; the shared dashboard shell listens and refreshes name/avatar so the top-right profile image reflects uploads immediately without page reload.
- [x] External API smoke test script.
  Explanation: Added `backend/scripts/test_external_api.py` to hit `/tasks`, `/api-keys`, and `/verify` using a Supabase JWT. Supports `--csv` to POST `/verify` for each email (60s timeout). With the current token (role=authenticated, no app_metadata.role), `/tasks`/`/api-keys` returned empty; `/verify` returned 408 (SMTP timeout) for one email and `catchall` from cache for another; no tasks created.
- [x] External API auth shift to Supabase JWTs.
  Explanation: Tasks/verify/api-keys now forward the caller’s Supabase JWT (no dev master key usage); dashboard key bootstrap is disabled (returns skipped); 401/403 from external return safe responses. Added `DEV_API_KEYS` env for admin override headers and a helper script `backend/scripts/set_user_role.py` to set `app_metadata.role` (admin: mkural2016@gmail.com). `.env.example` documents the new envs.
- [x] External API access plan updated after api-docs.json review.
  Explanation: Documented ApiKeyAuth header usage, raw vs Bearer uncertainty, admin `user_id` requirement, and the removal plan for legacy master-key tooling before implementation.
- [x] External usage endpoints alignment confirmed (no code changes).
  Explanation: `/api-keys` and `/metrics/api-usage` already accept `from`/`to` and are wired through backend + frontend; omitting the range returns lifetime totals, passing a range returns range totals per external dev.
- [x] Usage mapping tests executed for external usage views.
  Explanation: Ran frontend `tests/api-usage-utils.test.ts` and backend `test_api_keys.py` + `test_usage_purpose_route.py` to confirm per-key and per-purpose usage mapping with range parameters.
- [x] External API access plan extended for full endpoint validation.
  Explanation: Added steps to validate every external endpoint for both user/admin roles, require explicit input config, and flagged the missing Playwright-based test script reference.
- [ ] External key creation blocked (legacy) — previous dev key flow for `/api-keys` is no longer used; per-user dashboard key creation was disabled and replaced by forwarding Supabase JWTs. Keep monitoring admin-only external endpoints once role-bearing tokens are available.
- [ ] TODO: (Enhancement) Add optional in-app scheduler (env-gated) for future background jobs unrelated to uploads.
- [ ] External API auth finalization — confirm role claim shape and pass `user_id` for admin external calls where required.
  Explanation: Bearer auth is confirmed and legacy master-key tooling removed; remaining work is admin scoping and role-claim alignment.
  Progress: Added admin-only `user_id` scoping to `/api-keys` list/create/revoke and passed through to external API; tests added and `pytest backend/tests` passed. Role-claim validation is still limited to `app_metadata.role` mapping in `AuthContext`.
  Planned steps:
  - [x] Validate admin role claim sources (app_metadata role vs top-level role) and document the accepted shape.
    Explanation: Auth now checks both `app_metadata.role` and top-level `role` claims for admin; non-admin role claims are logged at debug.
  - [x] Centralize admin-claim detection in auth and reuse it in `/api/api-keys` admin gating.
    Explanation: Admin gating now relies on `AuthContext.role` derived in auth; duplicate claim checks in `/api/api-keys` were removed to keep a single source of truth.
  - [x] Add/adjust auth + api-keys tests for admin claim validation and rerun `pytest backend/tests`.
    Explanation: Added auth tests for admin role via `app_metadata`, top-level `role`, and `DEV_API_KEYS`. Ran `pytest backend/tests` (38 passed).
  - [x] Add admin `user_id` override for `/api/tasks` list/create/upload where external API supports it, with tests and logging.
    Explanation: Added admin-scoped `user_id` for task list/create/upload with role gating, per-user usage logging, and tests; `pytest backend/tests` passed (44 tests).
  - [ ] Run admin JWT external API probe to validate `user_id` scoping end-to-end.
    Explanation: Use a role-bearing admin JWT to call external `/tasks` and `/api-keys` with `user_id` and confirm scoping behavior.
- [x] External API key purpose alignment — added `external_purpose` mapping to integrations config, removed `custom` from integrations, and sent `purpose` in external `/api-keys` create requests; updated tests to match.
  Explanation: External API requires `purpose` enum and rejects missing/invalid values; config-driven mapping avoids hardcoding and keeps UI + backend consistent. `pytest backend/tests/test_api_keys.py` passed (6 tests). External API runner succeeded for user role with Bearer auth and `purpose=zapier`.
- [x] Fix API key creation logging crash.
  Explanation: Replaced reserved LogRecord `name` key in `extra` with `key_name` to avoid `KeyError` on `/api/api-keys` create; ran `pytest backend/tests/test_api_keys.py` (9 passed).
- [x] Removed legacy master-key tooling — removed `EMAIL_API_KEY` usage, deleted `backend/scripts/check_external_api.py`, and cleaned tests/env docs.
  Explanation: External API auth no longer depends on a master key; settings/tests were updated to rely on JWT Bearer flow. Ran `pytest backend/tests` (33 passed).
- [x] External API test script upgrade — implemented config-driven runner in `backend/tests` to validate required external endpoints using the user JWT from `key-value-pair.txt` and `EMAIL_API_BASE_URL`.
  Explanation: Added `backend/tests/external_api_test_runner.py` + `backend/tests/external_api_test_config.json`, probes raw vs Bearer auth, and exercises tasks/api-keys/verify/batch upload. Updated `backend/scripts/test_external_api.py` with `--use-config` to invoke the new runner. After updating `key-value-pair.txt` with the raw `access_token`, `Authorization: Bearer <token>` succeeded (raw token failed), and all required user endpoints passed (tasks list/detail, verify, tasks create, batch upload, api-keys list/create/delete). API key creation requires `purpose` (enum: zapier, n8n, google sheets).

# Paddle Billing Integration
- [x] Drafted initial Paddle Billing plan in `paddle.md` covering sandbox/prod config, dedicated backend folder/route, checkout + webhook flow, Supabase credit granting, and testing/simulation strategy. Explanation: establishes first-principles MVP steps using new Paddle Billing API (not Classic), env-driven config, backend-owned checkout/webhook handling, and frontend helper for Paddle.js.
- [x] Added Paddle config loader (`backend/app/paddle/config.py`) to select sandbox vs production, validate required env (API URL/key, webhook secret, checkout script when enabled, client-side token), and parse plan definitions JSON with quantity guard. Explanation: sets the foundation for Paddle client/webhook modules using env-driven, fail-fast validation.
- [x] Added minimal Paddle Billing client (`backend/app/paddle/client.py`) with typed create-transaction call, structured error handling, and env-backed auth. Explanation: prepares backend to initiate Paddle Billing transactions using the selected sandbox/prod environment without exposing secrets.
- [x] Added initial billing API + webhook skeleton (`backend/app/api/billing.py`, `backend/app/paddle/webhook.py`, router wired in `backend/app/main.py`): returns plan definitions, creates transactions with validated price_ids, and verifies webhooks via IP allowlist + HMAC using the active env secret. Explanation: delivers MVP server endpoints for pricing buttons and secure webhook intake; event processing/credit grants will follow next.
- [x] Implemented webhook credit grant MVP: webhook now parses transaction events, matches price_ids to plan metadata credits, records billing events (idempotent via Supabase `billing_events` table), and grants credits to `user_credits` when event includes `supabase_user_id` in custom_data. Explanation: closes the loop for sandbox charges to credit users; requires `billing_events` table to exist for dedupe (logs and skips if missing).
- [x] Supabase schema: created `billing_events` table (event_id PK, user_id FK, event_type, transaction_id, price_ids[], credits_granted, raw jsonb, created_at + user index) with comments for diagnostics/idempotency. Explanation: enables webhook dedupe and credit grants storage for Paddle events.
- [x] Auto Paddle customer/address creation and pricing wiring: backend now creates/reuses Paddle Customer + Address per user (from profile email + default address config), stores mapping in `paddle_customers`, and uses it for transactions. Pricing page fetches plans and triggers transactions without client-provided IDs. Explanation: aligns dev flow with prod without hardcoded IDs; requires `PADDLE_BILLING_DEFAULT_COUNTRY` (+ optional address defaults) and user email in profile.
- [x] Billing tests added (`backend/tests/test_billing.py`) covering customer/address auto-create on transaction and credit grant on webhook events using plan metadata. Explanation: ensures MVP billing flow works and remains idempotent under test doubles.
- [ ] Re-run billing tests after webhook credit mapping changes.
  Explanation: Webhook credit mapping now pulls from `billing_plans`; tests were updated but the post-change run has not been reconfirmed in this session.
- [x] Env defaults for Paddle addresses set (per user input): `PADDLE_BILLING_DEFAULT_COUNTRY=US`, line1/city/region/postal present. Explanation: satisfies auto address creation in sandbox; change to production equivalents before go-live.
- [x] Paddle checkout conflicts resolved: deterministic email filter (`list_customers(email=...)`) with fuzzy fallback; profile email backfill from auth claims; Supabase upsert fixed for supabase-py. New user checkout (dmktadimiz@gmail.com) succeeds; Paddle customer/address reused and transactions created.
- [x] Paddle sandbox checkout script switched to `https://sandbox-cdn.paddle.com/paddle/v2/paddle.js` to reduce CSP noise; billing tests updated and passing. CSP report-only logs may still appear from Paddle/Sentry/Kaspersky.
- [x] Create 3 Paddle sandbox plans (Basic/Professional/Enterprise) as one-time USD credit packs and store their IDs + credits in Supabase; keep Custom as contact-only for now.
  Explanation: Created Paddle sandbox products/prices with taxMode=internal and customData credits for Basic/Professional/Enterprise; IDs captured for Supabase catalog sync. Products: Basic `pro_01kcvp3asd8nb0fnp5jwmrbbsn`, Professional `pro_01kcvp3brdtca0cxzyzg2mvbke`, Enterprise `pro_01kcvp3d4zrnp5dgt8gd0szdx7`. Prices: Basic `pri_01kcvp3r27t1rc4apy168x2n8e` (USD 29), Professional `pri_01kcvp3sycsr5b47kvraf10m9a` (USD 129), Enterprise `pri_01kcvp3wceq1d9sfw6x9b96v9q` (USD 279).
- [x] Supabase schema: created `billing_plans` table for the Paddle plan catalog.
  Explanation: Stores Paddle product/price IDs, credits, and status so pricing and credit grants are driven by Supabase, not env config.
- [x] Supabase plan catalog + API wiring — read plans from Supabase instead of env and validate price_id against stored catalog.
  Explanation: Added `backend/app/services/billing_plans.py` and rewired `/api/billing/plans` + `/api/billing/transactions` to use `billing_plans` as the single source of truth, rejecting unknown price_ids and returning plan metadata/amount/currency from Supabase.
- [x] Admin sync script — pull Paddle catalog and upsert `billing_plans` in Supabase after plan changes.
  Explanation: Added `backend/scripts/sync_paddle_plans.py` to list products/prices and upsert Supabase rows, with status filtering and validation. Script now normalizes next cursors and skips invalid rows with warnings; it only fails if no valid rows are produced.
- [x] Webhook credit grant uses Supabase plan catalog for credit mapping and notifies on missing/invalid mappings.
  Explanation: Webhook now resolves credits via `billing_plans` using `get_billing_plans_by_price_ids`; unmapped prices log `billing.webhook.no_credits` and do not grant credits.
- [x] Atomic billing event insert for webhook idempotency.
  Explanation: Replaced the read‑then‑upsert in `record_billing_event` with a single insert guarded by unique‑violation handling so duplicate webhooks cannot double‑grant credits; added a unit test to confirm duplicates are ignored.
- [x] CIDR-aware Paddle webhook IP allowlist.
  Explanation: `verify_ip_allowlist` now accepts CIDR ranges and single IPs, logs invalid entries, and fails safely if the configured allowlist contains no valid entries; tests cover CIDR and mixed/invalid cases.
- [x] Bidirectional webhook timestamp drift checks.
  Explanation: `verify_signature` now rejects timestamps outside the configured drift window in both past and future directions, with tests covering future timestamps.
- [x] Validated Paddle transaction address requirement in checkout mode.
  Explanation: Created a sandbox transaction without `address_id`; Paddle accepted it (201), returned `address_id: null`, and issued a checkout URL. This confirms address collection can occur at checkout when `PADDLE_ADDRESS_MODE=checkout`.
- [x] Validated transaction payload fields (metadata vs custom_data).
  Explanation: Sandbox transactions accepted `metadata` but did not return it on GET; to avoid silent loss, the billing API now rejects `metadata` and requires `custom_data`, with a test to enforce the behavior.
- [ ] Credit deduction on usage with atomic update and idempotency guard.
  Explanation: Credits should decrement when tasks/verification are accepted; handle retries without double-deduction and reject when insufficient. Deferred per request; not implementing now.
- [ ] Credit enforcement plan added (design + steps).  
  Explanation: Added `credit-plan.md` to document the agreed credit‑consumption model (debit on completion, hard‑fail on insufficient credits, `/verify` shares pool) and the step‑by‑step implementation plan.
- [ ] Credit enforcement implementation — add ledger storage, atomic debit, idempotency, and wire to `/verify` + task completion with tests.  
  Explanation: Steps 2–5 complete — added `credit_ledger`, added `apply_credit_debit` RPC for idempotent debits, and wired `/verify` + `/tasks/{id}`/download to debit on completion with hard‑fail on insufficient credits. UI messaging + tests remain and are tracked in `credit-plan.md`.
- [x] Credit enforcement Step 6 — UI 402 messaging for manual/file/download flows (no layout change).
  Explanation: Verify now surfaces server‑provided 402 detail in manual polling, file detail fetches, and download errors without changing layout, and logs missing detail. Added unit coverage for error detail extraction in `tests/verify-mapping.test.ts`.
- [x] Credit enforcement Step 7 — backend unit + integration tests for debit/idempotency and insufficient credits.
  Explanation: Added backend unit tests for `apply_credit_debit` status handling and FastAPI integration tests for `/api/verify` + `/api/tasks/{id}` returning 402 on insufficient credits. Ran targeted pytest with venv activated.
- [x] Credit enforcement Step 8 — frontend request_id for `/verify` idempotency.
  Explanation: Added client-side request_id caching with force‑new and clear helpers, wired `/verify` calls to include request_id and clear on success, and added unit coverage in `tests/verify-idempotency.test.ts`.
- [x] Credit enforcement Step 9 — decide whether to mark tasks blocked on insufficient credits.
  Explanation: Decision is to avoid persisted blocked status; rely on 402 until credits are sufficient, so results unlock immediately after purchase without new schema/state.
- [x] Credit enforcement Step 10a — add `credit_reserved_count` + `credit_reservation_id` to `tasks`.
  Explanation: Applied a Supabase migration to add reservation metadata columns so uploads/manual tasks can persist reserved counts and idempotency keys.
- [x] Credit enforcement Step 10b — add `apply_credit_release` RPC to Supabase.
  Explanation: Added a Supabase RPC that inserts a positive ledger entry and credits users idempotently, enabling safe release of reserved credits.
- [x] Credit enforcement Step 10c — verify reservation/finalize flows and run targeted tests.
  Explanation: Stubbed reservation fetch in `test_credit_enforcement_routes.py` to avoid Supabase client init, then ran targeted pytest for reservation/finalize and insufficient-credit routes; all passed.
- [x] Credit enforcement Step 10d — fix `apply_credit_debit` RPC ambiguity causing `/api/tasks/upload` 500s.
  Explanation: Updated the Supabase `apply_credit_debit` function to fully-qualify `credits_remaining` and avoid conflict with the output parameter; resolves the ambiguous column error. Re-test pending in Step 10e.
- [x] Credit enforcement Step 10e — re-test upload debit flow after RPC fix (targeted tests + manual upload).
  Explanation: Targeted backend tests passed (`test_credit_debit`, `test_tasks_credit_reservation`, `test_credit_enforcement_routes`). Manual `/api/tasks/upload` now returns 402 (Insufficient credits) instead of 500, confirming the ambiguity fix works and reservation failures are reported correctly.
- [ ] Signup bonus credits — grant a one-time signup bonus to new users only with account-age + email-confirm checks; tracked in `credit-plan.md`.
  Explanation: Added a dedicated plan section for the signup bonus (config-driven amount, Supabase Auth checks, ledger idempotency, and tests) to keep the implementation steps and anti-abuse rules visible to newcomers.
- [x] Priority High: Confirm Paddle webhook signature spec and align verification (or use official SDK verifier) with tests.
  Explanation: Aligned verification logic with Paddle’s official SDK implementation (ts + h1 header, HMAC of `ts:raw_body`, optional multi-signature support, time drift checks) and added focused tests. Added `PADDLE_WEBHOOK_MAX_VARIANCE_SECONDS` configuration to avoid hardcoded drift defaults.
- [x] Priority High: Verify webhook ingress IP handling in current infra and adjust allowlist logic.
  Explanation: Added explicit proxy-aware client IP resolution for Paddle webhooks with env-driven forwarded header format + hop count, plus tests for direct/proxy paths. `PADDLE_WEBHOOK_TRUST_PROXY` is now required to avoid silent misconfiguration.
- [x] Priority High: Enforce required address fields per target country for Paddle address creation.
  Explanation: Switched to checkout-collected addresses for global support (configurable `PADDLE_ADDRESS_MODE=checkout`) so Paddle collects country-specific fields. Address creation is skipped server-side, transactions omit `address_id`, and `paddle_customers.paddle_address_id` is now nullable; server-default mode remains available and requires full default address config.
- [x] Credit grant resilience when `user_credits` upsert fails.
  Explanation: Added strict Supabase upsert verification for `user_credits` and webhook rollback (delete `billing_events` + 500) on credit-grant failure so retries can reprocess. Ran `pytest backend/tests` (79 passed, 2 warnings).
- [x] Paddle webhook simulation verification — run a sandbox simulation to confirm webhook delivery and credit grants.
  Explanation: Ran `backend/scripts/paddle_simulation_e2e.py` for `mkural2016@gmail.com` on Professional (`plan_key=professional`, price `pri_01kcvp3sycsr5b47kvraf10m9a`) against notification `ngrok2-all` (`https://3896ff725b43.ngrok-free.app/api/billing/webhook`). Script completed with `paddle_simulation_e2e.success` and confirmed `billing_purchases` + `user_credits` updates for transaction `txn_01kd5p2svr8cc13v2y6b89j06a`.
- [ ] End-to-end webhook delivery + credit grant verification (sandbox).
  Explanation: Verified via Paddle MCP that transaction `txn_01kcyc3pp35qadh4wwa64k9mkz` (Enterprise, 500,000 credits, USD 279.00, `customData.supabase_user_id=c105fce3-786b-4708-987c-edb29a8c8ea0`) completed at `2025-12-20T17:15:26Z`. The `ngrok2` destination (`ntfset_01kcybh89r74rwqm28g5rwjd52`) shows delivered events for `transaction.created`, `transaction.ready`, `transaction.updated` (ready/paid/completed), `transaction.paid`, and `transaction.completed`. Supabase check: `billing_events` has `event_id=evt_01kcyc4mdf09brkv9xgh5wt0z7` with `credits_granted=500000` for the transaction and user, and `billing_plans` maps the Enterprise price to 500,000 credits. Warning: there is no `user_credits` row for `c105fce3-786b-4708-987c-edb29a8c8ea0`. Root cause fix applied in `set_credits`; re-run a sandbox checkout to confirm credits now persist and mark complete.
- [x] Fix Supabase credits upsert in webhook grant path.
  Explanation: Removed the unsupported `.select().limit()` chain on `upsert()` for `user_credits` and now fetches the row in a separate query, preventing an AttributeError that caused webhook 500s; error logging now includes details in the message.
- [x] Billing checkout conflict reuse — handle Paddle customer 409 by reusing existing customer reliably.
  Explanation: Added robust parsing for Paddle list/search responses, imported `CustomerResponse`, and added test coverage to reuse existing customers after a 409 conflict so checkout can proceed. Ran `pytest backend/tests/test_billing.py`.
- [x] Backend file logging + time-based cleanup for uvicorn logs (no manual copy/paste).
  Explanation: Added opt-in timed rotating file logging via explicit env settings (path/when/interval/backup_count) and a unit test that verifies logs are written to disk; attached the file handler to `uvicorn`, `uvicorn.error`, and `uvicorn.access` loggers so uvicorn output is captured; fixed reserved LogRecord key usage (`filename` -> `file_name`) to prevent logging crashes once file handlers are attached. Staging deploy/verification not performed because no procedure was provided.
- [x] Clarified Paddle hardening task statuses in `paddle.md` for newcomer visibility.
  Explanation: Added explicit status lines for each hardening item so it’s clear which tasks are pending vs completed.
- [ ] Priority Medium: Extend webhook event handling for subscription renewals and payment failure events.
  Explanation: Out of scope for one-time credit packs; defer until subscriptions are introduced.
- [ ] Priority Medium: Add short-lived caching for plan price lookups in `/api/billing/plans`.
  Explanation: Reduce Paddle API calls and avoid rate limits while keeping pricing reasonably fresh. Not implemented yet.
- [ ] Priority Low: Add customer portal session endpoint + UI link for self-serve billing management.
  Explanation: Optional convenience feature; can be added after core billing reliability is confirmed. Not implemented yet.
- [ ] Priority Low: Add frontend price preview for localized totals.
  Explanation: Improves UX by showing taxes/total before checkout; defer until core flow is stable. Not implemented yet.

## Repo hygiene
- [x] Ignore log files in git.
  Explanation: Added `*.log` and `*.log.*` patterns to `.gitignore` to prevent runtime logs from being committed; existing tracked logs remain tracked unless removed.
- [x] Untrack existing log files.
  Explanation: Removed tracked `backend/logs/uvicorn.log*` from git index (files kept locally). Future log changes will no longer appear in `git status`.

## Supabase schema updates
- [x] Added `cached_api_keys` (key_id PK, user_id FK, name, created_at) with user index for API key caching.
- [x] Added `key_plain` column + user/name index on `cached_api_keys` to store per-user external key secrets for server-side proxying; reserved dashboard keys stay hidden from `/api`.
- [x] Added `integration` column + (user_id, integration) index to `cached_api_keys` to persist user-selected integration for each key.
- [x] Added `tasks` table (task_id PK, user_id FK, status, counts, integration, timestamps) with user/created_at index and updated_at trigger; seeded demo rows for user `959ce587-7a0e-4726-8382-e70ad89e1232` to exercise Overview/History once wired.
- [x] Made `paddle_customers.paddle_address_id` nullable to support checkout-collected addresses.
  Explanation: Allows storing Paddle customer IDs without requiring a server-created address when `PADDLE_ADDRESS_MODE=checkout`.
- [x] File upload tasks ingestion after batch upload.  
  Explanation: Added configurable post-upload polling that captures tasks created by `/tasks/batch/upload` by fetching recent tasks with the user’s key, comparing against a baseline, and upserting into Supabase. Logging covers baseline fetch, poll attempts, and new task detection; env knobs (`UPLOAD_POLL_*`) control attempts/interval/page size.
- [x] Header profile wiring — Sidebar/topbar profile now loads Supabase-backed user profile (display_name/email) and role from session; avatar initials derived from real name. Hardcoded placeholder removed.
- [x] Account email/password sync — Require reauth for email/password changes; use Supabase Auth email confirmation flow; only update profiles.email after confirmation; sync confirmed email to profiles on login; add tests.  
  Explanation: Added backend email guard, updated account UI to reauth + request email confirmation, synced confirmed emails on login, and added backend tests for the guarded update flow.
- [ ] Account purchase history/invoices — Wire purchase history and invoice downloads (Paddle transactions/webhooks) into `/account` later.  
  Explanation: `/account` still renders an empty purchase list; backend endpoints + UI wiring are needed for real invoices.
- [x] History key scoping — Store `api_key_id` on tasks created in-app and filter `/history` by selected key; avoid mislabeling tasks when key mapping is unknown; add tests.  
  Explanation: Added `api_key_id` to tasks + indexes, tagged tasks when key is known (dashboard cache or detail lookup), filtered Supabase queries by key, skipped external list when key-scoped to avoid mislabeling, and added tests.
- [x] API usage summary (dashboard) — Added `/api/usage/summary` that aggregates task counts by day from Supabase `tasks`, supports date range + `api_key_id`, and wired `/api` UI to use it.  
  Explanation: Usage chart now reads real per-task counts (email_count or derived counts) and displays totals; this covers dashboard-driven usage without relying on placeholder mapping.
- [ ] API usage wiring (external) — Re-check the next `api-docs.json` (incoming) for the promised per‑key usage per user. Implement dual usage views on `/api`: per‑key usage (from the new per‑key endpoint once documented) and per‑purpose usage (from `/metrics/api-usage` with `from`/`to`). Add logging + tests for both paths.
  Docs review note (latest): Updated `api-docs.json` exposes per‑key usage in GET `/api-keys` list via `APIKeySummary.total_requests` and supports `from`/`to` date filters (by last_used_at). Purpose‑level usage remains `/metrics/api-usage`. `/tasks` still supports `user_id` + date range only.
  Explanation: This enables per‑key totals from `/api-keys` and per‑purpose totals from `/metrics/api-usage`, matching the dual-view requirement without local ingestion.
  Planned steps:
  - Step 1 (backend): DONE — extended external client + API key route to pass `from`/`to`, added `total_requests` + `purpose` fields, added `/api/usage/purpose` proxy for `/metrics/api-usage`, and added tests + logging.  
    Explanation: This wires per‑key totals (from `/api-keys`) and per‑purpose totals (from `/metrics/api-usage`) on the backend so the UI can switch between views without local ingestion.
  - Step 2 (frontend): DONE — updated API client types/calls, added usage view selector (per‑key vs per‑purpose), dynamic dropdown, and usage totals rendering without altering layout.  
    Explanation: `/api` now lets users switch between per‑key totals (from `/api-keys`) and per‑purpose totals (from `/metrics/api-usage`) using the same card layout; the chart area shows verified totals when time-series data isn’t provided.
  - Step 3 (verification): run backend tests; note staging deploy + verification are pending if not possible in this environment.
  Explanation: External API now exposes purpose-level metrics with date filters but no per-key breakdown; we need to integrate it for non-dashboard usage or ingest tasks per key to satisfy per-key charts.
