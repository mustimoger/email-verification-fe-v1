# Credit Enforcement Plan (agreed requirements)

Goal: enforce credits across all verification flows so users can only verify when they have credits, and consume credits at completion time based on actual processed counts.

Agreed requirements
- Credits are consumed at completion time using actual processed counts.
- When credits are insufficient, the app must hard‑fail (no partial acceptance).
- `/verify` (single email) consumes from the same credit pool as batch tasks.
- No hardcoded fallbacks; log clearly on failures.

Plan (step‑by‑step)

1) Define credit debit rules and idempotency keys (MVP) (DONE)
   - Clarify what “completion” means per flow:
     - Manual `/tasks` → when task detail shows finished status and has counts.
     - File `/tasks/upload` → when task detail is available and counts exist.
     - `/verify` single email → when verification result returned (single unit).
   - Decide exact source of “processed count” to debit:
     - Use counts from task detail metrics (valid + invalid + catchall) when available.
     - For `/verify`, treat 1 email as processed.
   - Define idempotency key per debit to avoid double‑charges on retries:
     - For tasks: `task_id`.
     - For uploads: `task_id` (same as above).
     - For verify: a request UUID or a composite key (user_id + email + timestamp) stored in a dedicated table.
   - Why: prevents double deductions and creates a clean audit trail.
   Explanation: Documented completion‑time debit rules, idempotency keys, and processed‑count sources so later implementation matches the agreed behavior.

2) Add credit ledger storage (Supabase) (DONE)
   - Create a `credit_ledger` table (append‑only):
     - `id` (uuid), `user_id`, `source` (purchase|verify|task), `source_id`, `delta`, `created_at`, `meta` jsonb.
     - Unique constraint on `(user_id, source, source_id)` for idempotency.
   - If a ledger table already exists or is preferred elsewhere, use it instead of new schema.
   Explanation: Created `credit_ledger` with a unique `(user_id, source, source_id)` key so debits are idempotent and auditable.

3) Implement atomic debit in Supabase client (DONE)
   Explanation: Added a baseline atomic debit RPC and client helper so credits can be decremented safely when sufficient.

3b) Add ledger‑backed atomic debit RPC (DONE)
   - Ensure ledger insert and credit decrement happen in a single transaction.
   - Return explicit status (applied|duplicate|insufficient) without leaving ledger residue on insufficient funds.
   - Use this for all debits so idempotency is enforced by `(user_id, source, source_id)`.
   - Add a dedicated function that atomically checks and decrements credits with a single statement.
   - Requirements:
     - Hard‑fail if `credits_remaining < debit_amount`.
     - Ensure concurrent requests cannot overspend.
     - Return updated balance on success.
   - Log failures with explicit reason (insufficient vs other).
   Explanation: Added `apply_credit_debit` RPC to insert a ledger entry and debit in one transaction, returning explicit status without leaving residue.

4) Enforce credit availability in verification endpoints (DONE)
   - `/verify`:
     - On successful external verification result, debit 1 credit (atomic) using the ledger.
     - If debit fails (insufficient), respond with 402/409 and do not return success to the client.
   - `/tasks` (manual) and `/tasks/upload`:
     - Do not debit on create; defer until task completion is observed.
     - Introduce a completion handler that pulls actual counts and attempts debit once per task.
     - If debit fails, return an error on detail fetch; task status update is pending.
   Explanation: `/verify` now debits on completion and hard‑fails on insufficient credits; task completion debits are enforced when results are fetched. Task status updates on insufficient credits are not yet implemented.

5) Task completion detection + debit trigger (DONE)
   - When `/tasks/{id}` is fetched and the task is finished with counts available:
     - Attempt credit debit if not already recorded in ledger.
     - If debit succeeds, store ledger entry and continue.
     - If debit fails, return a hard‑fail response (insufficient credits) and log.
   - Ensure this does not re‑debit on subsequent fetches (idempotency key).
   Explanation: Task detail/download now attempts debit once per task using the ledger and blocks results when credits are insufficient or counts are missing; completion detection relies on `finished_at` or metrics when present.

6) UI handling for credit‑insufficient responses (DONE)
   - Surface server‑provided 402 detail in manual verify flow (task polling) without altering layout.
   - Surface server‑provided 402 detail in file upload flow (task detail fetch + summary path) without altering layout.
   - Surface server‑provided 402 detail in download flow without altering layout.
   - Avoid hardcoded fallback copy; log and display the most specific API error message available.
   - Add a small unit test covering error‑message extraction so 402 detail is preserved.
   Explanation: Verify now resolves API error messages via a shared helper, shows 402 detail during manual polling, file detail fetches, and downloads without layout changes, and logs when detail is missing. Added unit coverage in `tests/verify-mapping.test.ts` to lock in 402 detail extraction.

7) Tests + verification (DONE)
   - Unit tests for atomic debit and ledger idempotency.
   - Integration tests for `/verify` and `/tasks/{id}` debit behavior (success + insufficient).
   - Manual verification: run a verify flow with 0 credits → hard‑fail.
   - Prefer FastAPI TestClient + dependency overrides; avoid external API calls.
   Explanation: Added backend unit coverage for `apply_credit_debit` status handling, plus FastAPI integration tests confirming `/api/verify` and `/api/tasks/{id}` return 402 on insufficient credits. Ran targeted pytest with venv activated.

8) Frontend request_id for `/verify` idempotency (DONE)
   - Generate a stable request_id per verification attempt on the client.
   - Include request_id in `/verify` payloads to prevent double‑debits on retries.
   - Ensure a new request_id is used for a new attempt.
   Explanation: Added a client-side request_id cache with explicit force‑new and clear helpers, wired `/verify` calls to include request_id and clear on success, and added unit coverage in `tests/verify-idempotency.test.ts`.

9) Decide whether to mark tasks as blocked on insufficient credits (DONE)
   - Decision: no persisted blocked status; rely on 402 until credits are sufficient.
   - Rationale: avoids new schema/state and allows results to unlock immediately after purchase on retry.

10) Reserve credits upfront for tasks (IN PROGRESS)
   - Hard pre‑check before external task creation; reject if credits are insufficient.
   - Reserve credits based on raw row count (not deduped count).
   - For manual `/tasks`: reserve using submitted email count.
   - For `/tasks/upload`: parse uploads to count rows and reserve before calling external upload.
   - On completion: debit actual processed count and release any remainder.
   - On failure to reserve: return 402 and do not call external API.
   - Step 10a (DONE): Add `credit_reserved_count` + `credit_reservation_id` columns to `tasks`.
     Explanation: Applied a Supabase migration to persist reservation counts + idempotency ids on tasks so finalize/release logic can reconcile reserved vs processed credits.
   - Step 10b (DONE): Add `apply_credit_release` RPC to Supabase to support reservation releases.
     Explanation: Added a ledger-backed release function that idempotently credits users and returns status without overspending.
   - Step 10c (DONE): Verify reservation/finalize flows end-to-end and run targeted tests.
     Explanation: Stubbed reservation fetch in `test_credit_enforcement_routes.py` to avoid Supabase client init, then ran targeted pytest for reservation and enforcement coverage (all passing).
   - Step 10d (DONE): Fix `apply_credit_debit` RPC ambiguity causing upload failures.
     Explanation: Updated the Supabase `apply_credit_debit` function to fully-qualify `credits_remaining` and avoid conflict with the output parameter; resolves the ambiguous column error. Re-test pending in Step 10e.
   - Step 10e (DONE): Re-test upload debit flow after RPC fix.
     Explanation: Targeted backend tests passed (`test_credit_debit`, `test_tasks_credit_reservation`, `test_credit_enforcement_routes`). Manual `/api/tasks/upload` now returns 402 (Insufficient credits) instead of 500, confirming the ambiguity fix works and reservation failures are reported correctly.

Current implementation snapshot
- Supabase schema:
  - `credit_ledger` table created with idempotent `(user_id, source, source_id)` constraint.
  - RPCs in Supabase:
    - `debit_credits(p_user_id, p_amount)` → atomic debit, returns no rows if insufficient.
    - `apply_credit_debit(p_user_id, p_amount, p_source, p_source_id, p_meta)` → inserts ledger entry then debits in one transaction; returns `status` (applied|duplicate|insufficient) + `credits_remaining`.
- Backend services:
  - `backend/app/services/supabase_client.py` has `debit_credits(...)` and `apply_credit_debit(...)` wrappers.
  - `backend/app/services/credits.py` exposes `apply_credit_debit(...)` and constants `CREDIT_SOURCE_TASK`, `CREDIT_SOURCE_VERIFY`.
- Backend endpoints:
  - `/api/verify`: debits 1 credit on successful external verify using `apply_credit_debit`. If insufficient → 402.
  - `/api/tasks/{id}`: when task is complete, resolves processed count and debits once using ledger; if insufficient → 402. Uses metrics + job_status/finished_at for completion detection.
  - `/api/tasks/{id}/download`: same debit enforcement as above before allowing download.
- External models:
  - `TaskDetailResponse` now includes `metrics` so completion detection can use progress/job_status.

Known gaps / risks (must address next)
- Task status updates on insufficient credits are not implemented; task detail currently hard‑fails without persisting a blocked status.
- `backend/app/api/tasks.py` is 790 lines (>600). Consider refactor if required.
- Supabase migrations were applied via MCP (no local migration files), so repo does not capture the SQL.

Next steps (do in order, confirm each step)
1) Step 10c — Verify reservation/finalize flows and run targeted tests.
2) Optional follow‑ups:
   - Add local migration artifacts for the Supabase RPCs + ledger table if you want repo‑tracked schema.

Status
- Step 1: DONE (documented requirements + plan; clarified completion‑time debit and hard‑fail behavior).
- Step 2: DONE (added `credit_ledger` table with idempotency index and audit fields for credit events).
- Step 3: DONE (added `debit_credits` RPC + client helper for atomic debits; returns no rows on insufficient balance).
- Step 3b: DONE (added `apply_credit_debit` RPC to combine ledger insert + debit with duplicate/insufficient status).
- Step 4: DONE (backend now debits on `/verify` completion and hard‑fails on insufficient credits; best‑effort idempotency uses request_id when provided).
- Step 5: DONE (task detail/download now debit on completion using processed counts and block when credits are insufficient or counts are unavailable).
- Step 6: DONE (Verify UI now surfaces 402 detail for manual/file/download flows using a shared error resolver; added unit coverage for error detail extraction).
- Step 7: DONE (added backend unit/integration tests for credit debit status + insufficient credits responses; ran targeted pytest).
- Step 8: DONE (client now generates/stores request_id per email attempt, passes it to `/verify`, clears on success, and has unit coverage).
- Step 9: DONE (no persisted blocked status; rely on 402 until credits are sufficient).
- Step 10: DONE (reservation columns + `apply_credit_release` RPC added; reservation/finalize tests executed and passing).

Notes
- Any stubbed behavior must be replaced by real implementation once schema and APIs are available.
- All steps should be updated in `PLAN.md` once started/completed.

# Signup Bonus Credits Plan

Goal: grant a one-time signup bonus (configurable credits) to brand-new signups only, with simple anti-abuse checks (account age window + email confirmation) and idempotency via the credit ledger.

Tasks
- [ ] Step 1 — Add config for signup bonus eligibility and amount.
  Explanation: Add required settings for `SIGNUP_BONUS_CREDITS`, `SIGNUP_BONUS_MAX_ACCOUNT_AGE_SECONDS`, and `SIGNUP_BONUS_REQUIRE_EMAIL_CONFIRMED` with strict validation and clear logs (no defaults).
- [ ] Step 2 — Add a signup bonus credit source + helper.
  Explanation: Introduce a `signup_bonus` credit source constant and helper that calls `apply_credit_release` with `source_id=user_id` and audit meta (ip/user_agent) to enforce one-time grants.
- [ ] Step 3 — Add backend endpoint for signup bonus grants (signup-only).
  Explanation: Create `POST /api/credits/signup-bonus` that validates the authenticated user, fetches the Supabase Auth user record via the admin API, enforces account-age and email-confirm checks, and applies an idempotent grant; returns status + balance with explicit logs.
- [ ] Step 4 — Trigger from signup flow only (not sign-in).
  Explanation: Call the signup bonus endpoint once after successful `signUp` completion; do not invoke it on sign-in or session refresh.
- [ ] Step 5 — Tests + manual verification.
  Explanation: Add unit tests for the helper and integration tests for the endpoint (success, duplicate, too-old, unconfirmed email). Manually verify new signup gets 100 credits once.
