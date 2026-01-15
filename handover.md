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

## Repo State / Alerts
- Working tree currently has a user-edited doc file: `ext-api-docs/endpoints/task_controller.md` is modified (updated docs). Decide whether to commit it separately.
- Files over 600 lines: `backend/app/api/tasks.py`, `app/verify/page.tsx`, `app/verify/utils.ts`.

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
1) **Create minimal local reservation table** in Supabase:
   - New table `task_credit_reservations` with `user_id`, `task_id`, `credit_reserved_count`, `credit_reservation_id`, timestamps.
   - Add unique `(user_id, task_id)` (or `(task_id)` if globally unique) for idempotency.
2) **Move reservation reads/writes to the new table**:
   - Replace `update_task_reservation` + `fetch_task_credit_reservation` in `backend/app/api/tasks.py`.
   - Add a small service (e.g., `backend/app/services/task_credit_reservations.py`) and delete reservation fields from `tasks`.
3) **Switch manual verification flow to tasks**:
   - Frontend: manual copy‑paste should call `/api/tasks` once (not per‑email `/verify`).
   - Backend: add `/api/tasks/{id}/jobs` proxy + types in external client; remove `/api/tasks/latest-manual`.
   - Verify page: poll `/api/tasks/{id}/jobs` for results and build export CSV from jobs.
4) **Remove Supabase task caching helpers**:
   - Delete `backend/app/services/tasks_store.py` and `backend/app/services/task_files_store.py`.
   - Remove or replace `fetch_task_summary`, `summarize_tasks_usage`, `summarize_task_validation_totals` in Overview with external metrics/usage endpoints.
   - Remove `/api/debug/tasks` or rewrite to use external tasks list.
5) **Update tests**:
   - Replace `backend/tests/test_tasks_store.py` and `test_tasks_latest_manual.py` with jobs‑based tests.
   - Add tests for reservation table service and `/api/tasks/{id}/jobs` proxy.
   - Run targeted pytest with venv and update frontend tests for manual task flow.
6) **Re‑verify UI**:
   - Verify manual history/export works with external jobs, file upload summary still functions, and missing file_name shows the required message.

## Required Process Reminders
- For any code changes: state plan first, update root plan/progress markdown after completion, ask for confirmation before next task.
- Add new to-dos to plan docs before execution.
- Activate Python venv before running tests or scripts.
- Keep UI design unchanged while wiring backend.
