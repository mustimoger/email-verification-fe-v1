# Overview Wiring Plan (backend + frontend)

Goal: replace mock data on `/overview` with real per-user data sourced from our backend/Supabase and the external email verification API.

## Confirmed requirements (current)
- Total Verifications = credits spent (verification counts), not API request counts.
- Total Invalid + Total Catch-all + Validation chart = lifetime totals.
- Credit Usage chart = time series of credits spent over time (recorded in Supabase).
- Current Plan = latest purchased Paddle plan + purchase date.

## Overview data mapping (UI field -> current source -> external API coverage)
- Credits Remaining -> Supabase `user_credits.credits_remaining` -> Not available in external API.
- Total Verifications -> Supabase tasks usage summary (`summarize_tasks_usage`) -> Available via external `GET /metrics/verifications` (`total_verifications`) with lifetime/range behavior.
- Total Invalid / Total Catch-all + Validation chart -> External `GET /metrics/verifications` (`verification_status`) lifetime totals -> External `/tasks/{id}` provides per-task detail counts; `/tasks` list lacks status.
- Credit Usage line chart (series) -> Supabase tasks usage summary (`summarize_tasks_usage`) -> Not available as time series in external API; only totals for a range.
- Recent Tasks table -> Supabase `tasks` table (status/counts/integration/created_at) -> External `GET /tasks` provides `metrics` + timestamps but no task status or integration; task status requires `/tasks/{id}` detail or inference.
- Current Plan card (plan name + purchase date) -> Supabase `billing_purchases` + `billing_plans` -> Not available in external API.

## Agreed tasks
1) Supabase tasks table (DONE)
   - Added `tasks` table in Supabase: `task_id` (PK, external id), `user_id`, `status`, `email_count`, counts (valid/invalid/catchall), `integration`, timestamps, and index on (user_id, created_at) with updated_at trigger.
   - Seeded demo rows for user `959ce587-7a0e-4726-8382-e70ad89e1232` (musti) to exercise Overview/History once wired.
   - Next: ingest rows when we create or fetch tasks from the external API so Overview/History can read from Supabase without leaking across users.

2) Backend aggregation endpoints (DONE)
   - Created `/api/overview` endpoint that returns:
     - Profile and credits (from Supabase).
     - Usage aggregates: credits spent totals/series from `tasks` (`summarize_tasks_usage`).
     - Task stats: counts by status and recent tasks list from the Supabase `tasks` table (fallback to external `/tasks` until the table is populated).
   - Authenticated and logs usage.

3) Task ingestion flow (IN PROGRESS)
   - When creating a task via proxy (manual/file), write/update the Supabase `tasks` row with user_id, status, counts (if present), and integration. ✔ (create/list/detail now upsert Supabase tasks with counts where available)
   - When listing/fetching tasks, refresh Supabase records from the external API for the current user to keep statuses current. ✔ (list/detail now upsert)
   - Uploads: `/tasks/batch/upload` responses now include `task_id`, so uploads are mapped directly without polling; task counts are fetched per task id and upserted.

4) Frontend `/overview` wiring (DONE)
   - UI consumes `/api/overview` for stats, usage series, recent tasks, and current plan details.
   - Validation totals and charts now use backend `verification_totals`.

5) Decide authoritative metrics for Overview (DONE)
   - Total Verifications = credits spent (verification counts).
   - Validation totals = lifetime totals.
   - Credit Usage = credits spent time series from Supabase tasks.
   - Current Plan = latest Paddle purchase (billing data).

6) Backend: record credit usage with time series (DONE)
   - Usage totals/series now derive from Supabase `tasks` via `summarize_tasks_usage`, so “Credit Usage” reflects credits spent (verification counts) over time.
   - Logs when totals are missing or invalid instead of silently defaulting.
   - Counts still depend on tasks being upserted with email_count or status totals.

6.1) Supabase schema: add `billing_purchases` table (DONE)
   - Table already exists via migration `20251221122950_create_billing_purchases_table` and is present in Supabase.
   - This is now the source for “Current Plan” in `/api/overview`.

7) Backend: align `/api/overview` with authoritative sources (DONE)
   - `/api/overview` now uses `summarize_tasks_usage` for credits‑spent totals + series.
   - Lifetime validation totals come from external `GET /metrics/verifications` and are exposed as `verification_totals`.
   - “Current Plan” now uses the latest `billing_purchases` row and maps `price_ids` to `billing_plans`; if multiple items, returns label “Multiple items” and all plan names.
   - External metrics failures are logged and return `verification_totals: null` to avoid silent fallbacks.
   - Warning: external `/tasks` list does not include task status; if status is required, fetch `/tasks/{id}` for recent tasks or infer cautiously.

8) Frontend: use server-calculated totals (DONE)
   - Uses `verification_totals` for stats/validation and `current_plan` for plan card.
   - Adds explicit empty-state messaging for charts when data is missing.

9) Tests and verification (IN PROGRESS)
   - Added backend test for `/api/overview` aggregation logic. ✔
   - Remaining: add frontend checks/tests to ensure Overview renders `verification_totals` + `current_plan`, plus empty/partial states.

10) Overview "Verification Tasks" card data + columns (NEW)
    - Update UI column headers: "Task Name" (Dashboard vs integration purpose), "Total Emails", "Date", "Valid", "Invalid", "Catch-All", "Status".
    - Task Name rules: show "Dashboard" for dashboard-origin tasks; otherwise show the integration purpose (Zapier, n8n, Google Sheets, etc.).
    - External `/tasks` list does NOT include integration/purpose, so we must rely on Supabase `tasks.integration` (or add mapping via `api_key_id` if missing).
    - Add/extend mapping + unit tests to cover missing integration, dashboard tasks, and catch-all counts.
    - Document any remaining gaps (e.g., tasks without integration data) and log clearly rather than silently defaulting.
    - Update: Implemented frontend mapping + UI columns. The table now shows Total Emails/Date/Catch-All columns, and Task Name resolves via integration list labels with a Dashboard fallback. Added mapping tests to validate dashboard and integration labeling and catch-all counts. Added warnings when integration labels are missing so we don't silently mislabel.
    - Gap: If a task has no integration data, the UI falls back to "Dashboard" and logs a warning.

11) Backend: enrich Overview tasks with API key integration (NEW)
    - Fetch cached API keys (id -> integration label) for the user.
    - When `tasks.integration` is missing, fill it from the matching `api_key_id` so Overview can label non-dashboard tasks.
    - Do not expose `api_key_id` to the frontend; use it only for enrichment and log when missing/unmapped.
    - Update: Added cached key integration map helper and used it in task summary to backfill integration from `api_key_id`. We now strip `api_key_id` from the response and log unmapped/missing cases for debugging.

12) Overview: manual refresh for Verification Tasks (NEW)
    - Add a "Refresh" button at the top-right of the Verification Tasks card (left of the Month label).
    - Refresh should re-fetch only the tasks list (not the entire overview payload).
    - Show a loading state and log failures instead of silently failing.
    - Update: Added refresh button and tasks-only fetch via `/tasks` in the Overview page. The refresh updates only the tasks list, shows a loading state, and logs failures without reloading the rest of the overview payload.

13) Overview: job_status pill + breakdown popover (NEW)
    - Persist external `metrics.job_status` in Supabase tasks (`job_status` JSONB).
    - Update `/api/overview` + `/tasks` responses to include job_status in task rows.
    - Status pill shows a single label + count using priority rule: Processing (pending+processing) > Failed > Completed > Unknown.
    - Clicking the pill opens a minimal popover (50% opacity card) with the full job_status breakdown.
    - Manual refresh should force an external `/tasks` sync so job_status reflects current state.
    - Update: Added `job_status` column to Supabase tasks, persisted job_status from external metrics, included it in task summary responses, and added a refresh flag on `/tasks` that triggers an external sync before returning cached tasks.
    - Update: Frontend now shows a status pill using priority rule (Processing > Failed > Completed > Unknown) with counts, and clicking opens a 50%-opacity popover showing the full job_status breakdown. Refresh button now calls `/tasks?refresh=true` to sync job_status before rendering.
    - Update: API client types updated to include `job_status` and the `refresh` query flag for task fetches.

14) Overview: status pill layout + popover layering (NEW)
    - Ensure the status column has enough width so pills do not overflow; adjust grid column sizing to allocate more space to the Status column without disrupting overall layout.
    - Ensure the status breakdown popover layers above pills/rows (z-index/stacking context fix).
    - Document any residual layout issues and avoid changing the visual design.
    Explanation: Implemented custom grid column widths to give the Status column more room and raised the status popover z-index so it renders above the pills without changing the overall design language.

15) Overview: auth-aware fetch gating (DONE)
    - Delay `/overview` + `/integrations` fetches until the Supabase session is hydrated.
    - Avoid logging `api.request_failed` for unauthenticated requests triggered immediately after redirect.
    - Keep UI/UX unchanged; this is backend wiring only.
    Explanation: Overview now checks `useAuth` session + loading before firing the fetch effects, so API calls only occur after session hydration and 401s no longer occur during the initial redirect.

16) Overview: metrics timeout + fallback (NEW)
    - Add a short, configurable timeout for external `/metrics/verifications` calls so `/api/overview` does not hang on upstream slowdowns.
    - When metrics are unavailable, fall back to Supabase task counts for `verification_totals` (log clearly that the fallback was used).
    - Add timing logs for `/api/overview` to pinpoint slow dependencies (Supabase vs external).
    - Add unit tests for timeout/fallback behavior and one integration test hitting `/api/overview` with a forced external timeout.
    - Update: Added a configurable `overview_metrics_timeout_seconds` setting and enforced it in `/api/overview` so slow external metrics no longer block the whole payload. Added a Supabase fallback that aggregates valid/invalid/catchall counts when external metrics are unavailable, with explicit logs for timeout/fallback/unavailable cases. Added timing metrics to `overview.fetched` log so we can pinpoint slow dependencies quickly.
    - Update: Added backend tests covering external metrics timeout and error fallback paths; tests stub settings and external clients to avoid env dependencies.
    - Findings: `backend/logs/uvicorn.log` shows frequent `overview.verification_metrics_error` entries followed by `/api/overview` responses ~30s later. This indicates the external `/metrics/verifications` call is timing out or failing and was previously blocking the entire Overview payload, causing slow page loads and empty stat cards.
    - Findings: For `mkural2016@gmail.com` (user_id `804f8cca-a1c0-4f92-90b7-b7f27eab91a1`), Supabase has tasks but no `user_credits` row and no `billing_purchases` rows, so Credits Remaining and Current Plan will show empty/zero even when Overview loads. The fallback now uses task counts for validation totals when external metrics are unavailable.
    - Findings: Logs show repeated `tasks.summary_counts_failed` during Overview fetch; this is noisy but not the primary source of the slow load (needs separate investigation if we want to clean up errors).

17) Overview: validation chart hover note (NEW)
    - Add a subtle helper note in the Validation card to tell users to hover the chart to see counts since labels are hidden.
    - Keep typography/spacing consistent with the existing card style and ensure it works on mobile.
    - Update: Added a centered, subtle helper line under the Validation chart that instructs users to hover for exact numbers. Kept the sizing and color consistent with other helper text so the card design remains unchanged across breakpoints.
    - Tests: `npm run test:overview`, `npm run test:history`, `npm run test:auth-guard`, `npm run test:account-purchases`.

18) Overview: external metrics probe script (NEW)
    - Add a minimal script that calls the external `/metrics/verifications` endpoint using the existing ExternalAPI client and settings.
    - Accept the bearer token via CLI arg or env, with optional `user_id`, `from`, `to`, and timeout overrides to isolate slow responses.
    - Log timing and errors clearly; avoid hardcoded base URLs or secrets.
    - Update: Added `backend/scripts/test_verification_metrics.py` to call `/metrics/verifications` via `ExternalAPIClient`, accept token/base URL + optional filters, and emit timing + error logs so slow external responses can be diagnosed without touching the app.
    - Update: Ran the script with env-driven base URL + token; response returned `401 Authentication failed` in ~5.47s, indicating the current token is invalid or missing required claims.

19) Overview: status popover clipping fix (NEW)
    - Allow the status breakdown popover to render outside the table container when a pill is clicked.
    - Keep the table’s visual design intact (rounded corners, borders, spacing).
    - Update: Switched the Verification Tasks table wrapper to `overflow-visible` so the status popover can render beyond the container without being clipped, while leaving borders and spacing unchanged.
    - Tests: `npm run test:overview`, `npm run test:history`, `npm run test:auth-guard`, `npm run test:account-purchases`.

20) Overview: add catch-all slice to Validation chart (NEW)
    - Include catch-all counts in the Validation chart alongside valid/invalid using `verification_totals.catchall`.
    - Ensure the tooltip/legend reflects the additional slice without hardcoded fallback values.
    - Update: Backend now falls back to `total_catchall` from `/metrics/verifications` when `verification_status` omits catch-all, so `verification_totals.catchall` is always populated. The Overview Validation pie already renders Catch-all, so the chart now includes that slice when the API reports it.

Notes:
- External task source remains the email verification API; Supabase caches per-user task metadata for aggregation/safety.
- External API metrics endpoints (`/metrics/verifications`, `/metrics/api-usage`) return lifetime totals by default and range totals when `from`/`to` are provided; they do not return time series.
- API keys remain per-user; task ingestion uses the resolved per-user external key (dashboard key). Current dev key (`9a56…e47b`) cannot create keys via `/api-keys` (401), so new users will need either a key with that permission or a fallback to serve Supabase-only tasks until a proper key flow is in place.
- Auth guard hardening: dashboard shell now hides/redirects when unauthenticated (uses shared `resolveAuthState` helper); ensures signed-out users only see auth pages and avoids sidebar/header/footer flashes on load.
- Dashboard key bootstrap: `/api/api-keys/bootstrap` resolves/creates the hidden dashboard key and caches it (no secret returned); frontend triggers it after session, so backend remains the sole external API caller and Supabase stays the UI source of truth.
- Overview UI now uses backend lifetime totals and current plan data; multiple purchase items render a “Multiple items” label and show plan chips.
- API keys list cache fallback: `/api/api-keys` now falls back to Supabase-cached keys (dashboard filtered unless requested) when external `/api-keys` is unavailable, preventing 5xx during upstream auth outages.
- Webhook-first option: if the external API provides global usage/task webhooks, switch ingestion to webhook-first with polling as fallback (see `verify-plan.md`).

## Dashboard navigation latency (investigation)
- [x] Reproduce the 60s sidebar navigation delay and "Failed to fetch" errors in `DashboardShell`/`/api` using Playwright with `key-value-pair.txt` localStorage; capture console/network logs and identify the failing endpoints/base URL before changing code.
  - Result: Not reproducible with the provided token. Sidebar navigation to `/overview`, `/api`, `/history`, `/pricing` was fast and no "Failed to fetch" errors appeared. Runtime calls were made to `http://localhost:8001/api/*` and all returned 200. Console only showed chart sizing warnings and a logo aspect ratio warning. Please confirm the backend base URL/port in your environment or provide a session that triggers the failure so we can capture it.
