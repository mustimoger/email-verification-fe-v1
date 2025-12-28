# Verify Page Plan

Goal: keep the Verify page flow functional for both manual input and file uploads, while preserving the two‑step upload popup sequence and the second Verify state.

## Current status (summary)
- Manual verify and file upload flows are wired to the backend and external API.
- Second Verify state UI is implemented and driven by real task counts where available.

## Remaining tasks (MVP)
- [x] Persist latest manual verification batch across /verify reloads and show it in the Results card (manual batches only).
  Explanation: Fetch the most recent manual task from Supabase on page load and hydrate the Results list from `/tasks/{id}` jobs (no local storage or placeholders).
  Update: `/verify` now hydrates from `/api/tasks/latest-manual`, then fetches `/api/tasks/{id}` to populate Results from job emails only.
- [x] Add backend endpoint to return the most recent manual task (Supabase-backed, excluding file uploads).
  Explanation: Manual tasks are stored in Supabase without file metadata; expose a `/api/tasks/latest-manual` endpoint so the frontend can rehydrate after reloads.
  Update: Added `/api/tasks/latest-manual` and `fetch_latest_manual_task` so the UI can rehydrate the latest manual task using Supabase data; returns 204 when no manual task exists.
- [x] Add manual refresh control for Results to fetch `/tasks/{id}` and update statuses on demand (no background polling).
  Explanation: User-requested status refresh avoids auto polling and aligns with the manual refresh UX.
  Update: Results card now includes a “Refresh status” button that re-fetches the latest manual task and updates results without polling.
- [x] Expire manual Results once the task is complete (hide the batch after refresh/hydration).
  Explanation: Per UX requirement, completed manual batches should disappear from the Results card rather than persist.
  Update: Hydration/refresh clears manual results when the latest task is complete.
- [x] Keep completed manual Results + pasted emails visible until a new manual batch is started.
  Explanation: Requirement updated; do not auto-expire manual batches and persist the submitted emails for rehydration after reload.
  Update: Removed manual batch expiration in `/verify` and now keep manual task results until a new manual verification is submitted.
- [x] Persist manual emails in Supabase task records (manual tasks only).
  Explanation: Store the original pasted emails per task so the UI can rehydrate the textarea and pending rows without local storage.
  Update: Added `tasks.manual_emails` (jsonb) and a backend updater to persist trimmed manual emails on task creation without altering task status.
- [x] Return manual emails from `/api/tasks/latest-manual`.
  Explanation: The frontend needs the stored email list to restore the input and show fallback rows when jobs are not available yet.
  Update: `LatestManualResponse` now includes `manual_emails` and the route passes through the stored list from Supabase.
- [x] Rehydrate manual input + Results on /verify reload (use stored emails when jobs are missing).
  Explanation: Keep UX stable across reloads by restoring the manual textarea and displaying pending rows until job statuses arrive.
  Update: `/verify` now rehydrates the textarea from `manual_emails` and maps manual results using the stored list (pending rows until jobs arrive).
- [x] Add tests for manual email persistence + rehydration flows.
  Explanation: Ensure backend payloads include manual emails and the frontend mapping logic stays stable.
  Update: Added frontend mapping tests for manual fallback behavior; local run requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [x] Switch manual verification flow to use per-email `/verify` calls instead of `/tasks`.
  Explanation: Manual verification should return immediate per-email results without waiting for task jobs; keep the task-based flow for file uploads only.
  Update: `/verify` now calls `/api/verify` for each email and updates the Results card as responses return.
- [x] Update manual Results rendering to show per-email `/verify` status + message and persist until the next manual batch.
  Explanation: Preserve UX by keeping the latest manual results visible while providing completed statuses from the single-email verify endpoint.
  Update: Results rehydrate from stored manual results + email list and remain visible until a new manual batch is started.
- [x] Add tests for per-email manual verify mapping + persistence.
  Explanation: Ensure the new manual flow stays stable and is consistent with rehydration behavior.
  Update: Added mapping tests for stored manual results ordering and pending fallbacks; local run requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [x] Persist manual per-email results in Supabase for reloads.
  Explanation: Store manual verification outcomes alongside manual emails so `/verify` reloads can rehydrate completed statuses without re-verifying.
  Update: Added `tasks.manual_results` (jsonb) and backend upsert logic during `/api/verify` when `batch_id` is provided.
- [x] Return stored manual results from `/api/tasks/latest-manual`.
  Explanation: The frontend needs persisted results to repopulate the Results card after reloads or refreshes.
  Update: `LatestManualResponse` now includes `manual_results` and the route passes the stored results through.
- [x] Add tests for latest-manual backend response and manual Results mapping (jobs -> status list).
  Explanation: Ensure the API returns the correct task and the UI mapping is stable without hardcoded fallbacks.
  Update: Added backend tests for `/api/tasks/latest-manual` and frontend mapping tests for manual results/expiration helpers.
- [x] Persist latest file upload summary across /verify reloads using server-driven rehydration (most recent file-based task only).
  Explanation: Restore the post-upload cards after page refresh by fetching the most recent file-based task for the signed-in user; keep status updates manual via a refresh action to avoid background polling.
  Update: Requirement changed to show the latest N uploads; see new tasks below.
- [x] Add backend endpoint to return the most recent file-based task (Supabase-backed) with file metadata for /verify hydration.
  Explanation: External API lacks a "latest upload" endpoint and does not expose file names in task lists, so Supabase task_files metadata must be used as the source of truth for rehydration.
  Update: Added `/api/tasks/latest-upload` which reads the most recent file-based task from Supabase (via `task_files` mapping) and returns counts/status + file name, returning 204 when no file-based task exists to avoid brittle defaults.
- [x] Add frontend hydration + manual refresh for the latest file-based task summary on /verify.
  Explanation: On page load, request the latest file-based task summary and show the cards; provide a user-triggered refresh button to update status/counts without background polling.
  Update: `/verify` now hydrates from `/api/tasks/latest-upload` on mount when idle and shows the summary cards after reload; a manual “Refresh status” action re-fetches the latest task and updates counts without background polling.
- [x] Add tests for latest-upload backend response and verify-page hydration mapping.
  Explanation: Ensure the latest-upload endpoint returns the correct task and the UI hydrates/persists the summary reliably across reloads.
  Update: Added backend tests for `/api/tasks/latest-upload` and frontend mapping tests for `buildLatestUploadSummary` in `tests/verify-mapping.test.ts`.
- [ ] Add minimal tests for manual input validation and upload state transitions (including popup flow).
  Explanation: ensures regressions are caught without adding UI placeholders or hardcoded behavior.
- [x] Replace single latest-upload summary with a latest-N uploads list (N=6), newest-first, persisted across reloads.
  Explanation: The upload status card should show the most recent file upload tasks (not just one), regardless of age, and without layout disruption.
  Update: `/verify` now hydrates a latest-uploads list from the backend and renders up to the configured limit.
- [x] Add backend endpoint to return latest-N file uploads with counts + metadata (Supabase-backed).
  Explanation: Supabase task_files metadata is the source of truth for file upload history; expose a list endpoint to hydrate the verify summary list.
  Update: Added `/api/tasks/latest-uploads` with `LATEST_UPLOADS_LIMIT` guard and a tasks-store helper to return the latest file tasks.
- [x] Update verify summary hydration to render latest-N uploads and refresh all tasks on demand.
  Explanation: Manual refresh should update the status/counts for every listed upload and re-render the table.
  Update: “Refresh status” now fetches the latest upload list and pulls details for each task before rebuilding the table.
- [x] Update the validation donut to summarize only the most recent upload, with a label indicating which task/file it represents.
  Explanation: Keep the donut focused on the newest file upload while the table shows the full latest-N list.
  Update: Donut aggregates now come from the newest upload and the card displays “Latest upload: {file}”.
- [ ] Lock "Remove duplicate emails" to checked and disabled in the file upload flow (default on, user cannot toggle).
  Explanation: user requested deduplication to be always enabled; UI should reflect the immutable default.
  Update: Disabled the checkbox and kept the value locked to true in the Assign Email Column step.
- [ ] Fix per-email task upsert spam during task detail fetch (upsert once per task).
  Explanation: current loop upserts on every job; should compute counts then persist once to reduce load/log noise.
  Update: `/tasks/{id}` now computes counts across jobs and performs a single upsert after the loop, preventing per-email write spam.
- [x] Add `LATEST_UPLOADS_LIMIT` to backend `.env` and `.env.example` so the API boots after restart.
  Explanation: latest upload list is now required by settings; missing env blocks uvicorn startup and causes 400s via route fall-through.
  Update: Added `LATEST_UPLOADS_LIMIT=6` to `backend/.env.example` to document the required config; `backend/.env` already includes it locally.
- [x] Prevent `/api/tasks/{task_id}` from capturing latest-* routes (UUID-only task IDs).
  Explanation: `/api/tasks/latest-*` must resolve to the internal endpoints; UUID path params avoid collisions and prevent external 400s.
  Update: Switched `/api/tasks/{task_id}` and `/api/tasks/{task_id}/download` to accept UUIDs only and normalized usage via `str(task_id)` for external calls, credits, and logging.
- [x] Fix `taskIds is not defined` in file upload summary logging.
  Explanation: Upload logging should only reference defined variables to avoid UI errors after file upload.
  Update: Switched the log payload to derive `task_ids` from the resolved upload links, preventing undefined variable errors in the browser console.
- [ ] Summarize Verify changes for newcomers and confirm before adding any enhancements.
  Explanation: keep onboarding clear and avoid scope creep.
- [x] Verify upload pending message should be neutral/informational (not red) after a successful file upload.
  Explanation: Added a dedicated info banner for the “processing” state so successful uploads show a neutral message (with guidance to check Overview/History) while true errors remain red.
- [x] Verify hydration gating + key stability (MVP)
  Explanation: Ensure latest manual/upload summaries load on first visit after auth hydration, avoid duplicate React keys in the upload list, remove the initial chart sizing warning, and fix the dashboard logo sizing warning without altering layout.
  Update: gated latest manual/upload hydration on auth readiness, made upload summary row keys unique, fixed the Verify donut chart container to use a fixed height, and aligned the logo dimensions to the image’s intrinsic ratio to eliminate the Next/Image warning without changing its displayed size.
- [ ] Verify summary card tweaks (NEW)
  Explanation: Keep the Verification Summary card shown only after a file upload begins, but adjust the summary donut card to show just the file name (no "Latest upload:" label), show hover tooltips with counts like Overview’s Validation chart, and remove the “Upload Another File” action.
  Update: Removed the “Upload Another File” button from the Verification Summary header, switched the donut card label to show only the latest file name, and added a Recharts tooltip to show counts on hover (matching the Overview Validation chart styling).
- [x] Verify processing donut + relaxed counts (NEW)
  Explanation: When a file upload starts, show an immediate Processing donut using available totals, and treat missing valid/invalid/catch-all counts as 0 so refreshes show partial data without waiting for all counts.
  Update: Verification summary donut now builds slices from the latest upload row with missing counts treated as 0; when total emails are known, it adds a Processing slice for the remaining unverified emails so the chart renders immediately after uploads start.
- [x] Verify Results export menu (NEW)
  Explanation: Add a lightweight Export control to the manual Results card with Download CSV, exporting the same per-email fields available in verify responses (email, status, message, validated_at, is_role_based).
  Update: Backend /verify now extracts export fields from the verify response (and calls `/emails/{address}` when nested email/domain/host data is missing) so manual_results persist role-based, catchall domain, email server, disposable/registered domain, and MX record data for reloads.
  Update: Results card now includes an Export dropdown with Download CSV. Export pulls the latest manual task data on demand, builds CSV columns for Email/Status/Role-based/Catchall Domain/Email Server/Disposable Domain/Registered Domain/MX Record, and keeps the UI table unchanged.
- [x] Verify Results export download-only (NEW)
  Explanation: Remove the Copy CSV option and keep a single Download CSV action to reduce UI complexity while retaining full export data.
  Update: Results card now exposes a single Download CSV button and no longer shows Copy in the export controls.
- [x] Verify export details refresh (NEW)
  Explanation: When a user downloads the CSV, refresh any missing email/domain/host fields by calling `/emails/{address}` for incomplete rows and persist them before exporting.
  Update: Backend `/tasks/latest-manual` accepts `refresh_details=true` to enrich missing export fields, and the Verify Results download now calls it before generating CSV so exports are up-to-date.
- [x] Tests: latest manual refresh_details (NEW)
  Explanation: Add route-level tests to ensure `refresh_details=true` triggers email detail lookups and returns enriched manual results without breaking the default response.
  Update: Added route tests for refresh_details and unit coverage for the bulk manual results updater; ran `pytest backend/tests/test_tasks_latest_manual.py backend/tests/test_tasks_store.py` (8 passed, gotrue deprecation warning only).
- [x] Verify Results card scroll (NEW)
  Explanation: Keep the Results card at its initial height and allow the email list to scroll vertically instead of stretching the layout.
  Update: Set the Results container to a fixed height and applied overflow-y scrolling on the results list so the card layout stays stable.

Notes:
- Detailed task history remains in `PLAN.md`.
