# Plan (carry forward)

- [x] Baseline setup — Next.js 14 (app router) with TypeScript, Tailwind, ESLint, npm, and alias `@/*`; React Compiler disabled. Clean base to layer dashboard features.
- [x] Layout shell + theming — Built shared sidebar/topbar shell per Figma: responsive drawer, notifications/profile, Nunito Sans, gradient surface. Sidebar uses `public/logo.png` (BoltRoute) image logo (matches `Screenshot_1.png`), not text. Avatar uses `public/profile-image.png` with fallback initials. Purpose: consistent chrome to reuse across pages.
- [x] Overview content — Implemented Overview screen per Figma with typed mock data: stat summary cards, validation donut (Recharts Pie), credit usage line chart, current plan card, verification tasks table with status pills and month selector, profile dropdown. Responsive grid, lucide icons. This is the only built page; other nav items are marked unavailable.
- [x] Shadcn variant removal — Removed previous shadcn/ui variant to keep a single Tailwind implementation at `/overview` (root `/` redirects). Ensures one canonical path.
- [ ] Remaining pages — Verify, History, Integrations, API, Pricing, Account need to be built using the shared shell once Figma node details are provided. Use first-principles MVPs, no placeholders.
- [ ] API integration — Wire UI to FastAPI email verification backend once endpoint schemas/contracts are known. Replace mock data with typed fetch layer + error handling/logging; avoid hardcoded fallbacks.
- [ ] Testing and staging — Add unit/integration coverage and deploy to staging after MVP pages and API wiring are in place; verify flows end-to-end.
- [ ] Enhancements — Only after MVP + tests + staging verification.

Notes for continuity: Python venv `.venv` exists (ignored). `node_modules` present locally (uncommitted). Root `/` redirects to `/overview`; main page at `app/overview/page.tsx`. A dev server may still be running on port 3001 (see handover if needed). External email verification API is reachable at `https://email-verification.islamsaka.com/api/v1/`; shared bearer works and returns tasks (global to the key). Supabase seeded for user `mustimoger@gmail.com` with credits and cached keys; external `/tasks` currently unscoped per user.

## Data ownership & key logic (current vs intended)
- Supabase (app-owned): profiles, user_credits, api_usage (filterable by api_key_id), cached_api_keys (key_id + name, no plaintext). No tasks stored locally.
- cached_api_keys now includes `key_plain` (server-side use) and `integration` metadata for user-selected platforms.
- External API (external-owned): tasks, jobs, API keys are scoped by the Bearer key used. The shared `.env` `EMAIL_API_KEY` is for development only and returns global tasks (`user_id` null).
- Current behavior: backend proxies using the shared key; `/api` filters external key list to those cached for the signed-in user; usage can filter by selected key; history shows whatever the shared key owns.
- Intended: each user gets their own external API key(s) (per integration/custom), stored in `cached_api_keys`, and proxy calls use that user’s key. The internal “dashboard” key for manual/file verify stays hidden from `/api`.

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

## Current sprint: Initial Verify page (first state only)
- [x] Pull Figma specs for the initial Verify page (layout, spacing, colors, interaction notes) via Figma MCP to drive implementation.  
  Explanation: fetched design context for node `51:306` (Verify initial page) and captured screenshot via Figma MCP (`get_screenshot`, see local session). Confirms layout: shared sidebar/topbar identical to Overview plus footer links (“Privacy Policy & Terms”, “Cookie Pereferences”), manual email input card with textarea + VERIFY button, results panel, file upload section with drag/drop and Browse button, light gray background.
- [x] Implement `/verify` using the shared sidebar/topbar shell: manual entry form + results display + file upload dropzone UI per design; enable nav entry (Overview shell reuse). Include footer per design.  
  Explanation: Refactored shared dashboard shell (sidebar/topbar/footer) and reused it for Overview + new `/verify`. Nav now links to `/verify` (others disabled). Verify page matches Figma: manual email textarea with VERIFY CTA, results panel (shows parsed emails as pending), file upload dropzone with drag/drop + Browse, and footer links. Added front-end limits (max 5 files, 5 MB each) and log events for manual and upload flows; no backend calls yet.
- [ ] Add basic client-side behavior/logging and minimal tests covering form state/validation wiring; leave clear integration hook for FastAPI when contracts arrive. (Logging and parsing in place; automated tests still needed.)
- [ ] Summarize changes and outcomes for newcomers; pause for confirmation before proceeding to popup flow/second Verify state.

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

## Integrations page
- [x] Pull Figma specs via MCP and capture screenshot (node `65:339`). Design: shared shell/footer, three integration cards (Zapier, n8n, Google Sheets), text “More coming soon...”.
- [x] Implement Integrations page UI per Figma using shared shell; render logo cards and supporting text; keep layout responsive. Wire real integration links later.  
  Explanation: Added `/integrations` with three logo cards (Zapier, n8n, Google Sheets) and CTAs linking to `/api` with the selected integration prefilled; copy clarifies keys are universal and integration choice only tags usage. Assets under `public/integrations/*.png`; shared shell/footer reused.

## API page
- [x] Implement simplified API page: card 1 with API keys table (name, masked key, status pill, edit action); card 2 with usage controls (API key dropdown, date range, actions) and line chart placeholder with mock data/empty state. Shared shell/footer reused; console logs for future backend wiring.

## Pricing page
- [x] Implemented Pricing page per Figma: four tier cards in a grid, each with title, “Credits Never Expire” note, price (last card “Contact Us”), feature list, and “Start Verification” CTA. Shared shell/footer reused; typed feature data for now.

## Account page
- [x] Implemented Account page per Figma: profile card with avatar, edit link, username/email/password fields, and Update button; purchase history table with invoice download pills; total credits summary card. Uses typed data and shared shell/footer; backend wiring TBD.

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
- [ ] CORS/Env setup: default allow `http://localhost:3000`; read extra origins from env (staging/prod) via comma-separated `BACKEND_CORS_ORIGINS`. Add `.env.example` documenting keys (`EMAIL_API_BASE_URL/KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `BACKEND_CORS_ORIGINS`, `LOG_LEVEL`, `APP_ENV`, `UPLOAD_RETENTION_DAYS`).
  Explanation: Keeps secrets out of code and makes allowed origins configurable without redeploys.
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
  Explanation: Need endpoints or cron hooks to record usage, strengthen account fields, and schedule purge respecting credits/retention days; will also add tests and frontend calls. External API lacks usage; logging usage into Supabase `api_usage` after each external call; cached API keys stored in `cached_api_keys`.
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

## Supabase schema updates
- [x] Added `cached_api_keys` (key_id PK, user_id FK, name, created_at) with user index for API key caching.
- [x] Added `key_plain` column + user/name index on `cached_api_keys` to store per-user external key secrets for server-side proxying; reserved dashboard keys stay hidden from `/api`.
- [x] Added `integration` column + (user_id, integration) index to `cached_api_keys` to persist user-selected integration for each key.
