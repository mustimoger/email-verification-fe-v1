# Non-Dashboard API Usage Plan

Goal: track and display usage/credits for API keys used outside our app (Zapier, n8n, Google Sheets, Custom) by syncing external API data into Supabase and surfacing it in the dashboard. Follow first principles: simplest working MVP, then iterate.

## External API surface (from api-docs.json)
- `/api/v1/api-keys` (GET/POST, Bearer JWT; plaintext returned once on create)
- `/api/v1/api-keys/{id}` (DELETE)
- `/tasks` (GET list)
- `/tasks/{id}` (GET detail)
- `/verify` (POST single email)
- `/tasks/batch/upload` (POST file; upstream to add task_id mapping per convo)
- No explicit usage endpoint; we must infer usage from tasks/verify calls per key.

## Plan (steps)
1) **Reliable key listing/creation**
   - Ensure `/api-keys` calls use real Supabase JWT, handle upstream 500s with cache fallback, and surface empty state gracefully in UI. Add structured logs to detect upstream failures.

2) **Usage ingestion for external key calls**
   - MVP: poll external `/tasks` per user-owned key (including integration tag) and upsert into Supabase `tasks` with counts/status/integration. Use pagination and `updated_at` filters if available; otherwise, recent window.
   - Derive usage per key by counting tasks/verify calls (email_count or 1) and write to Supabase `api_usage` with `api_key_id` + period.

3) **Credits deduction**
   - On ingest, decrement `user_credits` by the processed email_count (or 1 for verify) for tasks belonging to that user/key. Guard against negative credits; log deductions.

4) **Frontend wiring for external usage**
   - `/api` page: show usage per key from Supabase `api_usage`; if external sync fails, show cached data and a warning badge.
   - `/history`: continue showing Supabase tasks; add a “last synced” indicator and retry action if sync failed.

5) **Scheduling/webhooks**
   - Add a backend cron/worker (env-gated) to poll external tasks per user key periodically; record last sync per key in Supabase.
   - Alternative (preferred if provided by external API): consume global webhooks for task/usage events per API key, updating Supabase `tasks`/`api_usage` and last-sync metadata; keep polling as fallback.

6) **Integration metadata**
   - Preserve integration type when creating keys; include it in usage aggregation and UI filters. Ensure ingestion tags tasks with the key’s integration when known.

7) **Edge cases and tests**
   - Handle external errors (401/500) without breaking UI; retry with backoff. Add tests for ingestion/upsert, credit deduction, and cache fallback when external is down.

Notes:
- Upstream `/tasks/batch/upload` should return task_id; once available, reduce polling.
- Payment/credit purchase flow is not wired; credits currently static in Supabase.
