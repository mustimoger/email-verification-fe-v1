# Handover — External API First Refactor (Phase 1 in progress)

## Context & Decisions
- External API is the **single source of truth** for verification data, tasks, usage, and API keys.
- Supabase should remain **only** for profiles, billing, credit ledger/purchases, and a **minimal reservation store** for credit idempotency.
- If external data is missing, UI must keep the field and show the exact message: `ext api data is not available`.
- Manual copy‑paste verification should create a **task** (`POST /api/v1/tasks`) so history/export can be driven by `/api/v1/tasks/{id}/jobs`.
- `/api/v1/verify` remains realtime and **does not return task_id**; it is not suitable for manual history/export.
- External API docs now include `/api/v1/tasks/{id}/jobs` with nested email verification details (role/disposable/MX/server/validated_at/etc.).
- Credit write-back to Supabase is pending: external API dev is waiting on final schema.

## Work Completed (Prior Sessions)
- Phase 0 dependency gap documentation added to `refactor.md` (IMPORTANT NOTE section with missing fields).
- Phase 1 backend task proxying completed:
  - `/api/tasks`, `/api/tasks/{id}`, `/api/tasks/{id}/download`, `/api/tasks/upload` now call the external API directly (no Supabase task caching).
  - `/api/tasks/latest-upload(s)` now return 204 and log `ext_api_missing_file_name` because the external API does not provide file_name on list/detail yet.
  - Manual results and credit reservations still write minimal rows to `tasks` so credit reservations/manual results remain functional.
- Task reservation upserts updated so reservations/manual emails can be stored without a prior task row.
- Backend tests updated to match external-only behavior and to use async ASGI clients.
- Removed obsolete upload polling test.
- Phase 1 frontend History wiring completed:
  - History mapping now uses external task metrics (`verification_status`, `job_status`) and normalizes status from metrics.
  - Missing `file_name` now renders the required `ext api data is not available` message and logs `history.file_name.unavailable`.
  - Updated `tests/history-mapping.test.ts` to cover metrics mapping + missing-file label.
- Phase 1 frontend Verify wiring completed:
  - Verify now hydrates/refreshes the upload summary using `/api/tasks` (external task list) instead of `/tasks/latest-uploads`.
  - Missing file_name displays `ext api data is not available` in the summary and disables download when the name is unknown (log: `verify.file_name.unavailable`).
  - Manual export CSV now emits `ext api data is not available` for missing export detail fields (role-based, catchall, email server, etc.).
  - Manual history hydration still uses `/tasks/latest-manual` until external jobs are wired.
- Phase 1 reservation storage moved off `tasks`:
  - Added Supabase `task_credit_reservations` table with updated-at trigger.
  - Added `backend/app/services/task_credit_reservations.py` and rewired `backend/app/api/tasks.py` to use it for reservation reads/writes.
- Phase 1 jobs proxy added:
  - Added `TaskJobsResponse` + `list_task_jobs` to the external client and exposed `/api/tasks/{id}/jobs`.
  - Added backend tests for the jobs proxy route.

## Repo State / Alerts
- Files over 600 lines: `backend/app/api/tasks.py`, `app/verify/page.tsx`, `app/verify/utils.ts`.
- Planning docs should be the source of truth for upcoming backend steps; follow `PLAN.md` and `refactor.md` for the reservation table + jobs proxy sequence.

## Key Files Updated (So Far)
- `backend/app/api/tasks.py` — external-only task proxying, credit reservations, latest-upload(s) 204 behavior.
- `backend/app/services/tasks_store.py` — still used for reservations/manual results; slated for removal.
- `app/history/utils.ts` — external metrics mapping + missing file_name handling.
- `app/verify/page.tsx` + `app/verify/utils.ts` — upload summary now uses `/api/tasks`; CSV uses missing-field message.
- `app/lib/api-client.ts` — added external task metrics typings.
- `tests/history-mapping.test.ts`, `tests/verify-mapping.test.ts`.
- `PLAN.md`, `refactor.md`, `handover.md`.

## Commits (for rollback)
- `14d2ada` — proxy tasks to external API (remove Supabase caching).
- `da34576` — update task proxy tests; remove upload polling test.
- `b67013b` — Phase 1 History external mapping.
- `aa0eaea` — Phase 1 Verify external wiring.

## Test Runs
- `pytest backend/tests/test_tasks_latest_upload.py backend/tests/test_tasks_latest_uploads.py backend/tests/test_tasks_list_fallback.py backend/tests/test_tasks_list_external_failure.py backend/tests/test_tasks_key_scope.py backend/tests/test_tasks_admin_scope.py backend/tests/test_tasks_latest_manual.py`
  - Result: 14 passed (pyiceberg/pydantic warnings only).
- `npm run test:history`
  - Result: all history mapping tests passed (saw expected `history.file_name.unavailable` log for metrics-only task).
- `npx tsx tests/verify-mapping.test.ts` (with `.env.local` sourced to satisfy Supabase env checks)
  - Result: verify mapping tests passed; saw expected `verify.file_name.unavailable` + `verify.manual.job_missing_email` logs.

## Important Test Harness Note (Avoid Rework)
- `fastapi.TestClient` hangs in this environment. Use `httpx.AsyncClient` + `httpx.ASGITransport` instead.
- Dependency overrides for async dependencies MUST be async (e.g., `async def fake_user()`), otherwise requests hang.
- For `get_user_external_client`, return an async override that returns the client instance.

## External API Status / Gaps
- Task list/detail **still does not include `file_name`** (upload response includes filename).
- Manual export fields are now available via **`GET /api/v1/tasks/{id}/jobs`** (user-scoped) and should replace Supabase manual_results.
- Credit usage/spend write-back to Supabase is pending (waiting on final schema).
- Mapping of external metrics → UI “credits used”/usage totals is still unconfirmed.

## Pending Work / Next Steps (Ordered)
1) **Switch manual verification flow to tasks**:
   - Frontend: manual copy‑paste should call `/api/tasks` once (not per‑email `/verify`).
   - Backend: wire Verify to read from `/api/tasks/{id}/jobs` and drop any dependency on `/api/tasks/latest-manual`.
   - Verify page: poll `/api/tasks/{id}/jobs` for results and build export CSV from jobs.
2) **Retire `/api/tasks/latest-manual` after manual flow updates**:
   - Remove the Supabase-backed latest-manual route once the Verify page no longer depends on it.
3) **Remove Supabase task caching helpers**:
   - Delete `backend/app/services/tasks_store.py` and `backend/app/services/task_files_store.py`.
   - Remove or replace `fetch_task_summary`, `summarize_tasks_usage`, `summarize_task_validation_totals` in Overview with external metrics/usage endpoints.
   - Remove `/api/debug/tasks` or rewrite to use external tasks list.
4) **Update tests**:
   - Replace `backend/tests/test_tasks_store.py` and `test_tasks_latest_manual.py` with jobs‑based tests.
   - Add tests for reservation table service and `/api/tasks/{id}/jobs` proxy.
   - Run targeted pytest with venv and update frontend tests for manual task flow.
5) **Re‑verify UI**:
   - Verify manual history/export works with external jobs, file upload summary still functions, and missing file_name shows the required message.

## Required Process Reminders
- For any code changes: state plan first, update root plan/progress markdown after completion, ask for confirmation before next task.
- Add new to-dos to plan docs before execution.
- Activate Python venv before running tests or scripts.
- Keep UI design unchanged while wiring backend.
