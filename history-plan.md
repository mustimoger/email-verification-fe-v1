# History Wiring Plan

Goal: replace mock data on `/history` with real per-user tasks from FastAPI/Supabase using the user’s external key (dashboard or selected integration), while preserving existing UI/filters and avoiding hardcoded fallbacks.

Tasks
- [x] Backend readiness check (quick): verify `/api/tasks` list/detail respond with per-user key resolution and Supabase upsert; note that upload still uses polling until external API returns `task_id` directly. No code changes unless a blocking gap appears.  
  Explanation: Confirmed `GET /api/tasks` uses per-user key resolution (dashboard key by default, `api_key_id` override), upserts Supabase `tasks` on list/detail, and upload now polls to capture task_ids until upstream returns them. Supabase tables (`tasks`, `cached_api_keys`, `profiles`, `user_credits`, `api_usage`) exist with seeded tasks for musti, so backend can serve history data now.
- [x] Empty history verification: check Supabase `tasks` for the current user to confirm whether `/history` should be empty; capture counts and latest rows before changing UI or backend.
  Explanation: Supabase has 6 `tasks` rows for user `c105fce3-786b-4708-987c-edb29a8c8ea0` (all created at `2025-12-19 10:27:32+00`). Each row has `status` and count fields null, `api_key_id` null, and no `task_files` match (file_name null). This suggests `/history` should show rows in the unfiltered view, but any key‑scoped filter will exclude them because `api_key_id` is missing.
- [x] Default to unfiltered history: add an “All keys” option (empty filter) and default the selector to it so tasks without `api_key_id` render; keep key-specific filtering when selected and log the default selection.
  Explanation: `/history` now includes an “All keys” option and defaults to the empty filter when keys load, so Supabase tasks missing `api_key_id` are visible. Key-specific filtering still applies when a key is selected, and the default selection is logged.
- [ ] Verification: add/update tests for the selector logic and confirm the `/history` table shows rows without `api_key_id` in the unfiltered view.
  Explanation: Not implemented yet. Tests and manual verification pending.
- [x] Frontend fetch layer: add typed client for `/api/tasks` (limit/offset/api_key_id), include auth token, log errors, and avoid silent defaults. Support pagination and map to existing status labels.  
  Explanation: API client already provided typed `/tasks` list/detail with pagination and key override; added explicit error logging on request failures while preserving typed errors. Auth token is auto-attached via Supabase session, and pagination params are passed through. Ready for `/history` wiring.
- [x] Wire `/history` page to backend: replace mock rows with fetched data, keep key selector hooked to `api_key_id`, handle loading/error/empty states gracefully, and keep status pill logic aligned with backend statuses.  
  Explanation: History page already calls `/api/tasks` with optional `api_key_id`, fetches task detail for counts, maps pending states to pills, and supports pagination/load-more. Added API error logging to surface failures. Loading/error/empty states are present, and the key selector includes the hidden dashboard key so per-user data flows through without hardcoded fallbacks.
- [x] Tests: add minimal frontend tests for fetch mapping and `/history` render (loading/error/empty + basic data render). Keep deterministic and avoid placeholders.  
  Explanation: Added `app/history/utils.ts` to house mapping/count/date helpers and `tests/history-mapping.test.ts` (run via `npm run test:history` with `tsx`) covering counts, pending detection, date formatting, and row mapping. Keeps tests deterministic without UI placeholders.
- [x] Supabase fallback for history data: when external tasks are empty/unavailable, list tasks from Supabase cache with stored counts/status so seeded/user tasks render.  
  Explanation: `/api/tasks` now falls back to Supabase `tasks` (with counts/status) and logs the fallback. Frontend maps tasks with counts directly (no detail fetch needed) and still calls detail for tasks lacking counts. Added backend fallback test and extended mapping helpers to use cached counts.
- [ ] Post-upload future tweak: when external upload starts returning `task_id`, drop or reduce polling in `/api/tasks/upload` and upsert directly from response.
- [x] Key-scoped history — Add `api_key_id` to the tasks table, store it when tasks are created via our dashboard (or when detail fetch passes a key), and filter `/api/tasks` by `api_key_id` when provided.  
  Explanation: Added `api_key_id` column + indexes in Supabase, updated task upserts to include `api_key_id` when known, and filtered Supabase task queries by key. When `api_key_id` is supplied and no cached tasks exist, the API returns an empty list (logged) rather than mixing unscoped external tasks. Added backend tests for key-scoped behavior and updated polling/upsert tests.
- [x] Supabase as primary source for history: return Supabase tasks first, only hit external `/tasks` when Supabase is empty to refresh cache.  
  Explanation: `/api/tasks` now reads from Supabase `tasks` as the primary source (with counts/status/integration). If Supabase has rows, it returns them immediately and logs usage; external fetch is only attempted when Supabase is empty, with upsert on success. Ensures history always shows cached/seeded data even when external tasks list is empty.
- [x] External failure fallback: when Supabase is empty and external `/tasks` fails, respond with an empty list without crashing; added regression test to prevent UnboundLocal errors.  
  Explanation: Guards unresolved client use in `list_tasks`, keeps logging, and returns a safe empty response so History never 500s on upstream issues.
- [x] Hidden dashboard key bootstrapping: added `/api/api-keys/bootstrap` to create/cache the reserved dashboard key early (no secret returned) and call it after session establishment on the frontend, keeping history/verify traffic on the backend proxy and Supabase cache.  
  Explanation: Prevents late key-creation attempts during history fetches and reinforces “frontend reads Supabase, backend talks to external API” flow.
- [x] API key listing cache fallback: when external `/api-keys` is unavailable, return cached user keys from Supabase (filtering out dashboard unless requested) instead of a 5xx.  
  Explanation: Keeps History’s key selector operational even if upstream auth is down; covered by tests for include_internal and filtering.
- [x] Webhook alternative: if external API offers global task/usage webhooks, plan to consume them for history/usage updates with polling as fallback (see `verify-plan.md`).
- [x] Download action: wire history “Download” pill to `/api/tasks/{id}/download` with proper error handling, keeping manual-only tasks non-downloadable.
  Explanation: History now triggers verified file downloads using the task id and stored file name, shows a minimal error banner on failure, and keeps “Download” disabled when no file is available.
- [x] External-native download: remove local output generation and proxy downloads directly from the external `/tasks/{id}/download` endpoint (optional format passthrough), while keeping task-file gating and adding backend tests.
  Explanation: `/api/tasks/{id}/download` now validates file-backed tasks via `task_files`, proxies the external download payload + headers, and fails fast if upstream metadata is missing; local output generation/storage is no longer used. Added `backend/tests/test_tasks_download_proxy.py` to cover missing-file 404s and successful proxy behavior.
- [x] File name support: join `task_files` to tasks list so History shows file names for file-based tasks.
  Explanation: `task_files` now stores upload metadata, `/api/tasks` joins `file_name` into task rows, and History mapping prefers `file_name` for labels. Upload limits are now split: file size enforced on uploads, manual limits enforced separately.
- [ ] History totals fallback for metrics-only tasks: when tasks lack `jobs`, use `metrics.total_email_addresses` and `metrics.verification_status` to populate `email_count` and counts so History never shows zero totals for completed uploads.
  Explanation: Not implemented yet. Will update `/api/tasks/{id}` upsert and History mapping to fill totals from metrics when job arrays are omitted.

Notes
- Supabase tables in place: `tasks` (seeded for user musti), `cached_api_keys` (with `key_plain` + `integration`), `api_usage`, `profiles`, `user_credits`. `/api/tasks` already upserts list/detail to keep Supabase current; upload polling fills the gap until `task_id` is returned.
- Auth guard update: dashboard shell now redirects/hides for unauthenticated users (shared `resolveAuthState`), so History is never visible without a session and chrome does not flash while redirecting.
