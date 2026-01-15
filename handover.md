# Handover — External API First Refactor (Phase 1 in progress)

## Context & Decisions
- External API is the **single source of truth** for verification data, tasks, usage, and API keys.
- Supabase should remain **only** for profiles, billing, credit ledger/purchases, and a **minimal reservation store** for credit idempotency.
- If external data is missing, UI must keep the field and show the exact message: `ext api data is not available`.
- Manual copy‑paste verification should create a **task** (`POST /api/v1/tasks`) so history/export can be driven by `/api/v1/tasks/{id}/jobs`.
- `/api/v1/verify` remains realtime and **does not return task_id**; it is not suitable for manual history/export.
- External API docs now include `/api/v1/tasks/{id}/jobs` with nested email verification details (role/disposable/MX/server/validated_at/etc.).
- Credit write-back to Supabase is pending: external API dev is waiting on final schema.

## Work Completed (To Date)
- Phase 0 dependency gap documentation added to `refactor.md` (IMPORTANT NOTE section with missing fields).
- Phase 1 backend task proxying completed:
  - `/api/tasks`, `/api/tasks/{id}`, `/api/tasks/{id}/download`, `/api/tasks/upload` now call the external API directly (no Supabase task caching).
  - `/api/tasks/latest-upload(s)` now return 204 and log `ext_api_missing_file_name` because the external API does not provide file_name on list/detail yet.
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
- Phase 1 reservation storage moved off `tasks`:
  - Added Supabase `task_credit_reservations` table via migration `create_task_credit_reservations`, including trigger `set_task_credit_reservations_updated_at`.
  - Added `backend/app/services/task_credit_reservations.py` and rewired `backend/app/api/tasks.py` to use it for reservation reads/writes.
- Phase 1 jobs proxy added:
  - Added `TaskJobsResponse` + `list_task_jobs` to the external client and exposed `/api/tasks/{id}/jobs`.
  - Added backend tests for the jobs proxy route (`backend/tests/test_tasks_jobs_proxy.py`).
- Phase 1 manual flow now uses tasks/jobs:
  - Verify manual copy‑paste calls `/api/tasks` once and polls `/api/tasks/{id}/jobs` for results; CSV export is built from job data.
  - Manual state (task id + emails) is persisted in localStorage under `verify.manual.state` to hydrate after reload.
  - UI no longer calls `/api/tasks/latest-manual`, and the backend route has now been retired.
- Phase 1 backend cleanup of task cache services:
  - Removed `backend/app/services/tasks_store.py` and `backend/app/services/task_files_store.py`.
  - Added `backend/app/services/task_metrics.py` for shared metrics helpers.
  - `/api/verify` and `/api/tasks` no longer persist manual emails/results to Supabase.
  - `/api/overview` and `/api/debug/tasks` now use external tasks/metrics only, with explicit logs when data is missing.
  - Manual verify no longer performs `/emails/{address}` enrichment; export fields now rely entirely on task jobs data (missing values should surface as `ext api data is not available` in the UI export).
- Phase 1 backend test coverage added:
  - Added reservation table service tests and manual jobs flow integration coverage using async ASGI clients.
  - Updated `test_tasks_credit_reservation` to match the external-only task API and async dependency overrides.
- Credit grants schema + service drafted for external API ownership shift:
  - Added `credit_grants` schema definition to `refactor.md` and a new `backend/app/services/credit_grants.py` helper.
  - Applied Supabase migration `create_credit_grants` successfully.

## Repo State / Alerts
- Files over 600 lines: `backend/app/api/tasks.py`, `app/verify/page.tsx`, `app/verify/utils.ts`.
- Planning docs should be the source of truth for upcoming backend steps; follow `PLAN.md` and `refactor.md` for the remaining Phase 1 cleanup.

## Key Files Updated (So Far)
- `backend/app/api/tasks.py` — external-only task proxying, credit reservations, latest-upload(s) 204 behavior; manual persistence removed.
- `backend/app/api/overview.py` — now reads usage + tasks directly from external metrics/task list.
- `backend/app/api/debug.py` — debug tasks now query the external task list.
- `backend/app/clients/external.py` — verification metrics now include series points.
- `backend/app/services/task_credit_reservations.py` — new reservation read/write service for the dedicated table.
- `backend/app/services/task_metrics.py` — shared metrics helpers (counts/email totals).
- `app/history/utils.ts` — external metrics mapping + missing file_name handling.
- `app/verify/page.tsx` + `app/verify/utils.ts` — manual verify now uses `/api/tasks` + `/api/tasks/{id}/jobs`; CSV export built from job data.
- `app/lib/api-client.ts` — added `TaskJobEmail`, `TaskJobsResponse`, and `getTaskJobs`.
- `tests/history-mapping.test.ts`, `tests/verify-mapping.test.ts`, `backend/tests/test_tasks_jobs_proxy.py`.
- `backend/tests/test_task_credit_reservations.py`, `backend/tests/test_tasks_manual_jobs_flow.py`, `backend/tests/test_tasks_credit_reservation.py`.
- `PLAN.md`, `refactor.md`, `handover.md`.

## Commits (for rollback)
- `f708b71` — move task credit reservations to new table.
- `87fe392` — add task jobs proxy.
- `88564ec` — manual verify flow uses task jobs + localStorage hydration.
- `31adc62` — retire `/api/tasks/latest-manual` endpoint and client types/tests.
- `c78b0ff` — remove task cache services; switch overview/debug to external metrics/tasks.

## Test Runs
- `pytest backend/tests/test_tasks_latest_upload.py backend/tests/test_tasks_latest_uploads.py backend/tests/test_tasks_list_fallback.py backend/tests/test_tasks_list_external_failure.py backend/tests/test_tasks_key_scope.py backend/tests/test_tasks_admin_scope.py`
  - Result: 14 passed (pyiceberg/pydantic warnings only).
- `pytest backend/tests/test_tasks_jobs_proxy.py backend/tests/test_tasks_list_external_failure.py backend/tests/test_tasks_list_fallback.py backend/tests/test_tasks_key_scope.py backend/tests/test_tasks_admin_scope.py backend/tests/test_tasks_latest_upload.py backend/tests/test_tasks_latest_uploads.py`
  - Result: 14 passed (pyiceberg/pydantic warnings only).
- `source .venv/bin/activate && pytest backend/tests/test_overview.py backend/tests/test_tasks_metrics_mapping.py backend/tests/test_credit_enforcement_routes.py`
  - Result: 10 passed (pyiceberg/pydantic warnings only).
- `npm run test:history`
  - Result: all history mapping tests passed (saw expected `history.file_name.unavailable` log for metrics-only task).
- `pytest backend/tests/test_tasks_jobs_proxy.py`
  - Result: 3 passed (pyiceberg/pydantic warnings only).
- `set -a && source .env.local && set +a && source .venv/bin/activate && npx tsx tests/verify-mapping.test.ts`
  - Result: verify mapping tests passed; saw expected `verify.file_name.unavailable` + `verify.manual.job_missing_email` logs.
- `source .venv/bin/activate && pytest backend/tests/test_task_credit_reservations.py backend/tests/test_tasks_manual_jobs_flow.py backend/tests/test_tasks_jobs_proxy.py backend/tests/test_tasks_credit_reservation.py`
  - Result: 12 passed (pyiceberg/pydantic warnings only).

## Important Test Harness Note (Avoid Rework)
- `fastapi.TestClient` hangs in this environment. Use `httpx.AsyncClient` + `httpx.ASGITransport` instead.
- Dependency overrides for async dependencies MUST be async (e.g., `async def fake_user()`), otherwise requests hang.
- For `get_user_external_client`, return an async override that returns the client instance.

## External API Status / Gaps
- Task list/detail **still does not include `file_name`** (upload response includes filename).
- Manual export fields are available via **`GET /api/v1/tasks/{id}/jobs`** (user-scoped) and are now used by the Verify page.
- Credit usage/spend write-back to Supabase is pending (ext-api-docs do not document any credits/write-back endpoints; waiting on final schema).
- Mapping of external metrics → UI “credits used”/usage totals is still unconfirmed; metrics docs only expose verification totals/series.
 - Overview usage totals/series now come from `/metrics/verifications` when available (total_verifications + series points).

## Pending Work / Next Steps (Ordered)
1) **Re‑verify UI**:
   - Verify manual history/export works with external jobs, file upload summary still functions, and missing file_name shows the required message.

## Required Process Reminders
- For any code changes: state plan first, update root plan/progress markdown after completion, ask for confirmation before next task.
- Add new to-dos to plan docs before execution.
- Activate Python venv before running tests or scripts.
- Keep UI design unchanged while wiring backend.
