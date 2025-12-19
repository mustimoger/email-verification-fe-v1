# Non-Dashboard API Usage Plan

Goal: track and display usage/credits for API keys used outside our app (Zapier, n8n, Google Sheets, Custom) by syncing external API data into Supabase and surfacing it in the dashboard. Follow first principles: simplest working MVP, then iterate.

## External API surface (from api-docs.json)
- `/api/v1/api-keys` (GET/POST, Bearer JWT; plaintext returned once on create)
- `/api/v1/api-keys/{id}` (DELETE)
- `/tasks` (GET list)
- `/tasks/{id}` (GET detail)
- `/verify` (POST single email)
- `/tasks/batch/upload` (POST file; upstream to add task_id mapping per convo)
- `/metrics/api-usage` (GET): usage grouped by API key purpose; supports `from`/`to` (RFC3339) + optional `user_id` for admins.
- `/metrics/verifications` (GET): verification metrics with `from`/`to` filters and totals.
- No per‑key usage endpoint; per‑key + date range requires local ingestion.

## Plan (steps)
0) **Re-check updated api-docs.json**
   - Done (latest docs): GET `/api-keys` list now includes `APIKeySummary.total_requests` and accepts `from`/`to` (filtered by `last_used_at`), providing per‑key totals. `/metrics/api-usage` still returns purpose‑level totals. `/tasks` filtering supports `user_id` and date range only, no `api_key_id` filter.
   - Why: We can implement per‑key usage directly from `/api-keys` and per‑purpose usage from `/metrics/api-usage` without local ingestion.

1) **Reliable key listing/creation**
   - Ensure `/api-keys` calls use real Supabase JWT, handle upstream 500s with cache fallback, and surface empty state gracefully in UI. Add structured logs to detect upstream failures.

2) **Usage ingestion for external key calls**
   - Use `/metrics/api-usage` for purpose‑level summaries and last_used timestamps (good for high‑level stats).
   - Use GET `/api-keys` with `from`/`to` to fetch per‑key totals via `total_requests` in each key summary.
   - Keep the per‑key ingestion fallback (poll `/tasks` per key) only if `/api-keys` totals prove insufficient.
   - Status: backend wiring for `/api-keys` date range + `/metrics/api-usage` proxy is complete; UI wiring is next.

3) **Credits deduction**
   - On ingest, decrement `user_credits` by the processed email_count (or 1 for verify) for tasks belonging to that user/key. Guard against negative credits; log deductions.

4) **Frontend wiring for external usage**
   - `/api` page: allow selecting usage view mode (per‑key vs per‑purpose). Per‑key reads from GET `/api-keys?from&to` and uses `total_requests`. Per‑purpose reads `/metrics/api-usage`.
   - Provide a single usage card with a view selector and dynamic dropdown; avoid extra UI sections to keep the design stable.
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
- Dashboard usage summary now uses `/api/usage/summary` (aggregated from Supabase `tasks`). External usage integration is still pending.
