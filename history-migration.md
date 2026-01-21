# History migration plan (local → external API)

## Goal (what/where/why/how)
- What: Migrate `/history` data flows to the external API wherever possible, keeping only non-external sources that are unavoidable.
- Where: `/history` UI (`app/history/*`), shared shell (`app/components/dashboard-shell.tsx`), and API client (`app/lib/api-client.ts`).
- Why: External API is the source of truth for task history; local proxies risk drift.
- How: Replace local task list/detail/download + credits reads with external endpoints, keep UI logic intact, and document any unavoidable local dependencies.

## Step-by-step plan

### Step 1 — Audit current /history data sources
- What: Map each `/history` feature to its current API dependency and identify external replacements.
- Where: `app/history/history-client.tsx`, `app/history/utils.ts`, `app/components/dashboard-shell.tsx`, `app/lib/api-client.ts`.
- Why: Establish a baseline before changing endpoints.
- How: Inspect the client components and their API client usage, then record the local → external mapping.
- Status: Completed.
- Done:
  - Identified history list/refresh/load-more as local `GET /tasks` (limit/offset + optional `refresh=true`).
  - Identified detail fallback for incomplete task rows as local `GET /tasks/{id}`.
  - Identified exports/downloads as local `GET /tasks/{id}/download`.
  - Identified header profile + credits as local `GET /account/profile` and `GET /account/credits`.
  - Mapped local → external replacements:
    - `/tasks` → `GET /api/v1/tasks` (external) for list/pagination.
    - `/tasks/{id}` → `GET /api/v1/tasks/{id}` (external) for detail fallback.
    - `/tasks/{id}/download` → `GET /api/v1/tasks/{id}/download` (external) for exports.
    - `/account/credits` → `GET /api/v1/credits/balance` (external) for header credits.
    - `/account/profile` → no external endpoint documented; requires new external endpoint or a Supabase-owned read where the external API is the writer.

### Step 2 — Switch history list to external tasks (MVP core)
- What: Replace task list pagination and refresh with external tasks list.
- Where: `app/history/history-client.tsx`, `app/lib/api-client.ts`.
- Why: History timeline should come from the external task source of truth.
- How:
  - Use `externalApiClient.listTasks` for `limit`/`offset`.
  - On refresh, re-fetch list without the local `refresh=true` flag and log the missing external refresh flag instead of hardcoding behavior.
  - Prefer external file metadata (`task.file.filename`) when building history rows so completed file-backed tasks still show a filename.
- Status: Completed.
- Done:
  - Switched `/history` list pagination to `externalApiClient.listTasks` so timeline rows come from the external task source of truth.
  - Logged refresh attempts because the external tasks list does not document a `refresh` flag, keeping the UI behavior visible without inventing parameters.
  - Updated history row mapping to prefer `task.file.filename` so file-backed external tasks still display a filename and download action when completed.

### Step 3 — Switch history detail fallback to external task detail
- What: Replace local task detail fallback with external task detail.
- Where: `app/history/history-client.tsx`, `app/lib/api-client.ts`, `app/history/utils.ts`.
- Why: Detail data must reflect external task metrics and file metadata.
- How:
  - Use `externalApiClient.getTaskDetail` for fallback fetches.
  - Update history mapping to prefer external `task.file.filename` when available, and keep the existing local `file_name` as a compatibility fallback.
- Status: Completed.
- Done:
  - Updated history row mapping to prefer external `file.filename` when present, preserving local `file_name` as a compatibility fallback.
  - Switched history detail fallback to `externalApiClient.getTaskDetail` so missing rows are filled from external task detail.

### Step 4 — Switch exports/downloads to external task downloads
- What: Replace local download route usage with external download endpoint.
- Where: `app/history/history-client.tsx`, `app/lib/api-client.ts`.
- Why: Task exports should come directly from the external API.
- How:
  - Add an external download helper that fetches `/api/v1/tasks/{id}/download` and returns a blob + filename.
  - Update history download action to use the external helper.
- Status: Completed.
- Done:
  - Added external download helper in the API client for `/api/v1/tasks/{id}/download`.
  - Switched history downloads to use the external download helper for task exports.

### Step 5 — Replace header credits with external balance
- What: Replace local credits read in the dashboard shell with external credit balance.
- Where: `app/components/dashboard-shell.tsx`, `app/lib/api-client.ts`.
- Why: Credits are owned by the external API; avoid local pulls where possible.
- How:
  - Add or reuse `externalApiClient.getCreditBalance` and map to the existing header display shape.
  - Keep existing caching behavior; log and fall back gracefully if the external call fails.
- Status: Completed.
- Done:
  - Switched the dashboard shell credits read to `GET /api/v1/credits/balance` via the external API client.
  - Kept existing cache behavior and error logging while mapping the external `balance` field to the header display.

### Step 6 — Resolve profile source
- What: Determine whether profile data can move off local `/account/profile`.
- Where: `app/components/dashboard-shell.tsx`.
- Why: Requirement is to minimize local API usage.
- How:
  - If an external profile endpoint exists, switch to it.
  - If not, keep `/account/profile` local and document the blocker.
- Status: Blocked (stays local until external endpoint exists).
- Done:
  - Confirmed no external profile endpoint is documented in the external API docs; `/account/profile` remains local.
- Not implemented:
  - External profile replacement is blocked by missing endpoint documentation.

### Step 7 — Validation and regression checks
- What: Verify `/history` renders correctly and exports still download.
- Where: `/history` UI and any relevant tests.
- Why: Ensure migration does not regress timeline rendering or downloads.
- How:
  - Add/adjust tests for history mapping if needed.
  - Run unit and integration checks after wiring external endpoints.
- Status: Completed (with warnings).
- Done:
  - Ran history mapping unit tests (`npm run test:history`).
  - Ran credits cache tests to validate header cache behavior with external balance (`npx tsx tests/credits-cache.test.ts`).
- UI check results:
  - `/history` loads after session injection; screenshot saved to `/tmp/playwright-mcp-output/1769000185438/history-page.png`.
  - Verified external download action via Playwright; `manual-verification-results.csv` saved to `/tmp/playwright-mcp-output/1769000185438/manual-verification-results.csv`.
  - Console warnings observed:
    - `auth.signup_bonus` 409 conflict (eligibility window elapsed).
    - `history.metrics.unknown_statuses` warnings (unexpected verification status keys).
    - Supabase refresh token errors still appear intermittently; may be due to multiple refresh attempts.

## STAYED-LOCAL
- Profile data from `/account/profile` (no external endpoint documented; cannot move without external support).
- Supabase session/auth state (JWT retrieval + sign-out) used by the page shell.
- Auth confirmation and bonus flows handled by the local API via `app/components/auth-provider.tsx`:
  - `GET /auth/confirmed`
  - `POST /credits/signup-bonus`
  - `POST /credits/trial-bonus`
- UI-only state and calculations: filters, summary counts, status labels, and cache map (client-only, no API reads).

## Progress updates
- Created this plan to track `/history` migration steps and document why each step exists.
- Completed Step 1 by mapping `/history` dependencies to their local and external endpoints for newcomers.
- Completed Step 2 by switching `/history` list pagination to external tasks and logging refresh attempts without inventing unsupported parameters.
- Completed Step 3 by wiring the detail fallback to the external task detail endpoint and keeping filename mapping compatible with external task metadata.
- Completed Step 4 by routing history downloads through the external task download endpoint.
- Completed Step 5 by replacing the header credits read with the external credit balance endpoint.
- Marked Step 6 blocked because there is no external profile endpoint documented; `/account/profile` stays local.
- Completed Step 7 by running unit tests and a Playwright UI check; noted console warnings for follow-up.
- Added local auth confirmation/bonus endpoints to STAYED-LOCAL after reviewing the auth provider usage on `/history`.
