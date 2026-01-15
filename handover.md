# Handover — External API First Refactor (Phase 1 in progress)

## Context & Decisions
- External API is the single source of truth for verification data, tasks, usage, and API keys.
- Supabase should remain only for profiles, billing, and credit grants (purchases + signup grants). No local credit balance/consumption logic should remain once external endpoints exist.
- This codebase must only write credit grants to Supabase (purchase credits from Paddle webhooks + signup bonuses). External API will read these grants, compute balances, and expose endpoints for balance/usage/low-credit checks.
- If external data is missing, UI must keep the field and show the exact message: `ext api data is not available` (no silent fallback).
- Manual copy-paste verification should create a task (`POST /api/v1/tasks`) so history/export is driven by `/api/v1/tasks/{id}/jobs`.
- `/api/v1/verify` remains realtime and does not return task_id; it is not suitable for manual history/export.
- External API docs include `/api/v1/tasks/{id}/jobs` with nested verification details (role/disposable/MX/server/validated_at/etc.).
- Credit usage/low-balance endpoints are not documented yet; once external API adds them, replace the UI placeholders.

## Work Completed (To Date)
- Phase 0 dependency gap documentation added to `refactor.md` (IMPORTANT NOTE section with missing fields).
- Phase 1 backend task proxying completed:
  - `/api/tasks`, `/api/tasks/{id}`, `/api/tasks/{id}/download`, `/api/tasks/upload` now call the external API directly (no Supabase task caching).
  - `/api/tasks/latest-upload(s)` return 204 and log `ext_api_missing_file_name` because task list/detail do not include file_name yet.
- Task reservation upserts updated so reservations/manual emails can be stored without a prior task row.
- Backend tests updated to match external-only behavior and to use async ASGI clients.
- Removed obsolete upload polling test.
- Phase 1 frontend History wiring completed:
  - History mapping uses external task metrics (`verification_status`, `job_status`) and normalizes status from metrics.
  - Missing `file_name` renders `ext api data is not available` and logs `history.file_name.unavailable`.
  - Updated `tests/history-mapping.test.ts` to cover metrics mapping + missing-file label.
- Phase 1 frontend Verify wiring completed:
  - Verify hydrates/refreshes upload summary via `/api/tasks` (external list) instead of `/tasks/latest-uploads`.
  - Missing file_name shows `ext api data is not available` and disables download (log: `verify.file_name.unavailable`).
  - Manual export CSV emits `ext api data is not available` for missing export detail fields.
- Phase 1 reservation storage moved off `tasks`:
  - Added Supabase `task_credit_reservations` table via migration `create_task_credit_reservations`, including trigger `set_task_credit_reservations_updated_at`.
  - Added `backend/app/services/task_credit_reservations.py` and rewired `backend/app/api/tasks.py` to use it.
- Phase 1 jobs proxy added:
  - Added `TaskJobsResponse` + `list_task_jobs` to external client and exposed `/api/tasks/{id}/jobs`.
  - Added backend tests for jobs proxy (`backend/tests/test_tasks_jobs_proxy.py`).
- Phase 1 manual flow now uses tasks/jobs:
  - Verify manual copy-paste calls `/api/tasks` once and polls `/api/tasks/{id}/jobs` for results; CSV export built from job data.
  - Manual state persisted in localStorage under `verify.manual.state` for hydration.
  - UI no longer calls `/api/tasks/latest-manual`, and the backend route is retired.
- Phase 1 backend cleanup of task cache services:
  - Removed `backend/app/services/tasks_store.py` and `backend/app/services/task_files_store.py`.
  - Added `backend/app/services/task_metrics.py` for shared metrics helpers.
  - `/api/verify` and `/api/tasks` no longer persist manual emails/results to Supabase.
  - `/api/overview` and `/api/debug/tasks` use external tasks/metrics only, with explicit logs when data is missing.
  - Manual verify no longer performs `/emails/{address}` enrichment; export fields rely entirely on task jobs data.
- Phase 1 backend test coverage added:
  - Added reservation table service tests and manual jobs flow integration coverage using async ASGI clients.
  - Updated `test_tasks_credit_reservation` to match external-only task API and async dependency overrides.
- Credit grants schema + service added for the external-ownership shift:
  - Added `credit_grants` schema definition to `refactor.md` and `backend/app/services/credit_grants.py`.
  - Applied Supabase migration `create_credit_grants` successfully (MCP auth fixed).

## Repo State / Alerts
- Files over 600 lines: `backend/app/api/tasks.py`, `app/verify/page.tsx`, `app/verify/utils.ts`.
- Planning docs are the source of truth for remaining work; follow `PLAN.md` + `refactor.md`.

## Key Files Updated (So Far)
- `backend/app/api/tasks.py` — external-only task proxying, credit reservations, latest-upload(s) 204 behavior; manual persistence removed.
- `backend/app/api/overview.py` — reads usage + tasks directly from external metrics/task list (credits still local for now).
- `backend/app/api/debug.py` — debug tasks query external task list.
- `backend/app/clients/external.py` — verification metrics include series points.
- `backend/app/services/task_credit_reservations.py` — reservation read/write service.
- `backend/app/services/task_metrics.py` — shared metrics helpers.
- `backend/app/services/credit_grants.py` — new credit grants helper for purchases + signup.
- `app/history/utils.ts` — external metrics mapping + missing file_name handling.
- `app/verify/page.tsx` + `app/verify/utils.ts` — manual verify uses `/api/tasks` + `/api/tasks/{id}/jobs` with CSV export from jobs.
- `app/lib/api-client.ts` — TaskJobs types + `getTaskJobs`.
- `backend/tests/test_task_credit_reservations.py`, `backend/tests/test_tasks_manual_jobs_flow.py`, `backend/tests/test_tasks_credit_reservation.py`.
- `PLAN.md`, `refactor.md`, `handover.md` updated to reflect credits shift + schema.

## Commits (for rollback)
- `f708b71` — move task credit reservations to new table.
- `87fe392` — add task jobs proxy.
- `88564ec` — manual verify flow uses task jobs + localStorage hydration.
- `31adc62` — retire `/api/tasks/latest-manual` endpoint and client types/tests.
- `c78b0ff` — remove task cache services; switch overview/debug to external metrics/tasks.
- `ddd9a69` — add credit_grants service/tests + plan/handover/refactor updates.

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
- `fastapi.TestClient` hangs here. Use `httpx.AsyncClient` + `httpx.ASGITransport` instead.
- Dependency overrides for async dependencies must be async (`async def fake_user()`), otherwise requests hang.
- For `get_user_external_client`, return an async override that returns the client instance.

## External API Status / Gaps
- Task list/detail still do not include `file_name` (upload response includes filename).
- Manual export fields are available via `GET /api/v1/tasks/{id}/jobs` (user-scoped) and are now used by the Verify page.
- Credit usage/spend endpoints are not documented yet; external API will provide credit balance/history/low-credit checks once it reads `credit_grants`.
- Mapping of external metrics to UI “credits used”/usage totals remains unconfirmed; metrics docs only expose verification totals/series.

## Pending Work / Next Steps (Ordered)
1) Credits ownership shift — stop local credit enforcement/reservations.
   - Remove local debit/reserve/release logic from `/api/verify` and `/api/tasks` and related services/tests.
   - This codebase should no longer return 402 for insufficient credits.
2) Credits ownership shift — write to `credit_grants` only.
   - Update billing webhook to insert purchase grants into `credit_grants` (source=`purchase`, source_id=transaction_id).
   - Add signup bonus insertion into `credit_grants` (source=`signup`, source_id=user_id or auth event id).
3) Credits ownership shift — update account/overview credits to external-only.
   - Update `/api/overview` + `/api/account/credits` to return unavailable and log, and update UI to show `ext api data is not available` (no layout change).
4) Credits ownership shift — update purchase history source.
   - Read purchase history from `credit_grants` (source=`purchase`) instead of `billing_purchases`.
5) Tests + scripts.
   - Update backend tests expecting credit enforcement and `user_credits` changes.
   - Update Paddle E2E script + README to verify `credit_grants` instead of `user_credits`.
6) UI re-verification.
   - Verify manual history/export works with external jobs, file upload summary still functions, and missing file_name shows the required message.

## Required Process Reminders
- For any code changes: state plan first, update root plan/progress markdown after completion, ask for confirmation before next task.
- Add new to-dos to plan docs before execution.
- Activate Python venv before running tests or scripts.
- Keep UI design unchanged while wiring backend.
