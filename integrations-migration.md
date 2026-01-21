# Integrations Migration Plan

## Context
- Page: `/integrations` (and shared `DashboardShell` dependencies invoked on that page).
- Goal: move integrations catalog data off the local backend and into an external source (ext API or Supabase table written by ext API).
- Constraint: avoid local hardcoded catalogs; prefer ext API or Supabase data authored by ext API.

## Decision
- Ext API docs contain no integrations catalog endpoint (no `/api/v1/integrations` or equivalent in `ext-api-docs/endpoints/*`).
- Path forward: use a Supabase table as the catalog source, populated by the ext API (allowed exception to "ext-first").

## Plan (MVP first, then test, then deploy)
### Step 1: Confirm ext API coverage for integrations catalog
- What: verify whether ext API exposes integrations catalog data.
- Where: `ext-api-docs/endpoints/*`.
- Why: avoid guessing or hardcoding when an existing external endpoint exists.
- How: scan endpoint docs for integrations-related routes and payloads.
- Status: completed.
- Update: No integrations catalog endpoint found; migration must rely on a Supabase table populated by the ext API or a new ext API endpoint added outside this repo.

### Step 2: Define external catalog source (Supabase)
- What: create an `integrations_catalog` table that the ext API writes to.
- Where: Supabase `public` schema (or designated catalog schema).
- Why: centralize catalog data outside the local backend and allow updates without frontend deploys.
- How: add a migration with columns like `id`, `label`, `description`, `icon_url`, `default_name`, `sort_order`, `is_active`, `updated_at`; add RLS read access for authenticated users; ext API upserts on deploy.
- Status: completed.
- Update: Created `public.integrations_catalog` with catalog fields, timestamps, and an authenticated read policy so the frontend can query it while the ext API populates it.
- Update: Ext API population of this table is still required (not implemented in this repo).

### Step 3: Add a frontend data source for the catalog
- What: implement a new `listIntegrationsExternal()` data loader.
- Where: `app/lib/api-client.ts` (or a dedicated module like `app/lib/integrations.ts`).
- Why: remove local `/api/integrations` dependency.
- How: query Supabase with `getSupabaseBrowserClient()` for `integrations_catalog`, order by `sort_order`, and map to `IntegrationOption[]` with clear error logging.
- Status: completed.
- Update: Added a Supabase-backed loader in `app/lib/integrations-catalog.ts` to read from `public.integrations_catalog`, sort consistently, and surface errors via `ApiError` so the UI can show failures instead of silently falling back.

### Step 4: Wire `/integrations` page to the external catalog
- What: update `/integrations` to use the new external/Supabase list method.
- Where: `app/integrations/integrations-client.tsx`.
- Why: ensure the catalog is fully externalized.
- How: replace `apiClient.listIntegrations()` with the new loader; keep existing loading/error UI.
- Status: completed.
- Update: `/integrations` now pulls from the Supabase-backed catalog loader, preserving the existing loading/error UI while removing the local `/api/integrations` dependency.

### Step 5: Update other pages that consume integrations
- What: reuse the new loader in Overview and API pages.
- Where: `app/overview/overview-client.tsx`, `app/api/api-client.tsx`.
- Why: keep integration labels and IDs consistent across the dashboard.
- How: replace local `apiClient.listIntegrations()` calls with the new loader.
- Status: completed.
- Update: Overview and API pages now read the integrations catalog from Supabase via the shared loader, keeping label maps and defaults aligned with the external source.

### Step 6: Tests (MVP)
- What: add unit tests for the new loader and any mapping logic.
- Where: `tests/*`.
- Why: prevent regressions and ensure external data handling stays correct.
- How: mock Supabase client responses and verify `IntegrationOption` mapping + error paths.
- Status: completed.
- Update: Added `tests/integrations-catalog.test.ts` to verify query shape, mapping, empty results, and error handling for the Supabase-backed catalog loader.

### Step 7: Seed Supabase catalog from local config (one-time)
- What: populate `public.integrations_catalog` using `backend/config/integrations.json`.
- Where: Supabase table `public.integrations_catalog`.
- Why: restore catalog data immediately while the ext API population job is still pending.
- How: run a one-time upsert that maps config fields to table columns and sets `sort_order` based on file order.
- Status: completed.
- Update: Seeded Supabase with `zapier`, `n8n`, and `google-sheets` from `backend/config/integrations.json` including logo paths.

### Step 8: Deploy to main, then enhancements
- What: push changes, verify locally, and merge to `main`.
- Where: GitHub.
- Why: follow MVP → test → deploy discipline.
- How: run tests, push, and confirm production behavior.
- Status: completed.
- Update: Committed the integrations migration changes and pushed them to `main`.

## STAYED-LOCAL
- Supabase auth session gating (`RequireAuth`, `useAuth`) remains client-side and is not migrated to ext API.
- `DashboardShell` profile data still uses local `GET /api/account/profile` until a global profile migration is planned.
- Static hero/highlight copy and CTA links remain in the frontend.
- Integration icon assets remain in `public/integrations/*` until the catalog provides external icon URLs and assets are relocated.
