# Handover (current session wrap-up)

## State of codebase
- Frontend pages now wired to backend where possible:
  - `/verify`: manual flow creates a task via `/api/tasks` for all pasted emails (pending statuses shown); file upload posts all selected files sequentially to `/api/tasks/upload`; loading/error/toast handling; multi-file support.
  - `/history`: fetches tasks + task details from backend, derives counts from job email statuses, shows pending vs download.
  - `/api`: lists/creates/revokes API keys via backend; caches last plaintext key; loads usage from `/usage` (uses `count` for processed/valid for now). Basic error/loading.
  - `/account`: fetches profile + credits from backend; updates display_name/email via PATCH; shows credits remaining; purchases table still static empty (no backend data yet).
  - Other pages (overview, pricing, integrations) unchanged UI-wise.
- Backend:
  - FastAPI app with routes split: tasks (verify/create/list/detail/upload), api-keys (list/create/revoke + Supabase cache), account (profile/credits), usage (Supabase-backed). Auth via Supabase JWT (Bearer or cookie).
  - External client for verification API; usage logging into Supabase `api_usage` after external calls; multi-file upload sequential handling; storage guard 10 MB.
  - Supabase tables: `profiles`, `user_credits`, `api_usage`, `cached_api_keys` (new), all created via MCP.
  - Retention helper exists (age + credits rule), but no scheduler/endpoint yet.
- Tests: smoke tests (settings, auth dependency, external client guard/parsing, retention) passing. No integration tests yet.
- Env: `backend/.env` populated (NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api, DATABASE_URL with %40 encoded). `.env.example` documents required vars.

## Pending/next steps (suggested)
- Usage ingestion refinement: currently logging one usage per external call with count. If richer metrics needed (valid/invalid), extend backend to capture per-call payload stats and adjust usage chart mapping.
- Storage/retention: add a scheduled hook or endpoint to invoke `purge_expired_uploads` (honors credits >0 for retention days). Ensure retention rule matches product expectation.
- Frontend wiring: purchases history still static; wire once backend schema is defined. Improve usage chart once backend returns split metrics.
- Integration tests: add route-level tests for tasks/api-keys/account/usage with mocked external API and Supabase client.
- CORS/env: confirm staging/prod origins and set BACKEND_CORS_ORIGINS accordingly.

## Notes/decisions
- Two backends: external “API backend” (issues/verifies keys) and our “frontend backend” (FastAPI) which logs usage to Supabase and fronts the UI. External API has no usage endpoint.
- Manual verify flow now task-based (bulk via `/tasks`).
- File upload supports multiple files sequentially via `/tasks/upload`.
- Cached API keys stored in Supabase (`cached_api_keys`), though UI reads from external list and caches only plaintext locally on create.

## How to run/check
- Lint: `npm run lint` (passes).
- Backend tests: `pytest backend/tests` (passes).
- Backend runs with `uvicorn app.main:app` from `backend` (requires `.env`).

## Warnings
- Purchase history not wired (no backend data).
- Usage chart treats `count` as processed/valid; adjust when backend provides split metrics.
- Retention cleanup not scheduled/invoked yet; only helper exists.
