# Handover (Overview wiring, tasks ingestion, auth/keys)

## Current state
- Auth: Supabase JWT validated (HS/RS), frontend attaches Bearer, guarded pages. Account profile/credits endpoints validate EmailStr and log usage.
- Keys: per-user external key resolution; hidden `dashboard_api` used for verify/tasks. Integration metadata stored on cached keys; `/api` page shows only integration/custom keys.
- Tasks ingestion: Supabase `tasks` table created (task_id PK, counts, integration). Create/list/detail routes now upsert per-user tasks into Supabase (counts when available). Seeded demo tasks for user musti (`959ce587-7a0e-4726-8382-e70ad89e1232`). File upload still lacks task_id (see gaps).
- Overview: new `/api/overview` aggregates profile, credits, usage total/series (from `api_usage`), task counts, and recent tasks (from Supabase). Frontend `/overview` now fetches real data and replaces mocks; preserves design, adds loading/error/empty states. Backend tests cover overview aggregation.
- Maintenance: `/api/maintenance/purge-uploads` exists; scheduler deferred to enhancement. Retention cron to be set up later in deploy.
- Env/CORS: `.env.example` added; CORS splits comma-separated origins.
- Tests: backend suites for auth, api-keys, account, overview, maintenance pass; lint passes.

## Open gaps / TODOs
- File upload tasks: external `/tasks/batch/upload` does not return task_id. Need a post-upload polling strategy (call `/tasks` for the user key, upsert new tasks) to capture uploads into Supabase.
- Overview frontend tests still missing; only manual/lint/back-end tests exist.
- Retention scheduler enhancement (cron/in-app) deferred; OpenAPI not regenerated.
- Account fields beyond email/display_name still minimal; usage ingestion mostly covered but confirm any remaining routes.

## Next steps (suggested)
1) Implement upload polling: after `/tasks/upload`, trigger a background fetch of `/tasks` for the user key and upsert into Supabase `tasks` (or add a manual button). Avoid design changes.
2) Add minimal frontend tests/checks for `/overview` rendering (loading/error/empty).
3) (Enhancement later) Add cron/in-app scheduler for retention, regenerate api-docs if needed.

## Quick refs
- Seed user: `mustimoger@gmail.com` id `959ce587-7a0e-4726-8382-e70ad89e1232` (has demo tasks).
- New endpoint: `GET /api/overview` returns profile/credits/usage/task stats.
- Tasks table: Supabase `tasks` upserts now happen on create/list/detail; upload pending.
