# Plan (carry forward)

- [x] Baseline setup — Next.js 14 (app router) with TypeScript, Tailwind, ESLint, npm, and alias `@/*`; React Compiler disabled. Clean base to layer dashboard features.
- [x] Layout shell + theming — Built shared sidebar/topbar shell per Figma: responsive drawer, notifications/profile, Nunito Sans, gradient surface. Sidebar uses `public/logo.png` (BoltRoute) image logo (matches `Screenshot_1.png`), not text. Avatar uses `public/profile-image.png` with fallback initials. Purpose: consistent chrome to reuse across pages.
- [x] Overview content — Implemented Overview screen per Figma with typed mock data: stat summary cards, validation donut (Recharts Pie), credit usage line chart, current plan card, verification tasks table with status pills and month selector, profile dropdown. Responsive grid, lucide icons. This is the only built page; other nav items are marked unavailable.
- [x] Shadcn variant removal — Removed previous shadcn/ui variant to keep a single Tailwind implementation at `/overview` (root `/` redirects). Ensures one canonical path.
- [ ] Remaining pages — Verify, History, Integrations, API, Pricing, Account need to be built using the shared shell once Figma node details are provided. Use first-principles MVPs, no placeholders.
- [ ] API integration — Wire UI to FastAPI email verification backend once endpoint schemas/contracts are known. Replace mock data with typed fetch layer + error handling/logging; avoid hardcoded fallbacks.
- [ ] Testing and staging — Add unit/integration coverage and deploy to staging after MVP pages and API wiring are in place; verify flows end-to-end.
- [ ] Deprecation warnings cleanup — update Supabase Python client to remove `gotrue` deprecation and adjust httpx per-request cookies in tests.
  Explanation: Warnings only today; likely a dependency bump to `supabase`/`supabase_auth` and a small test change to set cookies on the client.
- [ ] Enhancements — Only after MVP + tests + staging verification.

Notes for continuity: Python venv `.venv` exists (ignored). `node_modules` present locally (uncommitted). Root `/` redirects to `/overview`; main page at `app/overview/page.tsx`. A dev server may still be running on port 3001 (see handover if needed). External email verification API is reachable at `https://email-verification.islamsaka.com/api/v1/`; it accepts Supabase JWTs via `Authorization: Bearer <token>`. Supabase seeded for user `mustimoger@gmail.com` with credits and cached keys.

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
- Wire retention/cleanup: enforce upload retention based on credits and retention days; add scheduled cleanup hook and logging.
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
- [x] Webhook alternative noted — If external API later provides global usage/task webhooks, plan is to consume them (with polling as fallback). See `non-dashboard-api-usage-plan.md`.

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
- [ ] File processing in app API: parse uploaded CSV/XLSX/XLS, apply column mapping + header handling + dedupe, then call external `/tasks` with the cleaned email list (no external batch upload).
  Explanation: External API will not support mapping/dedupe; app API must own the preprocessing step and create per-file tasks directly from parsed emails.
- [ ] Supabase task_files table: persist file metadata per task (user_id, task_id, file_name, source_path, column mapping, flags) for History and downloads.
  Explanation: Needed to show file names in History and recreate annotated download files without mutating originals.
- [ ] Multi-sheet handling: reject Excel files with multiple sheets and return a clear error to split into single-sheet files.
  Explanation: Only the first sheet is supported for MVP to keep parsing deterministic and avoid incorrect column mapping.
- [ ] Verify download output: generate a new file with verification result columns appended, keep original file unchanged, and expose a download endpoint per task.
  Explanation: Users should download verified results while original uploads remain intact; output file should be derived from stored metadata and task results.
- [ ] Frontend verify: send column mapping + header/dedupe flags with file uploads; validate mapping before submit; wire download action to new backend endpoint.
  Explanation: UI already collects mapping/flags, but backend needs them; download pill should trigger file download once results are ready.
- [ ] History filenames: use task_files metadata to display file names for file-based tasks in History.
  Explanation: Improves History readability and aligns with requirement to persist file names.
- [x] Verify flow audit (manual + upload wiring) to capture remaining placeholders and mapping gaps.
  Explanation: Manual verify already polls `/api/tasks/{id}` and maps job statuses; upload summary logic still uses time-based task selection and references a removed `deriveUploadSummary` helper in the file-chip remove flow, so file mapping must be replaced with the new upload response `task_id` linkage.

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

## Integrations page
- [x] Pull Figma specs via MCP and capture screenshot (node `65:339`). Design: shared shell/footer, three integration cards (Zapier, n8n, Google Sheets), text “More coming soon...”.
- [x] Implement Integrations page UI per Figma using shared shell; render logo cards and supporting text; keep layout responsive. Wire real integration links later.  
  Explanation: Added `/integrations` with three logo cards (Zapier, n8n, Google Sheets) and CTAs linking to `/api` with the selected integration prefilled; copy clarifies keys are universal and integration choice only tags usage. Assets under `public/integrations/*.png`; shared shell/footer reused. Updated n8n card copy to emphasize keys are universal and can be used anywhere while selection just tags usage.
- [x] Dynamic integration config + modal key creation — Added backend integration config (`backend/config/integrations.json` + loader), `/api/integrations` endpoint, Supabase indexes on `cached_api_keys` (user+integration/name), and validation of integration ids on key creation. Frontend `/api` now fetches integrations and uses a popup to create keys with name + integration tags; API keys table shows integration column. Keys remain universal; tagging is for usage reporting. Additional platforms can be added by editing the JSON config without code changes.
  Explanation update: fixed integration config loader path to read `backend/config/integrations.json` so integrations populate in the modal.

## API page
- [x] Implement simplified API page: card 1 with API keys table (name, masked key, status pill, edit action); card 2 with usage controls (API key dropdown, date range, actions) and line chart placeholder with mock data/empty state. Shared shell/footer reused; console logs for future backend wiring.

## Pricing page
- [x] Implemented Pricing page per Figma: four tier cards in a grid, each with title, “Credits Never Expire” note, price (last card “Contact Us”), feature list, and “Start Verification” CTA. Shared shell/footer reused; typed feature data for now.

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
- [ ] Storage and housekeeping: enforce 10 MB uploads, save under `backend/uploads`, expose retention rule (default keep up to 180 days when user has non-zero credits, configurable via env) and log cleanup actions.
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
  Explanation: Usage logging added on verify/tasks/api-keys/account profile & credits & usage list; account profile uses EmailStr validation and has backend tests. Remaining: broaden account fields if needed and add retention scheduling/ingestion for other routes as required.
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
  Explanation: Added authenticated maintenance endpoint `/api/maintenance/purge-uploads` that runs retention cleanup (`purge_expired_uploads`), logging deletions and returning deleted files. Use for cron/operator calls to enforce upload retention policy.
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
- [x] External API access plan extended for full endpoint validation.
  Explanation: Added steps to validate every external endpoint for both user/admin roles, require explicit input config, and flagged the missing Playwright-based test script reference.
- [ ] External key creation blocked (legacy) — previous dev key flow for `/api-keys` is no longer used; per-user dashboard key creation was disabled and replaced by forwarding Supabase JWTs. Keep monitoring admin-only external endpoints once role-bearing tokens are available.
- [ ] TODO: (Enhancement) Add optional in-app scheduler (env-gated) to trigger retention cleanup on an interval for dev/staging when cron isn’t available; update OpenAPI (`api-docs.json`) to include maintenance route. Cron-based purge will be handled later in deployment.
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
- [x] Paddle sandbox checkout script switched to `https://sandbox-cdn.paddle.com/paddle/v2/paddle.js` to reduce CSP noise; billing tests updated and passing. Next/Image logo aspect ratio warning remains cosmetic; CSP report-only logs may still appear from Paddle/Sentry/Kaspersky. (Intentionally not addressing the Next/Image aspect-ratio warning per instruction.)
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
- [ ] Credit deduction on usage with atomic update and idempotency guard.
  Explanation: Credits should decrement when tasks/verification are accepted; handle retries without double-deduction and reject when insufficient. Deferred per request; not implementing now.
- [x] Priority High: Confirm Paddle webhook signature spec and align verification (or use official SDK verifier) with tests.
  Explanation: Aligned verification logic with Paddle’s official SDK implementation (ts + h1 header, HMAC of `ts:raw_body`, optional multi-signature support, time drift checks) and added focused tests. Added `PADDLE_WEBHOOK_MAX_VARIANCE_SECONDS` configuration to avoid hardcoded drift defaults.
- [x] Priority High: Verify webhook ingress IP handling in current infra and adjust allowlist logic.
  Explanation: Added explicit proxy-aware client IP resolution for Paddle webhooks with env-driven forwarded header format + hop count, plus tests for direct/proxy paths. `PADDLE_WEBHOOK_TRUST_PROXY` is now required to avoid silent misconfiguration.
- [x] Priority High: Enforce required address fields per target country for Paddle address creation.
  Explanation: Switched to checkout-collected addresses for global support (configurable `PADDLE_ADDRESS_MODE=checkout`) so Paddle collects country-specific fields. Address creation is skipped server-side, transactions omit `address_id`, and `paddle_customers.paddle_address_id` is now nullable; server-default mode remains available and requires full default address config.
- [ ] Paddle webhook simulation verification — run a sandbox simulation to confirm webhook delivery and credit grants.
  Explanation: Attempted with Paddle MCP. Simulation failed because the notification destination required `trafficSource=simulation` (created a new notification setting), but the webhook secret on the server didn't match the new endpoint secret so signature verification failed (HTTP 400). Paddle also sent a static sample payload without `custom_data`, so credit grants couldn't be validated. Next step: update the server webhook secret to the simulation destination’s secret or run a real sandbox checkout to trigger a production webhook.
- [ ] Priority Medium: Extend webhook event handling for subscription renewals and payment failure events.
  Explanation: Out of scope for one-time credit packs; defer until subscriptions are introduced.
- [ ] Priority Medium: Add short-lived caching for plan price lookups in `/api/billing/plans`.
  Explanation: Reduce Paddle API calls and avoid rate limits while keeping pricing reasonably fresh. Not implemented yet.
- [ ] Priority Low: Add customer portal session endpoint + UI link for self-serve billing management.
  Explanation: Optional convenience feature; can be added after core billing reliability is confirmed. Not implemented yet.
- [ ] Priority Low: Add frontend price preview for localized totals.
  Explanation: Improves UX by showing taxes/total before checkout; defer until core flow is stable. Not implemented yet.

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
  - Step 2 (frontend): update API client types + calls; add usage view selector (per‑key vs per‑purpose) and dynamic dropdown; render totals using new data sources without changing layout.
  - Step 3 (verification): run backend tests; note staging deploy + verification are pending if not possible in this environment.
  Explanation: External API now exposes purpose-level metrics with date filters but no per-key breakdown; we need to integrate it for non-dashboard usage or ingest tasks per key to satisfy per-key charts.
