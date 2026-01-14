# Handover — External API First Refactor (Phase 1 in progress)

## Context & Decisions
- External API is the **single source of truth** for verification data, tasks, usage, and API keys.
- Supabase should remain **only** for profiles, billing, credit ledger/purchases, and any interim state required for credits.
- If external data is missing, UI must keep the field and show the exact message: `ext api data is not available`.
- Credit write-back is pending: external API dev is waiting on final Supabase schema to implement it.

## Work Completed This Session
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

## Key Files Updated
- `backend/app/api/tasks.py` — removed Supabase task caching, external-only task listing/detail/download/upload, latest-upload(s) 204 behavior, removed file cache dependencies.
- `backend/app/services/tasks_store.py` — reservation/manual updates now `upsert` to allow minimal task rows.
- `backend/tests/*` — updated task tests to use async ASGI clients; removed `test_tasks_upload_polling.py`.
- `refactor.md` — IMPORTANT NOTE section listing external API gaps and mandated UI message.
- `PLAN.md` — Phase 1 progress + test updates recorded.

## Commits (for rollback)
- `14d2ada` — proxy tasks to external API (remove Supabase caching).
- `da34576` — update task proxy tests; remove upload polling test.

## Test Runs
- `pytest backend/tests/test_tasks_latest_upload.py backend/tests/test_tasks_latest_uploads.py backend/tests/test_tasks_list_fallback.py backend/tests/test_tasks_list_external_failure.py backend/tests/test_tasks_key_scope.py backend/tests/test_tasks_admin_scope.py backend/tests/test_tasks_latest_manual.py`
  - Result: 14 passed (pyiceberg/pydantic warnings only).
- `npm run test:history`
  - Result: all history mapping tests passed (saw expected `history.file_name.unavailable` log for metrics-only task).

## Important Test Harness Note (Avoid Rework)
- `fastapi.TestClient` hangs in this environment. Use `httpx.AsyncClient` + `httpx.ASGITransport` instead.
- Dependency overrides for async dependencies MUST be async (e.g., `async def fake_user()`), otherwise requests hang.
- For `get_user_external_client`, return an async override that returns the client instance.

## External API Dependencies Still Missing/Unclear
- Task list/detail does **not** include `file_name` (upload response does include filename).
- Manual export detail fields are admin-only (`/emails` endpoints), not user-scoped.
- Credit usage/spend write-back to Supabase is pending (waiting on final schema).
- Mapping of external metrics → UI “credits used”/usage totals is unconfirmed.

## Pending Work / Next Steps
1) **Phase 1 frontend updates**:
   - History page should map external task metrics directly (no Supabase fallback).
   - Show `ext api data is not available` for file_name/export detail fields.
   - Verify page should use external task/verify responses; surface missing export details with the same message.
2) **Phase 1 tests (frontend + any remaining backend)**:
   - Update frontend tests to cover new external-only data and missing-field message.
3) **Phase 1 backend cleanup**:
   - `tasks_store`/`task_files_store` removal deferred until manual results + credit reservations are externalized.
4) **Phase 0 outstanding confirmations**:
   - external API credit write-back to Supabase.
   - metrics mapping for “credits used”/usage totals.

## Warnings
- `backend/app/api/tasks.py` exceeds 600 lines. No refactor performed yet.

## Required Process Reminders
- For any code changes: state plan first, update root plan/progress markdown after completion, ask for confirmation before next task.
- Add new to-dos to plan docs before execution.
- Activate Python venv before running tests or scripts.
- Keep UI design unchanged while wiring backend.
