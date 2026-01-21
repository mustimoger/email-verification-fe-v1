# Verify migration plan (local → external API)

## Goal (what/where/why/how)
- What: Migrate `/verify` data flows to call the external API directly, removing local API usage wherever possible.
- Where: `/verify` UI (`app/verify-v2/*`), shared helpers (`app/verify/utils.ts`, `app/verify/file-columns.ts`), API client (`app/lib/api-client.ts`). Remove local API routes only after no callers remain.
- Why: The external API is the source of truth for verification tasks and results; local proxies add latency and drift risk.
- How: Add external API client methods for tasks/jobs/uploads, switch `/verify` to those calls, adapt response mapping, and keep only client-only logic or Supabase reads owned by the external API.

## Step-by-step plan

### Step 1 — Align task models with external API responses
- What: Update task shape usage to support external task fields (`is_file_backed`, `file.filename`, metrics).
- Where: `app/lib/api-client.ts`, `app/verify/utils.ts`, `app/verify-v2/verify-v2-client.tsx`.
- Why: External tasks return file metadata under `file`, not `file_name`, so summaries must map correctly.
- How:
  - Extend task types to include `file` metadata from `/api/v1/tasks`.
  - Update `buildTaskUploadsSummary` to read filenames from `task.file.filename` when available.
  - Keep logs when filename is unavailable; do not add hardcoded fallbacks.
- Status: Completed.
- Done:
  - Added `TaskFileMetadata` to the shared API types so external task responses can carry `file` metadata.
  - Updated `/verify` upload summaries to prefer `task.file.filename` (external format) with a fallback to `task.file_name` (local format) to keep both sources working.
  - Kept existing info logs when filename is unavailable to avoid silent failures during migration.

### Step 2 — Move manual verification flow to external tasks
- What: Replace local task creation and job polling with external API calls.
- Where: `app/verify-v2/verify-v2-client.tsx`, `app/lib/api-client.ts`.
- Why: Manual verify results come from task jobs; external API is the source of truth.
- How:
  - Add external client methods for `POST /api/v1/tasks` and `GET /api/v1/tasks/{id}/jobs`.
  - Switch `/verify` to use the external client for create + polling.
  - Preserve current error handling and retry logic without changing the UI.
- Status: Completed.
- Done:
  - Added external API client methods for creating tasks and listing task jobs.
  - Switched manual verification submit and polling on `/verify` to use the external API.
  - Kept existing retry, error messaging, and UI behavior unchanged.

### Step 3 — Move file upload flow to external batch upload
- What: Send file uploads directly to `/api/v1/tasks/batch/upload`.
- Where: `app/verify-v2/verify-v2-client.tsx`, `app/lib/api-client.ts`, `app/verify/file-columns.ts`.
- Why: External API owns batch processing; local upload proxy should be removed from `/verify`.
- How:
  - Add an external client method that submits a single file as `multipart/form-data`.
  - Iterate selected files and upload each to the external API (sequential or parallel).
  - Convert the selected column from UI (letter) to `email_column` value accepted by the external API (header or 1-based index).
  - Keep `first_row_has_labels`/`remove_duplicates` in UI but log that the external API ignores them.
- Status: Completed.
- Done:
  - Added an external API client method for `/api/v1/tasks/batch/upload` and wired `/verify` to upload files directly.
  - Converted UI column letters to external API `email_column` values (header when available, otherwise 1-based index).
  - Logged the client-only flags during upload and kept the UI flow unchanged while handling per-file upload errors gracefully.
- Notes:
  - External API only accepts one file per request and does not accept `file_metadata` as the local endpoint does.

### Step 4 — Refresh “latest uploads” via external tasks list
- What: Switch latest uploads summary to external `GET /api/v1/tasks`.
- Where: `app/verify-v2/verify-v2-client.tsx`, `app/lib/api-client.ts`, `app/verify/utils.ts`.
- Why: External tasks list includes file-backed metadata needed for summaries.
- How:
  - Use external tasks list (optionally `is_file_backed=true`) to build upload summaries.
  - Adjust summary mapping to prefer `task.file.filename` and task metrics from external API.
- Status: Completed.
- Done:
  - Updated the external tasks list call to support `is_file_backed` filtering.
  - Switched the `/verify` latest uploads refresh to pull file-backed tasks from the external API.

### Step 4a — Move task detail fetch to external API
- What: Replace upload detail fetch calls with external `GET /api/v1/tasks/{id}`.
- Where: `app/verify-v2/verify-v2-client.tsx`, `app/lib/api-client.ts`.
- Why: `/verify` should not rely on local task detail proxies; external API is the source of truth.
- How:
  - Add an external API client method for task detail.
  - Switch `fetchTaskDetailWithRetries` to call the external client.
- Status: Completed.
- Done:
  - Added an external API client method for task detail.
  - Updated `/verify` to fetch task detail from the external API.

### Step 5 — Replace local limits source
- What: Remove `GET /limits` dependency in `/verify`.
- Where: `app/verify-v2/verify-v2-client.tsx`, `app/lib/api-client.ts`.
- Why: Requirement is to avoid local data pulls; limits must be external-owned or configuration-driven.
- How:
  - Prefer a new external endpoint (e.g., `/api/v1/limits`) or an external-owned Supabase table if provided.
- If no external limits are available, block migration and document the gap; do not hardcode defaults.
- Status: Completed (stayed local by design).
- Done:
  - Confirmed manual verification limits stay local and are sourced from the app's Supabase data.
  - Updated STAYED-LOCAL to reflect the local ownership of manual limits.

### Step 6 — Remove local proxies once unused
- What: Remove local `/api/tasks/*` and `/api/limits` usage only after `/verify` is fully external.
- Where: `backend/app/api/tasks.py`, `backend/app/api/limits.py`, router registration in `backend/app/main.py`.
- Why: Reduce redundant local API surface and prevent drift.
- How:
  - Confirm no frontend pages call these routes.
  - Delete the routes and update imports/tests if unused.
- Status: Deferred (out of scope for `/verify`).
- Done:
  - Confirmed `/verify` no longer calls local `/api/tasks/*` routes.
- Deferred:
  - Local `/api/tasks/*` routes remain for other pages until their migrations begin.
- Note:
  - `/limits` stays local by design (Supabase-owned), so the local route cannot be removed.

### Step 7 — Validation and regression checks
- What: Ensure `/verify` behaviors remain intact after migration.
- Where: `/verify` UI and tests (if any existing).
- Why: Avoid regressions in manual flow, uploads, and summaries.
- How:
  - Smoke test manual verification and file uploads against external API.
  - Verify summary metrics and status transitions match expectations.
  - Add or update tests only if existing coverage is insufficient.
- Status: Completed.
- Done:
  - Ran unit tests for verify mappings, file column parsing, and idempotency helpers.
  - Used Playwright to load `/verify`, submit a manual verification, and upload a CSV through the external batch upload flow.
  - Verified the latest uploads refresh uses external tasks and updates the summary state.

## STAYED-LOCAL
- File parsing and column detection for CSV/XLSX (`app/verify/file-columns.ts`).
- Column mapping UI and selection state in `/verify` (client-only).
- Manual results export (CSV generation and download handled in the browser).
- Manual verification state persistence in `localStorage`.
- UI-only summary calculations (totals, charts, status pills) derived from API responses.
- Manual verification limits sourced from app-owned Supabase data (not external API).

## Progress updates
- Created this plan to track the `/verify` migration steps, identify external API replacements, and document blockers for newcomers.
- Completed Step 1 by aligning task models and `/verify` upload summaries with external `file` metadata fields.
- Completed Step 2 by moving manual verification create/poll requests to external task endpoints.
- Completed Step 3 by moving file uploads to the external batch upload endpoint and adapting column mapping for the external API.
- Completed Step 4 by using external file-backed tasks for latest uploads refresh.
- Completed Step 5 by keeping manual verification limits local (Supabase-owned) and documenting the decision.
- Added Step 4a to migrate task detail fetch to external API and marked Step 6 blocked due to remaining local consumers.
- Completed Step 4a by switching `/verify` task detail fetches to the external API.
- Completed Step 7 with unit tests plus Playwright smoke coverage for manual verify and batch upload flows.
- Updated Step 6 to reflect that `/verify` no longer uses local task routes; removal is deferred until other pages migrate.
