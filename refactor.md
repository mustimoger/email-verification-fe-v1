# External-API-First Refactor Plan

## Purpose
Transition the dashboard/backend to use the external API as the single source of truth for verification data, tasks, usage, and API keys. Supabase remains only for data the external API does not provide (profiles, billing, and credit ledger/purchases).

This plan is written for a junior developer to follow step-by-step without ambiguity. It includes what to change, why, how, and the intended end state.

## Guiding Principles
- External API is the source of truth for verification data, tasks, usage, and API keys.
- Supabase is only for: profiles, billing, credit ledger, and purchase history.
- If the external API doesn’t provide a field, UI must show a clear “data unavailable” state (no silent fallback).
- Do not reintroduce local caching for external data unless explicitly required.

## External API Dependencies (Must Be Confirmed/Implemented)
These are required to complete the transition without losing UI functionality.
- Task list/detail includes `file_name` (or equivalent) for uploaded files.
- Manual verification export detail fields are exposed to user-scoped requests (currently only admin `/emails`).
- External API writes credit usage/spend to Supabase (single source of truth for credits).
- External API metrics align with “credits used” and “usage totals” in UI.

If any of the above are missing, implement the refactor anyway but keep the UI fields and show a “data unavailable” state until the external API ships the missing data.

## Target End State (Architecture)
```
Frontend → Backend (FastAPI) → External API (tasks, keys, metrics, verification)
                              ↓
                         Supabase (profiles, credits ledger, billing only)
```

## Phase 0 — Preconditions and Alignment (Required)
**What**
- Confirm external API behavior for file_name, export detail fields, and credit write-back.
- Define mapping from external metrics → UI “credits used”/“usage totals.”

**Why**
- Prevent loss of UI functionality and incorrect usage/credit reporting.

**How**
- Document the external API behaviors and update this plan if field names differ.
- If any dependency is not available yet, keep UI fields and show “data unavailable.”

**End Result**
- All external API dependencies are confirmed or explicitly tracked as pending.

## Phase 1 — Remove Task Caching (High Priority)
**Remove from Supabase**
- `tasks` table
- `task_files` table

**Backend Changes**
- Remove `backend/app/services/tasks_store.py`.
- Remove `backend/app/services/task_files_store.py`.
- Simplify `backend/app/api/tasks.py` to proxy external endpoints directly:
  - `GET /api/tasks` → `/api/v1/tasks`
  - `GET /api/tasks/{id}` → `/api/v1/tasks/{id}`
  - `GET /api/tasks/{id}/download` → `/api/v1/tasks/{id}/download`
  - `POST /api/tasks/upload` → `/api/v1/tasks/batch/upload`
- Remove all Supabase upsert logic, polling logic, and local task persistence.

**Frontend Changes**
- Update `app/history/page.tsx` to consume external API response format directly.
- Update `app/verify/page.tsx` to use external task responses directly.
- Keep file name fields in UI; show “data unavailable” if the external API doesn’t return file_name.

**Why**
- Eliminates duplication and stale caches.
- External API already owns task state and metrics.

**End Result**
- Task list/detail/download are sourced directly from the external API.
- No local task storage or polling logic remains.

## Phase 2 — Remove API Key Caching (Medium Priority)
**Remove from Supabase**
- `cached_api_keys` table

**Backend Changes**
- Remove `backend/app/services/api_keys.py` caching functions.
- Simplify `backend/app/api/api_keys.py`:
  - `GET /api/api-keys` → `/api/v1/api-keys`
  - `POST /api/api-keys` → `/api/v1/api-keys`
  - `DELETE /api/api-keys/{id}` → `/api/v1/api-keys/{id}`
  - Remove bootstrap endpoint.
  - If UI needs integration mapping, store only the mapping locally (no secrets).

**Frontend Changes**
- Update `app/api/page.tsx` to use external API key data directly.
- Remove local key preview logic (external API does not return secrets after creation).

**Why**
- External API already provides key lifecycle and usage tracking.
- Removes sensitive key storage in Supabase.

**End Result**
- API key data is always fetched from the external API.

## Phase 3 — Remove Local Usage Tracking (Medium Priority)
**Remove from Supabase**
- `api_usage` table

**Backend Changes**
- Remove `backend/app/services/usage.py`.
- Remove `backend/app/services/usage_summary.py`.
- Simplify `backend/app/api/usage.py`:
  - `/api/usage/summary` → proxy to `/api/v1/metrics/verifications`
  - `/api/usage/purpose` → proxy to `/api/v1/metrics/api-usage`
- Remove `record_usage` calls throughout backend.

**Frontend Changes**
- Update `app/overview/page.tsx` to use external metrics directly.
- Ensure charts accept external series format.
- Keep UI labels as-is; map external fields to UI totals and show “data unavailable” if missing.

**Why**
- External API provides richer, centralized metrics.
- Eliminates duplicate usage tracking.

**End Result**
- All usage/metrics are sourced from the external API.

## Phase 4 — Simplify Manual Verification (Low Priority)
**What**
- Stop storing manual verification results locally.

**Backend Changes**
- `POST /api/verify` should call external `/api/v1/verify` directly.
- Manual multi-email flows should use external `/api/v1/tasks`.
- Remove manual result storage logic from `backend/app/api/tasks.py`.

**Frontend Changes**
- `app/verify/page.tsx` uses external task/verify results directly.
- If export detail fields are missing, show “data unavailable.”

**Why**
- Keeps manual and bulk flows consistent and externalized.

**End Result**
- Manual verification flows no longer depend on Supabase task storage.

## Phase 5 — Retain Only Essential Local State (Final Cleanup)
**Keep in Supabase**
- `profiles`
- `user_credits`
- `credit_ledger`
- `billing_events`
- `billing_plans`
- `billing_purchases`

**Remove**
- `tasks`
- `task_files`
- `cached_api_keys`
- `api_usage`

**Why**
- These retained tables are not covered by the external API and are required for billing/credits/profile data.

**End Result**
- Supabase schema is limited to non-external responsibilities.

## Testing & Validation
- Backend integration tests for direct external API proxy routes.
- UI tests for handling missing fields (“data unavailable”) without breaking layout.
- Credit flow tests verifying that external API writes spend details to Supabase.
- Usage totals/series consistency checks against external metrics.

## Rollback Strategy
- Keep old tables with a `_deprecated` suffix during the first release.
- Feature-flag proxy routes if needed.
- Monitor external API uptime and field coverage before dropping deprecated tables.

## Expected Outcomes
- Single source of truth for verification data and usage.
- Simpler backend (no task/usage caching).
- Fewer Supabase tables and less schema complexity.
- Clearer separation of responsibilities: external API for verification, Supabase for billing/profile.
