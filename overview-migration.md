# Overview migration plan (local → external API)

## Goal (what/why/how/where)
- What: Migrate /overview data flow to call the external API directly wherever possible.
- Why: Align with the new external API as the source of truth and reduce local aggregation.
- Where: /overview UI (`app/overview-v2/*`) and any local API routes used only to proxy overview data.
- How: Replace local API calls with external API calls, keep only Supabase reads that are written by the external API, and document any unavoidable local-only features.

## Step-by-step plan

### Step 1 — Replace overview aggregates with direct external API calls
- What: Swap `getOverview()` usage for direct external API calls for credits, verification metrics, and recent tasks.
- Where: `app/overview-v2/overview-v2-client.tsx`, `app/lib/api-client.ts`.
- Why: `/api/overview` is a local aggregator; the external API already exposes these resources.
- How:
  - Replace `apiClient.getOverview()` with calls to:
    - `GET /api/v1/credits/balance`
    - `GET /api/v1/metrics/verifications`
    - `GET /api/v1/tasks`
  - Build the same UI model on the client from these responses.
  - Preserve existing loading, error, and fallback behavior without new hardcoded defaults.
- Status: Completed.
- Done:
  - Added an external API client in `app/lib/api-client.ts` so /overview can hit external endpoints directly.
  - Rewired `app/overview-v2/overview-v2-client.tsx` to load credits, metrics, and recent tasks from external APIs and derive the same UI totals locally.
  - Kept plan data local by composing existing `getPurchases` + `billingApi.listPlans` responses without using `/api/overview`.
- Notes:
  - Usage series still requires `from` + `to` to return data; the current MVP calls metrics without a date range, so the usage chart may show empty until a range is implemented.
  - External base URL is required via `NEXT_PUBLIC_EMAIL_API_BASE_URL` for the new client.

#### Step 1a — Add a configurable usage date range for metrics series
- What: Provide `from`/`to` for metrics so usage series data is returned.
- Where: `app/overview-v2/overview-v2-client.tsx`, app config module.
- Why: External API only includes series when both bounds are supplied.
- How:
  - Add an app-level config value for the usage range (defaulting to 1 month by configuration).
  - Use it to compute `from` and `to` in the overview metrics request.
- Status: Completed.
- Done:
  - Added `app/lib/app-config.ts` to read `NEXT_PUBLIC_OVERVIEW_USAGE_RANGE_MONTHS`.
  - Passed `from`/`to` based on that range into the metrics request in `app/overview-v2/overview-v2-client.tsx`.

### Step 2 — Replace local task list route usage
- What: Route tasks pagination/refresh directly to external API.
- Where: `app/overview-v2/overview-v2-client.tsx` (tasks section), `app/lib/api-client.ts`.
- Why: `/api/tasks` is a local proxy; external API provides tasks listing.
- How:
  - Update `listTasks` to target `GET /api/v1/tasks` with current paging inputs.
  - Preserve existing pagination UX and error handling.
- Status: Completed.
- Done:
  - Switched /overview pagination and refresh to use `externalApiClient.listTasks` instead of the local route.
  - Added a refresh info log so the UI action is still observable even though the external API does not support a refresh flag.

### Step 3 — Verify Supabase reads are external-API owned
- What: Confirm any Supabase data still used by /overview is populated by the external API.
- Where: Supabase tables referenced by `fetch_profile` and plan-related services.
- Why: Local data reads are only allowed when the external API is the writer.
- How:
  - Identify the tables and validate ownership/source.
  - If not external-API owned, either add external endpoints or remove/replace the feature in the UI.
- Status: Completed.
- Done:
  - Identified Supabase tables used by /overview via code inspection: `profiles`, `credit_grants`, `billing_plans`.
  - Queried Supabase schema metadata to confirm these tables exist and are used for profile and billing plan/credit grant data.
  - Verified in backend code that these tables are written by local services (profile sync + Paddle billing/webhook flows), not by the external API.
- Result:
  - These Supabase reads are NOT external-API owned. They must remain local unless new external endpoints (or external-owned tables) are introduced.

### Step 4 — Remove local overview aggregator route if unused
- What: Deprecate `/api/overview` once the client no longer calls it.
- Where: `backend/app/api/overview.py` and router registration.
- Why: Reduce local API surface and eliminate redundant aggregation.
- How:
  - Remove or guard the route once the frontend no longer depends on it.
  - Ensure no other pages rely on it.
- Status: Completed.
- Done:
  - Deleted `backend/app/api/overview.py` and removed its router from `backend/app/main.py`.
  - Removed `/api/overview` tests (`backend/tests/test_overview.py`) and pruned the unused `getOverview` client and type.

### Step 5 — Validation and regression checks
- What: Confirm /overview UI renders all cards, charts, and tasks with external API data.
- Where: Frontend runtime plus any relevant tests.
- Why: Avoid regressions and ensure all data paths work with external API responses.
- How:
  - Manual smoke checks for loading/error/empty states.
  - Add/adjust tests only if existing coverage is insufficient.
- Status: In progress (blocked on environment config).
- Done:
  - Updated and ran `npm run test:overview` after refactoring overview mapping utilities.
  - Performed Playwright smoke check on `/overview` with injected Supabase session token.
- Blocker:
  - `NEXT_PUBLIC_EMAIL_API_BASE_URL` is not set in the running frontend environment, so external API calls fail and the UI shows “Unavailable”/empty states for credits, metrics, and tasks.

## STAYED-LOCAL
- Supabase profile data (`profiles`) is written by local auth/profile sync, not by the external API.
- Current plan metadata derived from Supabase (`credit_grants`, `billing_plans`) and Paddle webhook flows; no external endpoint documented.
- Integrations catalog (local config) because no external endpoint is documented.

## Progress updates
- Created this plan to track the /overview migration steps, clarify why each step exists, and make handoff to the next session unambiguous.
- Completed Step 1 by replacing `/api/overview` usage with direct external API calls for credits, verification metrics, and recent tasks, and documenting the remaining usage-series gap.
- Completed Step 1a by introducing a configurable metrics date range so usage series can populate.
- Completed Step 2 by routing tasks pagination/refresh directly to the external API.
- Began Step 5 with updated overview mapping tests to cover the new client-side mappings.
- Completed Step 3 by auditing Supabase reads for /overview and confirming they are local (non-external) writers.
- Completed Step 4 by removing the unused local `/api/overview` route and its tests.
- Ran Playwright smoke checks for `/overview` and documented the missing external API base URL as the current blocker.
