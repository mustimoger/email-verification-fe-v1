# Dashboard External API Migration Plan (`docs.boltroute.ai`)

Last updated: 2026-02-10 (UTC)  
Owner: Dashboard app (`apps/dashboard`)  
Goal: adapt dashboard + dashboard backend integration to the updated External API contract documented at `https://docs.boltroute.ai/`.

## 0. Locked migration decisions (confirmed)

- `POST /api/v1/credits/grant` is confirmed as supported and should remain in the backend grant flow.
- Dashboard upload flow must require the user to explicitly mark/select the email column.
- Dashboard primary status model must be exactly five buckets:
  - `valid`
  - `invalid`
  - `catchall` (UI label: Catch-all)
  - `disposable_domain` (UI label: Disposable)
  - `role_based` (UI label: Role-based)
- `disposable_domain` must not be merged into `invalid`.
- Migration target is a full switch to the new External API logic (remove legacy behavior paths rather than keeping mixed old/new logic).

## 1. Source of truth and change window

- Primary docs index: `https://docs.boltroute.ai/llms.txt`
- API sitemap (last modified around 2026-02-05): `https://docs.boltroute.ai/sitemap.xml`
- Key endpoint docs used for this plan:
  - Realtime: `https://docs.boltroute.ai/api-reference/endpoints/realtime-verification.md`
  - Batch tasks/jobs/series/metrics:
    - `https://docs.boltroute.ai/api-reference/endpoints/batch-verification/create-task.md`
    - `https://docs.boltroute.ai/api-reference/endpoints/batch-verification/list-tasks.md`
    - `https://docs.boltroute.ai/api-reference/endpoints/batch-verification/get-task.md`
    - `https://docs.boltroute.ai/api-reference/endpoints/batch-verification/task-jobs.md`
    - `https://docs.boltroute.ai/api-reference/endpoints/batch-verification/task-series.md`
    - `https://docs.boltroute.ai/api-reference/endpoints/batch-verification/metrics-fields.md`
    - `https://docs.boltroute.ai/api-reference/endpoints/batch-verification/download-results.md`
  - File upload:
    - `https://docs.boltroute.ai/api-reference/endpoints/file-upload/upload-file.md`
    - `https://docs.boltroute.ai/api-reference/endpoints/file-upload/get-upload-status.md`
  - API keys and credits:
    - `https://docs.boltroute.ai/api-reference/endpoints/api-keys/list-keys.md`
    - `https://docs.boltroute.ai/api-reference/endpoints/api-keys/create-key.md`
    - `https://docs.boltroute.ai/api-reference/endpoints/api-keys/revoke-key.md`
    - `https://docs.boltroute.ai/api-reference/endpoints/api-keys/usage-summary.md`
    - `https://docs.boltroute.ai/api-reference/endpoints/api-keys/get-key-usage.md`
    - `https://docs.boltroute.ai/api-reference/endpoints/credit/balance.md`
    - `https://docs.boltroute.ai/api-reference/endpoints/credit/transactions.md`
  - Global behavior: `https://docs.boltroute.ai/api-reference/api-behavior.md`

## 2. Full codebase scan: where External API is used

### 2.1 Frontend direct External API usage

- `apps/dashboard/app/lib/api-client.ts`
  - `externalApiClient.*` calls:
    - `/api-keys`
    - `/api-keys/{id}`
    - `/api-keys/usage`
    - `/api-keys/{id}/usage`
    - `/credits/balance`
    - `/metrics/verifications`
    - `/tasks`
    - `/tasks/{id}`
    - `/tasks/{id}/jobs`
    - `/tasks/batch/upload`
    - `/tasks/{id}/download`

### 2.2 Dashboard UI surfaces consuming that data

- `apps/dashboard/app/overview/overview-client.tsx`
- `apps/dashboard/app/overview/utils.ts`
- `apps/dashboard/app/history/history-client.tsx`
- `apps/dashboard/app/history/utils.ts`
- `apps/dashboard/app/verify/verify-client.tsx`
- `apps/dashboard/app/verify/utils.ts`
- `apps/dashboard/app/verify/verify-sections.tsx`
- `apps/dashboard/app/api/api-client.tsx`
- `apps/dashboard/app/api/utils.ts`
- `apps/dashboard/app/account/account-client.tsx`
- `apps/dashboard/app/components/dashboard-shell.tsx`

### 2.3 Dashboard backend proxy/client usage

- External client and models:
  - `apps/dashboard/backend/app/clients/external.py`
- Backend proxy routes:
  - `apps/dashboard/backend/app/api/tasks.py`
  - `apps/dashboard/backend/app/api/account.py` (credits)
  - `apps/dashboard/backend/app/api/debug.py`
- Credits grant helper:
  - `apps/dashboard/backend/app/services/external_credits.py`

### 2.4 Tests and scripts coupled to External API contract

- Frontend tests:
  - `apps/dashboard/tests/verify-mapping.test.ts`
  - `apps/dashboard/tests/history-mapping.test.ts`
  - `apps/dashboard/tests/overview-mapping.test.ts`
  - `apps/dashboard/tests/api-usage-utils.test.ts`
- Backend tests:
  - `apps/dashboard/backend/tests/test_external_client.py`
  - `apps/dashboard/backend/tests/test_tasks_metrics_mapping.py`
  - `apps/dashboard/backend/tests/test_tasks_latest_upload.py`
  - `apps/dashboard/backend/tests/test_tasks_latest_uploads.py`
  - `apps/dashboard/backend/tests/test_tasks_jobs_proxy.py`
  - `apps/dashboard/backend/tests/test_account.py`
  - `apps/dashboard/backend/tests/test_tasks_download_proxy.py`
- External probes/scripts:
  - `apps/dashboard/backend/tests/external_api_test_runner.py`
  - `apps/dashboard/backend/scripts/test_external_api.py`
  - `apps/dashboard/backend/scripts/test_verification_metrics.py`

## 3. Contract deltas that require dashboard updates

## 3.1 Status vocabulary changed (highest-impact)

- New documented verification statuses are:
  - `valid`, `invalid`, `catchall`, `invalid_syntax`, `disposable_domain`, `unknown`
- Current dashboard still includes legacy handling paths for:
  - `exists`, `not_exists`
- Impacted areas:
  - totals derivation (`history/utils.ts`, `overview/utils.ts`, `verify-client.tsx`)
  - backend status model in `external.py` (`EmailStatus`)
  - tests expecting `exists/not_exists`

## 3.2 Metrics payload fields expanded/normalized

- `verification_status` includes:
  - `valid`, `invalid`, `catchall`, `invalid_syntax`, `disposable_domain`, `unknown`
  - `role_based`, `disposable_domain_emails`
- Existing code currently tolerates mixed fields but still biases old keys in places.

## 3.3 File upload workflow now has first-class upload status endpoint

- New doc endpoint:
  - `GET /api/v1/tasks/batch/uploads/{upload_id}`
- Dashboard backend currently returns `204` for:
  - `/api/tasks/latest-upload`
  - `/api/tasks/latest-uploads`
- This is now implementable with doc-backed primitives.

## 3.4 Upload column semantics are broader

- Docs: `email_column` accepts header name or 1-based index (`column` alias supported).
- Dashboard must require explicit user column selection for file uploads.
- Existing backend index-only normalization should be replaced with new-flow logic that accepts user-selected mapping cleanly and forwards it without legacy assumptions.

## 3.5 Credit endpoints in docs vs current grant flow

- Docs explicitly list:
  - `GET /api/v1/credits/balance`
  - `GET /api/v1/credits/transactions`
- Current service calls `POST /credits/grant` (`external_credits.py`).
- User confirmed this grant path is supported and should be retained.

## 4. MVP-first execution plan (step-by-step)

## Phase 0: Decision lock and migration tracking

- [x] P0.1 Lock migration requirements from user clarifications.
  - Why: avoid assumption drift and ensure implementation follows explicit product rules.
  - Actions completed:
    - confirmed `/credits/grant` support.
    - confirmed upload-column UX requirement (user must mark column).
    - confirmed 5-status dashboard model and disposable isolation.
    - confirmed full switch to new API logic (no old/new mixed fallback model).
- [x] P0.2 Keep this file as the canonical migration runbook and progress log after each completed step.
  - Why: next Codex session must resume without ambiguity.
  - Actions completed:
    - added append-only execution logs with explicit What/Why/How/Where for each completed migration step.
    - updated phase/file checklists immediately after each completed step.
    - maintained a strict resume section with exact next scope and guardrails.

## Phase A: Baseline and safety (no behavior changes)

- [ ] A1. Create migration branch and snapshot current behavior.
  - Why: prevent regressions while refactoring status + metrics mapping.
  - Actions:
    - capture sample API responses (realtime, tasks list, task jobs, metrics, upload response) from staging/prod-compatible key.
    - store sanitized fixtures in tests.
- [ ] A2. Add contract fixture docs under dashboard tests.
  - Why: lock expected shapes before changing mappers.
  - Actions:
    - add fixture files for new status fields and file-backed task objects.

## Phase B: Shared status and metrics normalization core

- [x] B1. Introduce single shared status normalization utility.
  - Why: remove duplicated legacy logic and prevent mismatch between pages.
  - Actions completed:
    - create/update shared helper used by `overview`, `history`, and `verify`.
    - switch internal mapping to the 5 primary dashboard buckets:
      - `valid`, `invalid`, `catchall`, `disposable_domain`, `role_based`
    - keep `unknown` as non-primary status handling (not merged into disposable and not silently dropped).
- [x] B2. Update frontend metrics aggregators.
  - Actions completed:
    - `apps/dashboard/app/history/utils.ts`
    - `apps/dashboard/app/overview/utils.ts`
    - `apps/dashboard/app/verify/verify-client.tsx`
    - `apps/dashboard/app/verify/verify-sections.tsx`
  - Expected outcome: consistent counts for the 5 primary status buckets, with explicit handling for any non-primary/unknown states.

## Phase C: Backend external client and route alignment

- [x] C1. Update `external.py` models to match docs shape.
  - Actions completed:
    - aligned status constants/descriptions to documented values.
    - added task/file structures including `is_file_backed` and `file.*` metadata.
    - added upload-status response models for `/tasks/batch/uploads/{upload_id}`.
- [x] C2. Extend client method coverage.
  - Actions completed:
    - added `get_upload_status(upload_id)` in `ExternalAPIClient`.
    - added `list_credit_transactions(limit, offset)` for credit-ledger support.
- [x] C3. Update backend routes in `apps/dashboard/backend/app/api/tasks.py`.
  - Actions completed:
    - kept current route signatures stable for frontend compatibility.
    - re-implemented `/api/tasks/latest-upload` and `/api/tasks/latest-uploads` using upload/task metadata instead of fixed `204`.
    - preserved explicit email-column selection behavior in upload flow unchanged.
- [x] C4. Reconcile credit grant path.
  - Actions completed:
    - retained `/credits/grant` as the server-side admin grant path in backend grant flow.
    - added/adjusted backend tests to ensure signup/trial/purchase grant flows continue to work with updated client models.

## Phase D: Frontend API client and dashboard pages

- [x] D1. Update shared TypeScript types in `apps/dashboard/app/lib/api-client.ts`.
  - Actions completed:
    - updated response/types to include documented fields currently used by UI (verify/task/metrics/latest-upload models).
    - removed stale type assumptions by separating 5 primary statuses from legacy compatibility aliases (`exists/not_exists`) in status type definitions.
- [x] D2. Validate each dashboard surface with new contract.
  - Actions completed:
    - validated `overview`, `history`, and `verify` status/count mappings and summaries with targeted dashboard tests.
    - validated `api` and `account/dashboard-shell` usage/credits fallback paths with dashboard utility tests.
    - validated full dashboard test chain and production build for D2 scope.
    - attempted authenticated Playwright surface checks; blocked by expired session refresh token in `key-value-pair.txt` (`Invalid Refresh Token`), so Playwright evidence remains an E3 task.

## Phase E: Test updates and regression net

- [x] E1. Frontend tests update.
  - Updated:
    - `apps/dashboard/tests/verify-mapping.test.ts`
    - `apps/dashboard/tests/history-mapping.test.ts`
    - `apps/dashboard/tests/overview-mapping.test.ts`
  - Remaining caution:
    - keep scanning for any future tests that reintroduce legacy-first assertions.
- [x] E2. Backend tests update.
  - Must update/add:
    - [x] `apps/dashboard/backend/tests/test_external_client.py`
    - [x] `apps/dashboard/backend/tests/test_tasks_metrics_mapping.py`
    - [x] latest-upload route tests once re-enabled
    - [x] task/job proxy tests for new status payloads
- [x] E3. Integration/smoke checks.
  - Backend: route-level tests for `/api/tasks*`, `/api/account/credits`.
  - Frontend: dashboard test suite + build.
  - Playwright: load `overview`, `history`, `verify`, `api`, `account`; capture console errors and screenshots.
  - E3 findings:
    - Playwright-authenticated route checks completed with refreshed `key-value-pair.txt` session payload.
    - `POST /api/credits/signup-bonus` returns `409 Conflict` with `Signup bonus eligibility window elapsed` for the current test user (logged as warning path, no route crash).
    - `GET /api/account/profile` and `GET /api/account/purchases` return `502 Bad Gateway` on `/account`; this blocks Phase F smoke/deploy gate until fixed and revalidated.

## Phase F: Deploy-to-main gate

- [x] F0. Resolve E3 blocking `/account` proxy failures before deploy gates.
  - Scope completed:
    - fixed backend `/account` proxy resilience for:
      - `GET /api/account/profile`
      - `GET /api/account/purchases`
    - kept frontend route contracts unchanged.
  - Validation:
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_account.py`
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard`
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard`
    - Playwright-authenticated checks for `/account` and `/overview` with post-fix artifacts.
  - Result:
    - no `/api/account/profile` or `/api/account/purchases` `502` in post-fix Playwright console evidence.
    - `POST /api/credits/signup-bonus` `409 Conflict` warning path remains expected for the current test user.
- [x] F1. Pre-deploy gate (all required):
  - dashboard tests pass
  - backend tests pass
  - dashboard build passes
  - manual smoke checks pass on staging/local
  - Validation completed:
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests` passed (`123 passed`).
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard` passed.
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard` passed.
    - Playwright-authenticated checks for `/account` and `/overview` captured pre-deploy artifacts.
  - Result:
    - no `502` entries for `/api/account/profile` or `/api/account/purchases` in F1 console evidence.
    - expected warning-path `409 Conflict` remains on `POST /api/credits/signup-bonus` for current test user.
- [ ] F2. Deploy to `main` and verify production:
  - confirm no API 4xx/5xx spikes in affected routes
  - confirm no dashboard UI status/count regressions
  - verify upload flow end-to-end including file-backed task visibility

## 5. Concrete file-by-file change checklist

- [x] `apps/dashboard/backend/app/clients/external.py`
- [x] `apps/dashboard/backend/app/services/task_metrics.py`
- [x] `apps/dashboard/backend/app/api/tasks.py`
- [x] `apps/dashboard/backend/app/api/account.py`
- [x] `apps/dashboard/backend/app/services/external_credits.py`
- [x] `apps/dashboard/app/lib/api-client.ts`
- [x] `apps/dashboard/app/lib/verification-status.ts`
- [x] `apps/dashboard/app/history/utils.ts`
- [x] `apps/dashboard/app/overview/utils.ts`
- [x] `apps/dashboard/app/overview/overview-client.tsx`
- [x] `apps/dashboard/app/verify/utils.ts`
- [x] `apps/dashboard/app/verify/verify-client.tsx`
- [x] `apps/dashboard/app/verify/verify-sections.tsx`
- [x] `apps/dashboard/tests/verify-mapping.test.ts`
- [x] `apps/dashboard/tests/history-mapping.test.ts`
- [x] `apps/dashboard/tests/overview-mapping.test.ts`
- [x] `apps/dashboard/backend/tests/test_external_client.py`
- [x] `apps/dashboard/backend/tests/test_tasks_metrics_mapping.py`
- [x] `apps/dashboard/backend/tests/test_tasks_jobs_proxy.py`
- [x] `apps/dashboard/backend/tests/test_account.py`
- [x] related latest-upload backend tests
- [x] Playwright E3 artifacts under `tmp/` (`e3-overview/history/verify/api/account` screenshots + console logs)
- [x] Playwright F0 revalidation artifacts under `tmp/` (`f0-account-reval`, `f0-overview-reval` screenshots + console logs)
- [x] Playwright F1 pre-deploy artifacts under `tmp/` (`f1-account-predeploy`, `f1-overview-predeploy` screenshots + console logs)

## 6. Open questions that must be confirmed before implementation

- **NEW (2026-02-10): ext API verification availability**
  - Report from ext API developer: ext API is up, but **cannot perform email verification** right now due to a proxy service limitation on the ext API side.
  - Must confirm scope of impact (do not guess):
    - realtime verification (`/verify` / `/api/v1/verify`) used by:
      - dashboard `/verify` (manual verify),
      - website hero verify (`apps/website/src/app/api/email-verification/route.ts`),
    - bulk/task verification flows (uploads/jobs/status/metrics) may or may not be impacted.
  - Decision required before Phase F2 deploy verification:
    - If verification is unavailable in production, what is the desired UX?
      - disable verify actions + show a clear “temporarily unavailable” message,
      - allow attempts but show a friendly, explicit error on failure,
      - implement a temporary fallback verifier (syntax + DNS/MX only) in our backend/website until ext API verification is restored.
- Resolved on 2026-02-10: `unknown` is shown as a separate secondary metric.

## 7. Definition of done for this migration

- All dashboard surfaces render correctly with updated External API contract.
- No reliance on legacy-only status semantics for correctness.
- Latest upload routes are functional (or intentionally removed with replacement UX).
- Test suites updated and passing for both frontend and backend.
- Deployment verified on `main` with post-deploy smoke checks:
  - if ext API verification is available: verify flows succeed end-to-end,
  - if ext API verification is unavailable: verify-related failures are handled gracefully with explicit user-facing messaging and no unhandled errors.

## 8. Execution log (append-only)

### 2026-02-10 - Step P0.1 completed

- What was done:
  - Recorded user-confirmed migration decisions in Section 0.
  - Updated plan sections to reflect those decisions (upload flow, status model, and grant flow).
  - Reduced open questions to only unresolved behavior around non-primary statuses.
- Why:
  - Prevents future sessions from guessing intent and keeps implementation aligned with your latest instructions.
- Not implemented yet:
  - No runtime code changes in this step.
  - Phase A/B/C implementation remains pending.

### 2026-02-10 - Step B1+B2 started (in progress)

- Planned scope for this implementation step:
  - Add shared status normalization for new External API logic.
  - Update dashboard status/count mapping to the 5 primary buckets:
    - `valid`, `invalid`, `catchall`, `disposable_domain`, `role_based`
  - Keep `unknown` visible as a secondary metric (not merged into primary buckets).
  - Remove legacy `exists/not_exists`-first counting assumptions from dashboard mapping paths.
  - Update related frontend tests to match the new status model behavior.
- Why:
  - This is the first runtime migration step toward a full switch to updated External API semantics.

### 2026-02-10 - Step B1+B2 completed

- What was done:
  - Added shared status normalization/metrics helpers in `apps/dashboard/app/lib/verification-status.ts`.
  - Switched dashboard mapping logic away from legacy `exists/not_exists`-first counting paths in:
    - `apps/dashboard/app/history/utils.ts`
    - `apps/dashboard/app/overview/utils.ts`
    - `apps/dashboard/app/verify/verify-client.tsx`
    - `apps/dashboard/app/verify/verify-sections.tsx`
    - `apps/dashboard/app/verify/utils.ts`
  - Implemented 5 primary buckets in UI aggregation logic:
    - `valid`, `invalid`, `catchall`, `disposable_domain`, `role_based`
  - Kept `unknown` as a separate secondary metric in dashboard summaries.
  - Updated and validated affected frontend tests:
    - `apps/dashboard/tests/history-mapping.test.ts`
    - `apps/dashboard/tests/overview-mapping.test.ts`
    - `apps/dashboard/tests/verify-mapping.test.ts`
- Validation evidence:
  - `source .venv/bin/activate && npm --prefix apps/dashboard run test:history` passed.
  - `source .venv/bin/activate && npm --prefix apps/dashboard run test:overview` passed.
  - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm --prefix apps/dashboard exec tsx apps/dashboard/tests/verify-mapping.test.ts` passed.
  - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard` passed.
  - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard` passed.
- Why:
  - This delivers the first concrete runtime migration step for a full switch to updated External API semantics while preserving test/build safety.
- Not implemented yet:
  - Backend migration phases (`C*`) are still pending.
  - Latest-upload route redesign and credit-transaction surfacing are still pending.
  - No production deploy has been executed for this step yet.

### 2026-02-10 - Step C1+C2 tests-first update completed

- What was done:
  - Updated `apps/dashboard/backend/tests/test_external_client.py` to assert current docs contract behavior for:
    - realtime verification status (`valid` in test fixture)
    - file-backed task payload fields (`is_file_backed`, nested `file.*`) on list/detail responses
    - upload status endpoint support via `GET /tasks/batch/uploads/{upload_id}`
  - Updated `apps/dashboard/backend/tests/test_tasks_metrics_mapping.py` to validate metrics mapping with new status keys:
    - `valid`, `invalid`, `catchall`, `invalid_syntax`, `disposable_domain`, `unknown`
    - legacy aliases remain covered (`exists`, `not_exists`, `disposable_domain_emails`)
  - Updated Section 4 (Phase E2 subitems) and Section 5 file checklist to mark these two backend test files completed for this step.
- Why:
  - Enforces the updated External API contract at test level before changing backend client/runtime code, reducing regression risk during C1/C2 implementation.
- How:
  - Edited the two backend test modules first (tests-before-code), then executed:
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_external_client.py apps/dashboard/backend/tests/test_tasks_metrics_mapping.py`
  - Observed expected red-state failures against current client/service code (missing `is_file_backed`/`file` fields, missing `get_upload_status`, and legacy-first metrics mapping).
- Where:
  - `apps/dashboard/backend/tests/test_external_client.py`
  - `apps/dashboard/backend/tests/test_tasks_metrics_mapping.py`
- Not implemented yet:
  - `apps/dashboard/backend/app/clients/external.py` has not been updated yet for C1/C2.
  - Backend metrics mapper runtime implementation still uses legacy-first counting behavior.
  - Route-level latest-upload/task-job tests are still pending under E2.

### 2026-02-10 - Step C1+C2 runtime alignment completed

- What was done:
  - Updated `apps/dashboard/backend/app/clients/external.py` to align runtime models and client methods with current docs contract:
    - realtime response fields expanded (`id`, `is_disposable`, `domain/host`, `unknown_reason`, `needs_physical_verify`).
    - task models expanded with `is_file_backed`, nested `file` metadata, and `source`.
    - added upload status models and `get_upload_status(upload_id)` method for `GET /tasks/batch/uploads/{upload_id}`.
    - added `list_credit_transactions(limit, offset)` for `GET /credits/transactions` coverage.
  - Updated `apps/dashboard/backend/app/services/task_metrics.py` to align status counting with locked rules:
    - primary buckets use `valid/invalid/catchall/disposable_domain/role_based`.
    - `unknown` is treated as secondary (not merged into `invalid`).
    - legacy aliases (`exists`, `not_exists`, `disposable_domain_emails`) remain supported.
  - Updated Section 4 (Phase C1/C2) and Section 5 checklist to reflect completed runtime files.
- Why:
  - Completes Phase C1+C2 backend contract alignment and removes legacy-first runtime assumptions that conflicted with the updated External API status semantics.
- How:
  - Implemented the model/method changes and mapping alignment, then validated with:
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_external_client.py apps/dashboard/backend/tests/test_tasks_metrics_mapping.py`
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_tasks_list_fallback.py apps/dashboard/backend/tests/test_tasks_jobs_proxy.py apps/dashboard/backend/tests/test_tasks_upload_email_count.py apps/dashboard/backend/tests/test_tasks_latest_upload.py apps/dashboard/backend/tests/test_tasks_latest_uploads.py`
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests`
- Where:
  - `apps/dashboard/backend/app/clients/external.py`
  - `apps/dashboard/backend/app/services/task_metrics.py`
  - `apps/dashboard/backend/tests/test_external_client.py`
  - `apps/dashboard/backend/tests/test_tasks_metrics_mapping.py`
- Not implemented yet:
  - Phase C3 route updates in `apps/dashboard/backend/app/api/tasks.py` are still pending.
  - Latest-upload route behavior remains `204` until C3 is executed.
  - E2 route-level status-payload tests are still pending (`latest-upload` and task/job payload refinements).

### 2026-02-10 - Step C3 tests-first route coverage completed

- What was done:
  - Replaced fixed-`204` assertions in latest-upload route tests with metadata-backed contract assertions:
    - `apps/dashboard/backend/tests/test_tasks_latest_upload.py`
    - `apps/dashboard/backend/tests/test_tasks_latest_uploads.py`
  - Added route coverage for:
    - `200` payloads when file-backed task/upload metadata is available.
    - `204` only when no resolvable file-backed uploads exist.
    - fallback behavior when upload-status lookup is unavailable.
    - default limit behavior (`LATEST_UPLOADS_LIMIT`) and invalid limit validation for `/api/tasks/latest-uploads`.
  - Updated Section 4 (E2 latest-upload tests) and Section 5 (related latest-upload backend tests) checkboxes.
- Why:
  - C3 requires tests-first execution so route behavior changes are driven by explicit backend contract expectations instead of implicit assumptions.
- How:
  - Updated the two test modules first, then executed:
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_tasks_latest_upload.py apps/dashboard/backend/tests/test_tasks_latest_uploads.py`
  - Observed expected red-state failures while routes still return fixed `204` responses.
- Where:
  - `apps/dashboard/backend/tests/test_tasks_latest_upload.py`
  - `apps/dashboard/backend/tests/test_tasks_latest_uploads.py`
- Not implemented yet:
  - `apps/dashboard/backend/app/api/tasks.py` route implementation is still pending for C3.
  - Full backend suite rerun is pending until C3 route code is updated.

### 2026-02-10 - Step C3 latest-upload route implementation completed

- What was done:
  - Implemented metadata-backed latest-upload route behavior in `apps/dashboard/backend/app/api/tasks.py` for:
    - `GET /api/tasks/latest-upload`
    - `GET /api/tasks/latest-uploads`
  - Added internal route helpers to:
    - filter file-backed tasks,
    - resolve upload status via `get_upload_status(upload_id)` when available,
    - gracefully fall back to task/file metadata when upload-status lookup is unavailable,
    - shape responses into existing frontend-compatible `LatestUploadResponse`.
  - Retained `204` behavior only when no resolvable file-backed upload rows are available.
  - Kept upload email-column handling unchanged (no changes to `/api/tasks/upload` mapping/validation path).
  - Updated Section 4 (C3 completed) and Section 5 (`tasks.py` completed) checkboxes.
- Why:
  - C3 is the remaining migration blocker after C1/C2; latest-upload routes needed real metadata-based responses instead of fixed `204`.
- How:
  - Implemented C3 route logic after tests-first red-state, then validated with:
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_tasks_latest_upload.py apps/dashboard/backend/tests/test_tasks_latest_uploads.py`
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests`
  - Both commands passed (`7 passed` targeted, `116 passed` full backend suite).
- Where:
  - `apps/dashboard/backend/app/api/tasks.py`
  - `apps/dashboard/backend/tests/test_tasks_latest_upload.py`
  - `apps/dashboard/backend/tests/test_tasks_latest_uploads.py`
- Not implemented yet:
  - Phase C4 (`/credits/grant` reconciliation/test hardening) is still pending.
  - Phase D/E3/F items remain pending.

### 2026-02-10 - Step C4 credit grant flow reconciliation completed

- What was done:
  - Completed C4 by locking credit-grant route expectations and strengthening grant-flow test coverage without changing existing runtime grant semantics.
  - Added tests to assert:
    - signup bonus flow calls external grant path with `reason="signup_bonus"` and expected metadata payload fields.
    - trial bonus flow calls external grant path with `reason="trial_bonus"` and expected metadata payload fields.
    - purchase webhook flow calls external grant path with `reason="purchase"` and expected purchase metadata.
    - external client continues posting grants through `POST /credits/grant`.
- Why:
  - C4 required reconciling and protecting the `/credits/grant` path while confirming signup/trial/purchase grant flows remain correct with updated client models.
- How:
  - Tests-first updates:
    - `apps/dashboard/backend/tests/test_signup_bonus.py`
    - `apps/dashboard/backend/tests/test_trial_bonus.py`
    - `apps/dashboard/backend/tests/test_billing.py`
    - `apps/dashboard/backend/tests/test_external_client.py`
  - Validation commands:
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_signup_bonus.py apps/dashboard/backend/tests/test_trial_bonus.py apps/dashboard/backend/tests/test_billing.py apps/dashboard/backend/tests/test_external_client.py`
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests`
  - Both passed (`25 passed` targeted, `117 passed` full backend suite).
- Where:
  - `apps/dashboard/backend/tests/test_signup_bonus.py`
  - `apps/dashboard/backend/tests/test_trial_bonus.py`
  - `apps/dashboard/backend/tests/test_billing.py`
  - `apps/dashboard/backend/tests/test_external_client.py`
  - `apps/dashboard/backend/app/services/external_credits.py` (validated contract, no runtime changes required)
- Not implemented yet:
  - Phase D frontend contract/type alignment is still pending.
  - E3 integration/smoke checks and Phase F deploy gates remain pending.

### 2026-02-10 - Step D1 frontend API type alignment completed

- What was done:
  - Updated `apps/dashboard/app/lib/api-client.ts` type contracts to align with updated backend/external API payloads used by dashboard UI:
    - added explicit verification status taxonomy types (`VerificationPrimaryStatus`, secondary statuses, and legacy alias type separation).
    - expanded `VerifyEmailResponse` fields to docs-aligned shape (`id`, disposable/domain/host/catchall flags, `unknown_reason`, `needs_physical_verify`).
    - expanded `VerificationStep` with `email` and `metadata`.
    - added structured status/count map types (`VerificationStatusCounts`, `TaskJobStatusCounts`) and applied them to task + metrics + latest-upload models.
    - added missing task contract fields used by UI flows (`TaskDetailResponse.webhook_url`, `TaskListResponse.source`).
  - No runtime request logic changes were made in this step.
- Why:
  - D1 required frontend shared types to match current contract and to avoid treating legacy aliases (`exists/not_exists`) as primary dashboard status semantics.
- How:
  - Applied type-only updates in `api-client.ts`, then validated dashboard mapping/build safety with:
    - `source .venv/bin/activate && npm --prefix apps/dashboard run test:history`
    - `source .venv/bin/activate && npm --prefix apps/dashboard run test:overview`
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm --prefix apps/dashboard exec tsx apps/dashboard/tests/verify-mapping.test.ts`
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard`
  - All commands passed.
- Where:
  - `apps/dashboard/app/lib/api-client.ts`
- Not implemented yet:
  - D2 surface-by-surface validation remains pending.
  - E3 integration/smoke checks and Phase F deploy work remain pending.

### 2026-02-10 - Step handover hardening for context-limited continuation completed

- What was done:
  - Rewrote Section 9 (`Next Session Resume Guide`) and Section 10 (`Session Handover Lock`) to reflect the **current** migration state with no stale C3 instructions.
  - Set next-session scope to **D2 only** and documented exact validation commands, likely file touch points, updated guardrails, and updated evidence snapshot counts.
- Why:
  - The previous resume guide still pointed to C3-only execution and outdated evidence, which could cause unnecessary rework and incorrect phase ordering.
- How:
  - Replaced outdated handover text with D2-only instructions, refreshed completed-file inventory, refreshed pass evidence (`7 passed`, `25 passed`, `117 passed`, and D1 frontend test/build passes), and updated non-goals accordingly.
- Where:
  - `ext-api-updates.md` Sections 9 and 10.
- Not implemented yet:
  - D2 runtime surface validation is still pending.
  - E3 integration/smoke checks and Phase F deploy gates remain pending.

### 2026-02-10 - Step next-session kickoff message artifact created

- What was done:
  - Added root file `next-codex-session-handover.md` with a copy-ready **initial message** for the next Codex session.
  - Message content is aligned to the current migration checkpoint (`D2 only`) and current locked guardrails.
- Why:
  - You requested an explicit kickoff message artifact to reduce session startup ambiguity and prevent stale-scope restarts.
- How:
  - Authored a strict message template containing:
    - exact read order (`ext-api-updates.md`, `ui-progress.md`, `next-codex-session-handover.md`),
    - current phase lock state (B/C1/C2/C3/C4/D1 complete, D2 next),
    - locked rules and non-violation constraints,
    - required validation commands for D2 and backend fallback validation condition,
    - required progress-log updates after each completed step.
- Where:
  - `next-codex-session-handover.md`
  - `ext-api-updates.md` Section 8 (this entry)
- Not implemented yet:
  - D2 runtime surface validation is still pending.
  - E3 integration/smoke checks and Phase F deploy gates remain pending.

### 2026-02-10 - Step D2 dashboard surface validation completed

- What was done:
  - Completed D2 validation scope for dashboard surfaces against the updated External API contract using existing migrated runtime code.
  - Confirmed no additional runtime code fixes were required by current D2 evidence.
  - Verified API/account-shell supporting utility behavior with additional targeted tests.
- Why:
  - D2 is the final Phase D checkpoint and needed concrete pass evidence before moving to Phase E integration/deploy gates.
- How:
  - Ran required D2 validation commands:
    - `source .venv/bin/activate && npm --prefix apps/dashboard run test:history`
    - `source .venv/bin/activate && npm --prefix apps/dashboard run test:overview`
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm --prefix apps/dashboard exec tsx apps/dashboard/tests/verify-mapping.test.ts`
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard`
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard`
  - Ran additional D2-scope tests:
    - `source .venv/bin/activate && npm --prefix apps/dashboard exec tsx apps/dashboard/tests/api-usage-utils.test.ts`
    - `source .venv/bin/activate && npm --prefix apps/dashboard exec tsx apps/dashboard/tests/credits-cache.test.ts`
  - Attempted Playwright-authenticated route validation on local dashboard dev server:
    - `/signin` and `/overview` loaded, but injected session from `key-value-pair.txt` failed refresh (`AuthApiError: Invalid Refresh Token`), so protected-page Playwright checks remain pending in E3.
- Where:
  - Validation scope files (no additional edits required in this step):
    - `apps/dashboard/app/overview/overview-client.tsx`
    - `apps/dashboard/app/overview/utils.ts`
    - `apps/dashboard/app/history/utils.ts`
    - `apps/dashboard/app/verify/verify-client.tsx`
    - `apps/dashboard/app/verify/verify-sections.tsx`
    - `apps/dashboard/app/verify/utils.ts`
    - `apps/dashboard/app/api/utils.ts`
    - `apps/dashboard/app/components/dashboard-shell.tsx`
    - `apps/dashboard/app/account/account-client.tsx`
  - Test evidence files:
    - `apps/dashboard/tests/history-mapping.test.ts`
    - `apps/dashboard/tests/overview-mapping.test.ts`
    - `apps/dashboard/tests/verify-mapping.test.ts`
    - `apps/dashboard/tests/api-usage-utils.test.ts`
    - `apps/dashboard/tests/credits-cache.test.ts`
- Not implemented yet:
  - E2 remaining subtask (`task/job proxy tests for new status payloads`) is still pending.
  - E3 Playwright authenticated smoke checks are pending a refreshed test session in `key-value-pair.txt`.
  - Phase F deploy gates remain pending.

### 2026-02-10 - Step E2 task/job proxy status-payload coverage completed

- What was done:
  - Completed the remaining E2 backend test item by expanding task/jobs proxy route coverage for updated nested verification statuses and metadata passthrough.
  - Added missing route validation for invalid negative `offset` input on `/api/tasks/{task_id}/jobs`.
- Why:
  - E2 required explicit regression coverage that task/job proxy responses preserve updated External API status payloads (`valid`, `invalid`, `catchall`, `disposable_domain`, `role_based`, `unknown`) and associated email metadata.
- How:
  - Updated `apps/dashboard/backend/tests/test_tasks_jobs_proxy.py` with:
    - a new status-payload passthrough test asserting nested `email.status` values and `is_disposable` / `is_role_based` flags survive route proxying unchanged.
    - a new invalid-offset test asserting `400` for `offset < 0`.
  - Validation evidence:
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_tasks_jobs_proxy.py` passed (`5 passed`).
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests` passed (`119 passed`).
- Where:
  - `apps/dashboard/backend/tests/test_tasks_jobs_proxy.py`
  - `ext-api-updates.md` (Sections 4, 5, 8, 9, 10)
- Not implemented yet:
  - E3 integration/smoke checks and Phase F deploy gates were pending at the end of this step.

### 2026-02-10 - Step E3 integration/smoke checks completed

- What was done:
  - Executed backend route-level smoke coverage for tasks/account scope and frontend dashboard test/build confidence checks.
  - Completed Playwright-authenticated route checks for `overview`, `history`, `verify`, `api`, and `account` using refreshed session data from `key-value-pair.txt`.
  - Captured screenshots and console logs for each protected route.
- Why:
  - E3 is the required integration evidence gate before any deploy-to-main work.
  - Route-level smoke needed to validate real runtime behavior, not just unit-level mapping tests.
- How:
  - Validation commands run:
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_tasks_*.py apps/dashboard/backend/tests/test_account.py` passed (`41 passed`).
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard` passed.
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard` passed.
  - Playwright artifacts captured:
    - screenshots: `tmp/e3-overview.png`, `tmp/e3-history.png`, `tmp/e3-verify.png`, `tmp/e3-api.png`, `tmp/e3-account.png`
    - console logs: `tmp/e3-overview-console.log`, `tmp/e3-history-console.log`, `tmp/e3-verify-console.log`, `tmp/e3-api-console.log`, `tmp/e3-account-console.log`
  - Key runtime findings from Playwright console evidence:
    - `POST /api/credits/signup-bonus` consistently returns `409 Conflict` with eligibility-window warning for the current test user (non-crashing warning path).
    - `/account` route emits blocking backend proxy errors:
      - `GET /api/account/profile` -> `502 Bad Gateway`
      - `GET /api/account/purchases` -> `502 Bad Gateway`
- Where:
  - Evidence artifacts in `tmp/`.
  - Route/runtime surfaces: `apps/dashboard/app/components/dashboard-shell.tsx`, `apps/dashboard/app/account/account-client.tsx`, `apps/dashboard/backend/app/api/account.py`.
  - Tracking updates: `ext-api-updates.md`, `next-codex-session-handover.md`, `ui-progress.md`.
- Not implemented yet:
  - Fix for `/api/account/profile` and `/api/account/purchases` `502` responses is still pending.
  - Phase F deploy gates remain pending until those account-route smoke failures are resolved and revalidated.

### 2026-02-10 - Step F0 `/account` blocker fix revalidation completed

- What was done:
  - Revalidated the completed `/account` backend proxy fix with targeted backend, frontend, and authenticated runtime smoke evidence.
  - Captured post-fix Playwright artifacts for `/account` and `/overview`.
- Why:
  - Phase F cannot progress to deploy gates without proving the E3 blocker (`/account` `502` responses) is no longer present in authenticated route flow.
- How:
  - Validation commands run:
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_account.py` passed (`11 passed`).
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard` passed.
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard` passed.
  - Playwright post-fix artifacts captured:
    - screenshots: `tmp/f0-account-reval.png`, `tmp/f0-overview-reval.png`
    - console logs: `tmp/f0-account-reval-console.log`, `tmp/f0-overview-reval-console.log`
  - Console evidence summary:
    - no `502` entries for `/api/account/profile` or `/api/account/purchases`.
    - expected warning-path `409 Conflict` remains on `POST /api/credits/signup-bonus` for current test user.
- Where:
  - Runtime/backend files already aligned in previous implementation step:
    - `apps/dashboard/backend/app/api/account.py`
    - `apps/dashboard/backend/tests/test_account.py`
  - Post-fix evidence artifacts:
    - `tmp/f0-account-reval.png`, `tmp/f0-account-reval-console.log`
    - `tmp/f0-overview-reval.png`, `tmp/f0-overview-reval-console.log`
  - Tracking updates:
    - `ext-api-updates.md`, `next-codex-session-handover.md`, `ui-progress.md`
- Not implemented yet:
  - Phase F1 pre-deploy gate and Phase F2 deploy verification remained pending at this point in the timeline (F1 completed later; see the Step F1 entry).

### 2026-02-10 - Step post-F0 context-safe handover hardening completed

- What was done:
  - Hardened this runbook for context-limited continuation with explicit next-session start sequencing and no ambiguous scope transitions.
  - Revalidated that the only open implementation scope is Phase F1 then Phase F2.
- Why:
  - Session context is near limit; the next Codex session must resume directly at deploy gates without re-reading stale blocker-fix context or repeating completed runtime migration work.
- How:
  - Kept completed-phase lock explicit: `B/C1/C2/C3/C4/D1/D2/E2/E3/F0`.
  - Tightened Section 9 execution order to include runtime preflight before F1 validation:
    - local services running (`run-local-dev.sh`),
    - backend health check (`/health`),
    - refreshed `key-value-pair.txt` readiness for authenticated Playwright checks.
  - Reconfirmed that remaining scope is limited to:
    - F1 pre-deploy validation gates,
    - F2 deploy-to-main and post-deploy verification.
- Where:
  - `ext-api-updates.md` (Sections 8, 9, 10)
  - `next-codex-session-handover.md` (copy-ready next-session initial message)
  - `ui-progress.md` (Task 147 completion entry)
- Not implemented yet:
  - Phase F1 pre-deploy gate and Phase F2 deploy-to-main verification remained pending at this point in the timeline (F1 completed later; see the Step F1 entry).

### 2026-02-10 - Step F1 pre-deploy gate completed

- What was done:
  - Completed all required F1 validation gates across backend tests, dashboard tests/build, and authenticated protected-route runtime evidence.
  - Captured fresh pre-deploy Playwright artifacts for `/account` and `/overview`.
- Why:
  - Phase F2 deploy-to-main work must not start until pre-deploy quality gates are green and runtime smoke is reconfirmed after the F0 blocker fix.
- How:
  - Validation commands run:
    - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests` passed (`123 passed`).
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard` passed.
    - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard` passed.
  - Playwright-authenticated F1 artifacts captured:
    - screenshots: `tmp/f1-account-predeploy.png`, `tmp/f1-overview-predeploy.png`
    - console logs: `tmp/f1-account-predeploy-console.log`, `tmp/f1-overview-predeploy-console.log`
  - Console evidence summary:
    - no `502` entries for `/api/account/profile` or `/api/account/purchases`.
    - expected warning-path `409 Conflict` remains on `POST /api/credits/signup-bonus` for current test user.
- Where:
  - Evidence artifacts in `tmp/`.
  - Tracking updates: `ext-api-updates.md`, `ui-progress.md`, `next-codex-session-handover.md`.
- Not implemented yet:
  - Phase F2 deploy-to-main and post-deploy verification remain pending.

### 2026-02-10 - Step F2 dependency risk recorded (ext API cannot verify emails)

- What was done:
  - Recorded a new external dependency constraint from the ext API developer: the ext API is reachable, but currently **cannot perform email verification** due to a proxy service limitation on the ext API side.
  - Re-scoped the Phase F2 deploy verification checklist to explicitly account for “verification unavailable” scenarios, so the next session does not treat expected upstream failures as mysterious regressions.
- Why:
  - Phase F2 requires production verification. If the ext API cannot verify emails, then realtime verification will fail regardless of our migration correctness, and the deploy checklist must distinguish:
    - true regressions introduced by this repo,
    - expected upstream failures due to ext API proxy limitations.
- How:
  - Next session must confirm ext API verification scope (do not guess):
    - Is only realtime verification broken, or are bulk/task flows impacted too?
  - Next session must choose expected product behavior while verification is unavailable:
    - degrade gracefully (disable verify actions + show a clear message),
    - allow attempts but return a friendly, explicit error,
    - or implement a temporary fallback verifier (syntax + DNS/MX only) until the ext API proxy dependency is restored.
  - Optional local confirmation check (only if website is running, e.g. via `./run-local-dev.sh`):
    - `curl -sS -X POST http://127.0.0.1:3010/api/email-verification -H 'Content-Type: application/json' -d '{"email":"test@example.com"}'`
    - expected when ext API is healthy: `200` with a normalized verification payload
    - expected when ext API verification is broken: explicit non-`200` with a clear error message from our route
- Where:
  - Tracking updates: `ext-api-updates.md` (Sections 6, 8, 9, 10).
  - Impacted runtime surfaces (if degraded/fallback work is chosen next): `apps/dashboard/app/verify/*`, `apps/dashboard/backend/app/api/tasks.py` (`POST /verify` proxy), `apps/website/src/app/api/email-verification/route.ts`.
- Not implemented yet:
  - No degraded-mode UI or fallback verification was implemented in this step.
  - Phase F2 deploy-to-main and post-deploy verification remain pending, and must incorporate the ext API verification availability decision.

## 9. Next Session Resume Guide (zero-ambiguity handover)

### What

- **Phases B/C1/C2/C3/C4/D1/D2/E2/E3/F0/F1 are completed and validated.**
- Next implementation priority is Phase F2 deploy-to-main verification (with explicit acknowledgement that ext API verification may be unavailable; see Section 6).
- Do not re-open completed B/C1/C2/C3/C4/D1/D2/E2/E3/F0/F1 work unless a failing test or verified contract mismatch requires it.

### Why

- Contract migration and pre-deploy gates are complete; remaining work is Phase F2 deploy-to-main verification.
- Latest Playwright evidence confirms `/account` no longer emits blocking `502` responses for the two affected endpoints.
- Ext API developer reports ext API is up but cannot perform email verification right now due to a proxy service limitation; Phase F2 must not misclassify that upstream issue as a migration regression.

### How

1. Read this file in this exact order:
   - Section `0`
   - Section `4`
   - Section `5`
   - Section `8`
   - Section `9` (this section)
2. Run runtime preflight before F2:
   - start local services if needed: `./run-local-dev.sh`
   - confirm backend health: `curl -sS --max-time 5 http://127.0.0.1:8011/health` returns `{"status":"ok"}`
   - confirm Playwright auth seed file readiness:
     - `key-value-pair.txt` has a current `key:` and `value:` for `http://localhost:8010`
3. Confirm ext API verification availability and decide expected behavior (do not guess):
   - Determine whether the outage affects:
     - realtime verification only (`/verify` / `/api/v1/verify`), or
     - bulk/task verification flows too (uploads/jobs/status/metrics).
   - If website is running locally (e.g. via `./run-local-dev.sh`), a quick confirmation call is:
     - `curl -sS -X POST http://127.0.0.1:3010/api/email-verification -H 'Content-Type: application/json' -d '{"email":"test@example.com"}'`
   - If verification is unavailable:
     - do not proceed to F2 deploy until the desired UX is chosen (degrade vs fallback), implemented, and validated.
4. Complete Phase F2 deploy gate:
   - deploy to `main` only after F1 passes (F1 is complete; see artifacts under `tmp/f1-*`).
   - run post-deploy smoke checks and confirm no regressions on affected routes.
5. Keep MVP-first constraints:
   - keep existing status guardrails unchanged (`valid/invalid/catchall/disposable_domain/role_based` primary, `unknown` secondary).
   - keep `disposable_domain` separate from `invalid`.
   - keep explicit upload email-column semantics unchanged.
   - keep `/credits/grant` flow unchanged.
6. After finishing each completed step:
   - append a new Section 8 entry with **What/Why/How/Where**.
   - update checkboxes in Section 4 and Section 5.
   - append a completed task entry to `ui-progress.md`.
   - ask user confirmation before starting the next phase.

### Where

- **Completed and validated backend migration files (do not redo unless required):**
  - `apps/dashboard/backend/app/clients/external.py`
  - `apps/dashboard/backend/app/services/task_metrics.py`
  - `apps/dashboard/backend/app/api/tasks.py`
  - `apps/dashboard/backend/app/services/external_credits.py`
  - `apps/dashboard/backend/tests/test_external_client.py`
  - `apps/dashboard/backend/tests/test_tasks_metrics_mapping.py`
- **Completed and validated frontend migration files (do not redo unless required):**
  - `apps/dashboard/app/lib/verification-status.ts`
  - `apps/dashboard/app/lib/api-client.ts`
  - `apps/dashboard/app/history/utils.ts`
  - `apps/dashboard/app/overview/utils.ts`
  - `apps/dashboard/app/overview/overview-client.tsx`
  - `apps/dashboard/app/verify/utils.ts`
  - `apps/dashboard/app/verify/verify-client.tsx`
  - `apps/dashboard/app/verify/verify-sections.tsx`
  - `apps/dashboard/tests/history-mapping.test.ts`
  - `apps/dashboard/tests/overview-mapping.test.ts`
  - `apps/dashboard/tests/verify-mapping.test.ts`
- **E3 baseline artifacts (do not delete before deploy verification):**
  - `tmp/e3-overview.png`, `tmp/e3-overview-console.log`
  - `tmp/e3-history.png`, `tmp/e3-history-console.log`
  - `tmp/e3-verify.png`, `tmp/e3-verify-console.log`
  - `tmp/e3-api.png`, `tmp/e3-api-console.log`
  - `tmp/e3-account.png`, `tmp/e3-account-console.log`
- **F0 revalidation artifacts (do not delete before deploy verification):**
  - `tmp/f0-account-reval.png`, `tmp/f0-account-reval-console.log`
  - `tmp/f0-overview-reval.png`, `tmp/f0-overview-reval-console.log`
- **F1 pre-deploy artifacts (do not delete before deploy verification):**
  - `tmp/f1-account-predeploy.png`, `tmp/f1-account-predeploy-console.log`
  - `tmp/f1-overview-predeploy.png`, `tmp/f1-overview-predeploy-console.log`
- **Next likely files to touch for F2 gate:**
  - `ext-api-updates.md`
  - `ui-progress.md`
  - `next-codex-session-handover.md`
  - deploy workflow/log artifacts as needed during F2 execution.

### Guardrails

- Keep 5 primary statuses only: `valid`, `invalid`, `catchall`, `disposable_domain`, `role_based`.
- Keep `disposable_domain` separate from `invalid`.
- Keep `unknown` secondary (not merged into primary bucket counts).
- Keep upload flow requiring explicit email-column selection.
- Keep credits grant flow using `/credits/grant`.
- No rollback of completed Phase B/C1/C2/C3/C4/D1/D2/E2/E3/F0/F1 work unless forced by verified contract mismatch.

### Evidence Snapshot (2026-02-10 UTC)

- Targeted C3 route tests:
  - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_tasks_latest_upload.py apps/dashboard/backend/tests/test_tasks_latest_uploads.py` passed (`7 passed`).
- Targeted C4 credit-grant tests:
  - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_signup_bonus.py apps/dashboard/backend/tests/test_trial_bonus.py apps/dashboard/backend/tests/test_billing.py apps/dashboard/backend/tests/test_external_client.py` passed (`25 passed`).
- D1 frontend validation:
  - `source .venv/bin/activate && npm --prefix apps/dashboard run test:history` passed.
  - `source .venv/bin/activate && npm --prefix apps/dashboard run test:overview` passed.
  - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm --prefix apps/dashboard exec tsx apps/dashboard/tests/verify-mapping.test.ts` passed.
  - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard` passed.
  - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard` passed.
- Additional D2 utility validation:
  - `source .venv/bin/activate && npm --prefix apps/dashboard exec tsx apps/dashboard/tests/api-usage-utils.test.ts` passed.
  - `source .venv/bin/activate && npm --prefix apps/dashboard exec tsx apps/dashboard/tests/credits-cache.test.ts` passed.
- E2 backend status-payload proxy validation:
  - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_tasks_jobs_proxy.py` passed (`5 passed`).
- E3 backend/frontend smoke validation:
  - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_tasks_*.py apps/dashboard/backend/tests/test_account.py` passed (`41 passed`).
  - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard` passed.
  - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard` passed.
- E3 Playwright-authenticated route evidence:
  - Protected routes loaded with artifacts captured for `overview`, `history`, `verify`, `api`, `account`.
  - Console findings:
    - `POST /api/credits/signup-bonus` -> `409 Conflict` (`Signup bonus eligibility window elapsed` warning path).
    - `GET /api/account/profile` -> `502 Bad Gateway` on `/account`.
    - `GET /api/account/purchases` -> `502 Bad Gateway` on `/account`.
- F0 post-fix revalidation evidence:
  - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_account.py` passed (`11 passed`).
  - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard` passed.
  - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard` passed.
  - Playwright-authenticated `/account` + `/overview` artifacts:
    - `tmp/f0-account-reval.png`, `tmp/f0-account-reval-console.log`
    - `tmp/f0-overview-reval.png`, `tmp/f0-overview-reval-console.log`
  - Console findings:
    - no `502` entries for `/api/account/profile` or `/api/account/purchases`.
    - `POST /api/credits/signup-bonus` -> `409 Conflict` warning path remains.
- F1 pre-deploy gate evidence:
  - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests` passed (`123 passed`).
  - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard` passed.
  - `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard` passed.
  - Playwright-authenticated `/account` + `/overview` artifacts:
    - `tmp/f1-account-predeploy.png`, `tmp/f1-account-predeploy-console.log`
    - `tmp/f1-overview-predeploy.png`, `tmp/f1-overview-predeploy-console.log`
  - Console findings:
    - no `502` entries for `/api/account/profile` or `/api/account/purchases`.
    - `POST /api/credits/signup-bonus` -> `409 Conflict` warning path remains.
- Earlier C1/C2 core tests:
  - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_external_client.py apps/dashboard/backend/tests/test_tasks_metrics_mapping.py` passed.
- Full backend suite:
  - `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests` passed (`123 passed`).
- Remaining migration gap:
  - Phase F2 deploy-to-main and post-deploy verification.

### Non-goals For Next Session

- Do not proceed to Phase F2 deploy until ext API verification availability is confirmed and the expected behavior decision is made (degrade vs fallback) if verification remains unavailable.
- Do not introduce mixed legacy/new status semantics.
- Do not change upload UX semantics away from explicit email-column selection.
- Do not replace `/credits/grant` flow with alternative endpoints.

## 10. Session Handover Lock (2026-02-10 UTC, post-F1 handover-hardened)

- What:
  - Re-baselined this runbook to post-F1 state with pre-deploy gate artifacts, explicit session-start preflight, remaining F2 deploy verification scope only, and an explicit note that ext API email verification may currently be unavailable due to an upstream proxy service limitation.
- Why:
  - Contract migration and pre-deploy gates are complete; the next session must start directly on F2 deploy verification without redoing completed work or guessing runtime prerequisites.
  - Without recording the ext API verification outage context, the next session could misclassify upstream failures as migration regressions and take incorrect actions.
- How:
  - Marked F1 complete in Section 4, updated Section 5 with F1 artifact coverage, appended Section 8 F1 entry, updated Section 6/9 with ext API verification availability decision requirements, and refreshed the evidence snapshot.
- Where:
  - `ext-api-updates.md` (Sections 4, 5, 8, 9, 10), `next-codex-session-handover.md`.
- Not implemented yet:
  - Phase F2 deploy-to-main and post-deploy verification remain pending.
