# Verify Page Plan

Goal: keep the Verify page flow functional for both manual input and file uploads, while preserving the two‑step upload popup sequence and the second Verify state.

## Current status (summary)
- Manual verify and file upload flows are wired to the backend and external API.
- Second Verify state UI is implemented and driven by real task counts where available.

## Remaining tasks (MVP)
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

Notes:
- Detailed task history remains in `PLAN.md`.
