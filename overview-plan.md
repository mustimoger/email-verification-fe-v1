# Overview Wiring Plan (backend + frontend)

Goal: replace mock data on `/overview` with real per-user data sourced from our backend/Supabase and the external email verification API.

## Confirmed requirements (current)
- Total Verifications = credits spent (verification counts), not API request counts.
- Total Invalid + Total Catch-all + Validation chart = lifetime totals.
- Credit Usage chart = time series of credits spent over time (recorded in Supabase).
- Current Plan = latest purchased Paddle plan + purchase date.

## Overview data mapping (UI field -> current source -> external API coverage)
- Credits Remaining -> Supabase `user_credits.credits_remaining` -> Not available in external API.
- Total Verifications -> Supabase `api_usage` sum -> Available via external `GET /metrics/verifications` (`total_verifications`) with lifetime/range behavior.
- Total Invalid / Total Catch-all + Validation chart -> Supabase task counts aggregated from `recent_tasks` only -> Available via external `GET /metrics/verifications` (`verification_status`), or per-task metrics from `GET /tasks` (no status field).
- Credit Usage line chart (series) -> Supabase `api_usage` rows -> Not available as time series in external API; only totals for a range.
- Recent Tasks table -> Supabase `tasks` table (status/counts/integration/created_at) -> External `GET /tasks` provides `metrics` + timestamps but no task status or integration; task status requires `/tasks/{id}` detail or inference.
- Current Plan card (plan name + purchase date) -> Supabase `profiles.display_name` + hardcoded “—” date -> Not available in external API; must come from Paddle (`billing_events` + `billing_plans`) or a dedicated plan table.

## Agreed tasks
1) Supabase tasks table (DONE)
   - Added `tasks` table in Supabase: `task_id` (PK, external id), `user_id`, `status`, `email_count`, counts (valid/invalid/catchall), `integration`, timestamps, and index on (user_id, created_at) with updated_at trigger.
   - Seeded demo rows for user `959ce587-7a0e-4726-8382-e70ad89e1232` (musti) to exercise Overview/History once wired.
   - Next: ingest rows when we create or fetch tasks from the external API so Overview/History can read from Supabase without leaking across users.

2) Backend aggregation endpoints (DONE)
   - Created `/api/overview` endpoint that returns:
     - Profile and credits (from Supabase).
     - Usage aggregates: total calls, recent period series from `api_usage` (per api_key_id optional).
     - Task stats: counts by status and recent tasks list from the Supabase `tasks` table (fallback to external `/tasks` until the table is populated).
   - Authenticated and logs usage.
   - Warning: usage totals/series are currently derived from `api_usage`, not from verification counts; file uploads do not increment `api_usage`, so totals can be under-counted.

3) Task ingestion flow (IN PROGRESS)
   - When creating a task via proxy (manual/file), write/update the Supabase `tasks` row with user_id, status, counts (if present), and integration. ✔ (create/list/detail now upsert Supabase tasks with counts where available)
   - When listing/fetching tasks, refresh Supabase records from the external API for the current user to keep statuses current. ✔ (list/detail now upsert)
   - Remaining: external `/tasks/batch/upload` does not return a task_id; need a post-upload polling strategy (fetch `/tasks` for the user key and upsert new ones) to capture file uploads into Supabase. Keep counts mapping aligned with external statuses.

4) Frontend `/overview` wiring (TODO)
   - Replace mock data with fetches to `/api/overview`.
   - Map response fields to the cards, charts, and table; handle loading/error states and empty data gracefully.

5) Decide authoritative metrics for Overview (TODO)
   - Confirm whether “Total Verifications” should reflect credits used (verification counts) or API requests.
   - Confirm whether Validation totals should be lifetime totals or scoped to the chart’s selected range.
   - Confirm whether Credit Usage line chart should be based on verification counts (tasks) or API request logs.
   - Confirm Current Plan display source (Paddle billing data vs profile display_name).
   - Warning: current UI uses only recent tasks to compute validation totals, which can under-report lifetime totals.

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

8) Frontend: use server-calculated totals (TODO)
   - Use backend-provided lifetime totals for stats and validation chart instead of summing `recent_tasks`.
   - Use backend-provided credit usage series for the line chart.
   - Render Current Plan name + purchase date from backend data.
   - Handle missing totals gracefully with explicit “No data” messaging.

9) Tests and verification (TODO)
   - Backend unit tests for new `/api/overview` aggregation behavior (tasks summary + external metrics merge).
   - Integration test for `/api/overview` to validate missing data handling and logging.
   - Frontend tests for empty/partial states once data sources are switched.

5) Tests and validation (IN PROGRESS)
   - Added backend test for `/api/overview` aggregation logic. ✔
   - Remaining: add frontend checks/tests to ensure Overview renders real data and error/empty states gracefully.

Notes:
- External task source remains the email verification API; Supabase caches per-user task metadata for aggregation/safety.
- External API metrics endpoints (`/metrics/verifications`, `/metrics/api-usage`) return lifetime totals by default and range totals when `from`/`to` are provided; they do not return time series.
- API keys remain per-user; task ingestion uses the resolved per-user external key (dashboard key). Current dev key (`9a56…e47b`) cannot create keys via `/api-keys` (401), so new users will need either a key with that permission or a fallback to serve Supabase-only tasks until a proper key flow is in place.
- Auth guard hardening: dashboard shell now hides/redirects when unauthenticated (uses shared `resolveAuthState` helper); ensures signed-out users only see auth pages and avoids sidebar/header/footer flashes on load.
- Dashboard key bootstrap: `/api/api-keys/bootstrap` resolves/creates the hidden dashboard key and caches it (no secret returned); frontend triggers it after session, so backend remains the sole external API caller and Supabase stays the UI source of truth.
- Overview UI now consumes backend data: added mapping helpers/tests (status normalization, date formatting, count aggregation) and wired stats/validation/recent tasks to Supabase-backed `/api/overview` response instead of mock placeholders.
- API keys list cache fallback: `/api/api-keys` now falls back to Supabase-cached keys (dashboard filtered unless requested) when external `/api-keys` is unavailable, preventing 5xx during upstream auth outages.
- Webhook-first option: if the external API provides global usage/task webhooks, switch ingestion to webhook-first with polling as fallback (see `verify-plan.md`).

## Dashboard navigation latency (investigation)
- [x] Reproduce the 60s sidebar navigation delay and "Failed to fetch" errors in `DashboardShell`/`/api` using Playwright with `key-value-pair.txt` localStorage; capture console/network logs and identify the failing endpoints/base URL before changing code.
  - Result: Not reproducible with the provided token. Sidebar navigation to `/overview`, `/api`, `/history`, `/pricing` was fast and no "Failed to fetch" errors appeared. Runtime calls were made to `http://localhost:8001/api/*` and all returned 200. Console only showed chart sizing warnings and a logo aspect ratio warning. Please confirm the backend base URL/port in your environment or provide a session that triggers the failure so we can capture it.
