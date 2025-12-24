# Verify Page Plan

Goal: keep the Verify page flow functional for both manual input and file uploads, while preserving the two‑step upload popup sequence and the second Verify state.

## Current status (summary)
- Manual verify and file upload flows are wired to the backend and external API.
- Second Verify state UI is implemented and driven by real task counts where available.

## Remaining tasks (MVP)
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
