# External-API-First Refactor Plan

## Purpose
Transition the dashboard/backend to use the external API as the single source of truth for verification data, tasks, usage, and API keys. Supabase remains only for data the external API does not provide (profiles, billing, and credit grants).

This plan is written for a junior developer to follow step-by-step without ambiguity. It includes what to change, why, how, and the intended end state.

## Guiding Principles
- External API is the source of truth for verification data, tasks, usage, and API keys.
- Supabase is only for: profiles, billing, and credit grants.
- If the external API doesn’t provide a field, UI must show a clear “data unavailable” state (no silent fallback).
- Do not reintroduce local caching for external data unless explicitly required.

## External API Dependencies (Must Be Confirmed/Implemented)
These are required to complete the transition without losing UI functionality.
- Task list/detail includes `file_name` (or equivalent) for uploaded files.
- Manual verification export detail fields are exposed to user-scoped requests (currently only admin `/emails`).
- External API reads credit grants from Supabase to compute balances/usage.
- External API metrics align with “credits used” and “usage totals” in UI.

If any of the above are missing, implement the refactor anyway but keep the UI fields and show “data unavailable.”

## IMPORTANT NOTE FOR EXTERNAL API DEV (Missing/Unclear Data)
If any required data is missing/undocumented, the UI must display the exact message: `ext api data is not available` (and the backend should avoid silent fallback). This keeps the product ready for the ultimate goal while waiting on external API updates.

Missing/unclear as of now:
- Task upload responses include `filename`, but task list/detail schemas do not include `file_name`.
- Manual verification export detail fields are admin-only (`/emails`), not user-scoped.
- Credit usage/spend write-back to Supabase is pending; ext-api-docs do not document any credits/write-back endpoints and the external API dev is waiting on the final Supabase structure.
- Mapping for UI “credits used”/“usage totals” to external metrics is not confirmed yet; ext-api-docs only describe verification totals/series without explicit credit usage fields.
- UI CSV header parsing issue resolved in the frontend (non-fatal PapaParse errors are now warnings, BOM is stripped, empty files are rejected). CSV uploads are no longer blocked by header parsing.
- Local dev backend routes are now confirmed live (401 without auth) for POST `/api/credits/signup-bonus` and GET `/api/tasks/{id}/jobs`; re-verify UI flows with a valid session to ensure the earlier 404s are resolved.

## Target End State (Architecture)
```
Frontend → Backend (FastAPI) → External API (tasks, keys, metrics, verification)
                              ↓
                         Supabase (profiles, billing, credit grants only)
```

## Supabase Credit Grants Schema (Final for External API)
Single append-only table for purchase credits + signup grants. External API should read from this table to compute balances and usage.

```sql
create table if not exists public.credit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id),
  source text not null,
  source_id text not null,
  event_id text null,
  event_type text null,
  transaction_id text null,
  price_ids text[] not null default '{}'::text[],
  credits_granted integer not null check (credits_granted >= 0),
  amount integer null check (amount >= 0),
  currency text null,
  checkout_email text null,
  invoice_id text null,
  invoice_number text null,
  purchased_at timestamptz null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists credit_grants_user_source_id_key
  on public.credit_grants (user_id, source, source_id);

create index if not exists credit_grants_user_source_created_idx
  on public.credit_grants (user_id, source, created_at desc);
```

### Credit Grants Implementation Notes (Current)
- Paddle webhook now writes purchase grants to `credit_grants`.
  - `source=purchase`, `source_id=transaction_id`.
  - `billing_events` remains the idempotency gate; if grant insert fails, the billing event is deleted so retries can reprocess.
- Signup bonus is implemented via `POST /api/credits/signup-bonus`.
  - Validates account age + email confirmation (config-driven).
  - Upserts `credit_grants` with `source=signup`, `source_id=user_id`.
  - Required env vars (no defaults):
    - `SIGNUP_BONUS_CREDITS`
    - `SIGNUP_BONUS_MAX_ACCOUNT_AGE_SECONDS`
    - `SIGNUP_BONUS_REQUIRE_EMAIL_CONFIRMED`
- Signup flow calls `claimSignupBonus` only if Supabase signUp returns a session.
  - Risk: if Supabase returns `session: null` (common when email confirmation is required), the signup bonus is not auto-claimed. Decide if this should move to first confirmed sign-in or email-confirm callback.

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
- `tasks` table (after credit reservations and manual results are fully externalized)
- `task_files` table

**Backend Changes**
- Create a minimal `task_credit_reservations` table (`user_id`, `task_id`, `credit_reserved_count`, `credit_reservation_id`, timestamps) with a unique constraint for idempotency.
- Add a small reservation service and move reservation reads/writes in `backend/app/api/tasks.py` off the `tasks` table.
- Remove `backend/app/services/tasks_store.py`.
- Remove `backend/app/services/task_files_store.py`.
- Simplify `backend/app/api/tasks.py` to proxy external endpoints directly:
  - `GET /api/tasks` → `/api/v1/tasks`
  - `GET /api/tasks/{id}` → `/api/v1/tasks/{id}`
  - `GET /api/tasks/{id}/download` → `/api/v1/tasks/{id}/download`
  - `POST /api/tasks/upload` → `/api/v1/tasks/batch/upload`
- Add `GET /api/tasks/{id}/jobs` → `/api/v1/tasks/{id}/jobs` and deprecate `/api/tasks/latest-manual` (manual verification should read from jobs).
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

### Phase 1 Status (Completed)
- Task proxies (list/detail/download/upload) are external-only.
- Manual verification uses `/api/tasks` + `/api/tasks/{id}/jobs`.
- `/api/tasks/latest-upload(s)` returns 204 with `ext_api_missing_file_name`.
- Local task caches removed (`tasks_store`, `task_files_store`).

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

### Phase 2 Status (Completed)
- `/api/api-keys` now proxies external API key list/create/revoke without any cached fallback or secret storage.
- `cached_api_keys` service logic removed; the bootstrap endpoint was dropped and client auth no longer calls it.
- External `purpose` values are mapped to integration IDs for UI display; key previews are no longer persisted after creation.
- `cached_api_keys` table has been dropped from Supabase after external-only flow verification.

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

### Phase 3 Status (Complete)
- Credits remaining are now external-only: `/api/overview` and `/api/account/credits` return nullable `credits_remaining`, and UI shows `ext api data is not available`.
- Local usage tracking removed: `record_usage` + Supabase `api_usage` reads are gone, `/api/usage` list removed, and `/api/usage/summary` now proxies `/metrics/verifications` with `total`/series mapped from external metrics (per-key summary returns unavailable). The `api_usage` table has been dropped from Supabase.
- Frontend `/api` usage view now shows `ext api data is not available` for missing usage data points (per-key charts and external-metrics outages), while keeping numeric totals when present.
- Phase 3 tests run: `backend/tests/test_usage_summary_route.py`, `backend/tests/test_usage_purpose_route.py`, and `tests/api-usage-utils.test.ts` (warnings from pyiceberg/pydantic).
Planned Phase 3 steps (MVP-first):
1) Remove local usage tracking (Supabase `api_usage`, `record_usage`, and usage services).
2) Proxy `/api/usage/summary` to `/api/v1/metrics/verifications` for totals/series.
3) Frontend `/api` usage charts must show `ext api data is not available` for any missing data points (including per-key charts until the external endpoint is available).
4) Run targeted backend + frontend tests for usage routes and UI utilities.

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

### Phase 4 Status (Completed)
- Manual verification uses external tasks/jobs; local manual result storage removed.

## Phase 5 — Retain Only Essential Local State (Final Cleanup)
**Keep in Supabase**
- `profiles`
- `credit_grants`
- `billing_events`
- `billing_plans`
- `billing_purchases` (until purchase history is migrated to `credit_grants`)

**Remove**
- `tasks`
- `task_files`
- `cached_api_keys`
- `api_usage`
- `user_credits`
- `credit_ledger`

**Why**
- These retained tables are not covered by the external API and are required for billing/profile data.

**End Result**
- Supabase schema is limited to non-external responsibilities.

### Phase 5 Status (In Progress)
- Purchase history now reads from `credit_grants` (source=`purchase`); `billing_purchases` still written but no longer used for account history.
- Signup bonus is claimed after confirmed sessions, removing the dependency on a signup session.
- Paddle E2E script now validates `credit_grants` rather than `billing_purchases`/`user_credits`.

## Testing & Validation
- Backend integration tests for direct external API proxy routes.
- UI tests for handling missing fields (“data unavailable”) without breaking layout.
- Credit flow tests verifying that external API reads `credit_grants` for balances.
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
