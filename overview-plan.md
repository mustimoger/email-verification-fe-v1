# Overview Wiring Plan (backend + frontend)

Goal: replace mock data on `/overview` with real per-user data sourced from our backend/Supabase and the external email verification API.

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

3) Task ingestion flow (IN PROGRESS)
   - When creating a task via proxy (manual/file), write/update the Supabase `tasks` row with user_id, status, counts (if present), and integration. ✔ (create/list/detail now upsert Supabase tasks with counts where available)
   - When listing/fetching tasks, refresh Supabase records from the external API for the current user to keep statuses current. ✔ (list/detail now upsert)
   - Remaining: confirm upload path upserts once external returns an id; ensure counts mapping stays consistent with external statuses.

4) Frontend `/overview` wiring (TODO)
   - Replace mock data with fetches to `/api/overview`.
   - Map response fields to the cards, charts, and table; handle loading/error states and empty data gracefully.

5) Tests and validation (IN PROGRESS)
   - Added backend test for `/api/overview` aggregation logic. ✔
   - Remaining: add frontend checks/tests to ensure Overview renders real data and error/empty states gracefully.

Notes:
- External task source remains the email verification API; Supabase caches per-user task metadata for aggregation/safety.
- API keys remain per-user; task ingestion uses the resolved per-user external key (dashboard key).
