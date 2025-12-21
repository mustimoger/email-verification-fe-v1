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
