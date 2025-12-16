# Overview Wiring Plan (backend + frontend)

Goal: replace mock data on `/overview` with real per-user data sourced from our backend/Supabase and the external email verification API.

## Agreed tasks
1) Supabase tasks table
   - Add a minimal `tasks` table to Supabase to store task metadata per user: `task_id` (external id, PK), `user_id`, `status`, `email_count`, `created_at`, `updated_at`, `integration` (nullable), and optional stats (valid/invalid/catchall if available). Index on `user_id`, `created_at`.
   - Ingest rows when we create or fetch tasks from the external API so Overview/History can read from Supabase without leaking across users.

2) Backend aggregation endpoints
   - Create an `/api/overview` endpoint that returns:
     - Profile and credits (from Supabase).
     - Usage aggregates: total calls, recent period series from `api_usage` (per api_key_id optional).
     - Task stats: counts by status and recent tasks list from the Supabase `tasks` table (fallback to external `/tasks` until the table is populated).
   - Ensure all calls are authenticated and log usage.

3) Task ingestion flow
   - When creating a task via proxy (manual/file), write/update the Supabase `tasks` row with user_id, status, counts (if present), and integration.
   - When listing/fetching tasks, refresh Supabase records from the external API for the current user to keep statuses current.

4) Frontend `/overview` wiring
   - Replace mock data with fetches to `/api/overview`.
   - Map response fields to the cards, charts, and table; handle loading/error states and empty data gracefully.

5) Tests and validation
   - Add backend tests for `/api/overview` aggregation logic.
   - Add frontend tests (or at least manual checks) to ensure Overview renders real data paths and handles errors/empty states.

Notes:
- External task source remains the email verification API; Supabase will cache per-user task metadata for aggregation/safety.
- API keys remain per-user; task ingestion should use the resolved per-user external key (dashboard key).
