# API migration plan (local → external API)

## Goal (what/where/why/how)
- What: Migrate `/api` page data flows (API keys + usage analytics) to the external API.
- Where: `/api` UI (`app/api/*`), API client (`app/lib/api-client.ts`), integrations catalog loader (`app/lib/integrations-catalog.ts`), shared dashboard shell (`app/components/dashboard-shell.tsx`).
- Why: External API is the source of truth for API keys and usage metrics; local proxies add drift risk.
- How: Replace local `/api-keys` and `/usage*` calls with external `/api/v1/api-keys*` endpoints, align integration → purpose mapping using external-owned catalog data, and keep only local endpoints that have no external equivalent documented.

## Step-by-step plan

### Step 1 — Audit current /api data sources
- What: Map each `/api` feature to its current local endpoint and the external replacement.
- Where: `app/api/api-client.tsx`, `app/lib/api-client.ts`, `app/components/dashboard-shell.tsx`, `app/lib/integrations-catalog.ts`.
- Why: Establish a baseline before migrating API calls.
- How: Inspect API client usage and cross-reference ext API docs for replacements.
- Status: Completed.
- Done:
  - API keys list/create/revoke: local `/api-keys*` → external `/api/v1/api-keys*`.
  - Usage per key: local `/usage/summary` + `/api-keys?from&to` → external `/api/v1/api-keys/{id}/usage` (per key) or `/api/v1/api-keys/usage` (all keys).
  - Usage per purpose: local `/usage/purpose` → external `/api/v1/api-keys/usage` (use `requests_by_purpose` + series).
  - Integrations catalog: Supabase `integrations_catalog` (must be external-owned; no ext endpoint documented).
  - Profile name/email/avatar: local `/account/profile` (no ext endpoint documented).
  - Credits: external `/api/v1/credits/balance` (already external).
  - Auth confirmation/bonus flows (triggered by session): local `/auth/confirmed`, `/credits/signup-bonus`, `/credits/trial-bonus` (no ext endpoints documented).

### Step 2 — Migrate API key list/create/revoke to external API
- What: Replace local API key CRUD calls with external endpoints.
- Where: `app/api/api-client.tsx`, `app/lib/api-client.ts`.
- Why: External API owns API key lifecycle.
- How:
  - Add `externalApiClient.listApiKeys`, `externalApiClient.createApiKey`, and `externalApiClient.revokeApiKey`.
  - Switch `/api` page key list + create + revoke flows to the external client.
  - Preserve existing UI behavior, error handling, and key preview masking without hardcoded defaults.
- Status: Completed.
- Done:
  - Added external API client methods for listing, creating, and revoking API keys.
  - Switched `/api` key list, create, and revoke flows to the external API client so the page no longer depends on local `/api-keys` routes.
  - Validated creation requests use the catalog-provided external purpose and emit a visible error when the purpose is missing.

### Step 3 — Migrate usage analytics to external API
- What: Replace usage summary and purpose endpoints with external usage metrics.
- Where: `app/api/api-client.tsx`, `app/api/utils.ts`, `app/lib/api-client.ts`.
- Why: Usage data should come from external API metrics endpoints.
- How:
  - Use `/api/v1/api-keys/usage?from&to` for per-purpose totals and series.
  - Use `/api/v1/api-keys/{id}/usage?from&to` when a specific key is selected; use `/api/v1/api-keys/usage?from&to` for all keys.
  - Map external `usage_count`/`total_requests` to `UsageSummaryPoint.count` and keep series empty if no date range is supplied.
  - Keep logging + `EXTERNAL_DATA_UNAVAILABLE` handling for missing data instead of hardcoded fallbacks.
- Status: Completed.
- Done:
  - Added external API client methods for `/api/v1/api-keys/usage` and `/api/v1/api-keys/{id}/usage`.
  - Rewired `/api` usage loading to use external usage metrics for per-key and per-purpose views.
  - Added usage summary mapping helpers for external key usage + usage metrics and covered them in unit tests.

### Step 4 — Align integration purpose mapping with external API
- What: Ensure API key creation sends a valid external `purpose` value.
- Where: Supabase `integrations_catalog`, `app/lib/integrations-catalog.ts`, `app/api/api-client.tsx`.
- Why: External API expects a controlled set of `purpose` values; hardcoding or guessing is disallowed.
- How:
  - Add a catalog column (e.g. `external_purpose`) populated by the external API.
  - Update the integrations catalog loader to include that purpose field.
  - Use the catalog-provided purpose when calling `POST /api/v1/api-keys` and log an explicit error if missing.
- Status: Completed (catalog seeded; external ownership still required).
- Done:
  - Added `external_purpose` to the Supabase `integrations_catalog` table and updated the catalog loader to return it.
  - Seeded current catalog rows with `external_purpose` values so external API key creation can proceed without guessing.
  - Wired `/api` key creation to use `external_purpose` and log a clear error when it is missing.
- Note:
  - The external API still needs to own/populate this column; current values are seeded from the existing catalog data.

### Step 5 — Resolve profile source for dashboard shell on /api
- What: Determine whether profile data can move off local `/account/profile`.
- Where: `app/components/dashboard-shell.tsx`.
- Why: Requirement is to minimize local data pulls.
- How:
  - If an external profile endpoint is documented, switch to it.
  - If not, keep local profile and document the blocker.
- Status: Blocked (no external profile endpoint documented).

### Step 6 — Validation and regression checks
- What: Ensure `/api` flows work with external API responses.
- Where: `/api` UI and tests.
- Why: Avoid regressions in key management and usage charts.
- How:
  - Run existing `/api` mapping tests (e.g. usage utils, integrations catalog).
  - Add or adjust tests if external response mapping requires it.
- Status: Completed (with warnings).
- Done:
  - Ran `tests/api-usage-utils.test.ts` with the required env vars set.
  - Previously ran `tests/integrations-catalog.test.ts` with the required env vars set.
  - Performed Playwright smoke check on `/api` with session injected; screenshots saved to:
    - `/tmp/playwright-mcp-output/1769009051143/api-page.png`
    - `/tmp/playwright-mcp-output/1769009051143/api-page-usage.png`
- Observations:
  - API keys loaded from the external API, but key preview text shows “ext api data is not available” for each key (external response missing `key_preview` or `key`).
  - Usage load succeeded with no date range; total rendered as `0` and chart showed “Total usage: 0”.
  - Console warnings: `auth.signup_bonus` 409 conflict and duplicate trial bonus logs (existing auth flow).

### Step 7 — Remove local API routes if unused
- What: Remove `/api-keys` and `/usage*` local routes once no pages depend on them.
- Where: `backend/app/api/api_keys.py`, `backend/app/api/usage.py`, `backend/app/main.py`.
- Why: Reduce local API surface area and prevent drift.
- How:
  - Confirm no remaining local callers.
  - Remove routes and update tests accordingly.
- Status: Not started.

## STAYED-LOCAL
- Supabase `integrations_catalog` reads, until the external API owns and populates this table or exposes a dedicated integrations endpoint.
- Profile data from `/account/profile` until an external profile endpoint is documented.
- Auth confirmation + bonus flows (`/auth/confirmed`, `/credits/signup-bonus`, `/credits/trial-bonus`) triggered by `AuthProvider`.
- Supabase session/auth state used by `/api` page shell and guards.

## Progress updates
- Created this plan to track `/api` migration steps and document the local → external mappings for newcomers.
- Completed Step 1 by auditing `/api` dependencies and identifying external replacements or blockers.
- Completed Step 2 by switching key list/create/revoke flows to the external API client.
- Completed Step 4 by adding `external_purpose` to the integrations catalog and using it for external key creation (pending external API ownership of the catalog field).
- Completed Step 3 by replacing `/api` usage analytics with external `/api/v1/api-keys/usage` and `/api/v1/api-keys/{id}/usage`.
- Completed Step 6 with Playwright smoke coverage for `/api` and logged the current warnings.
