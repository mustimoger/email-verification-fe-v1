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
- [x] Add tests for latest-manual backend response and manual Results mapping (jobs -> status list).
  Explanation: Ensure the API returns the correct task and the UI mapping is stable without hardcoded fallbacks.
  Update: Added backend tests for `/api/tasks/latest-manual` and frontend mapping tests for manual results/expiration helpers.
- [ ] Persist latest file upload summary across /verify reloads using server-driven rehydration (most recent file-based task only).
  Explanation: Restore the post-upload cards after page refresh by fetching the most recent file-based task for the signed-in user; keep status updates manual via a refresh action to avoid background polling.
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
- [ ] Expire latest file upload summary after completion on refresh/hydration.
  Explanation: File-based summaries should not persist after completion; apply the same expiry logic as manual batches.
- [ ] Lock "Remove duplicate emails" to checked and disabled in the file upload flow (default on, user cannot toggle).
  Explanation: user requested deduplication to be always enabled; UI should reflect the immutable default.
  Update: Disabled the checkbox and kept the value locked to true in the Assign Email Column step.
- [ ] Fix per-email task upsert spam during task detail fetch (upsert once per task).
  Explanation: current loop upserts on every job; should compute counts then persist once to reduce load/log noise.
  Update: `/tasks/{id}` now computes counts across jobs and performs a single upsert after the loop, preventing per-email write spam.
- [ ] Summarize Verify changes for newcomers and confirm before adding any enhancements.
  Explanation: keep onboarding clear and avoid scope creep.
- [x] Verify upload pending message should be neutral/informational (not red) after a successful file upload.
  Explanation: Added a dedicated info banner for the “processing” state so successful uploads show a neutral message (with guidance to check Overview/History) while true errors remain red.

Notes:
- Detailed task history remains in `PLAN.md`.
