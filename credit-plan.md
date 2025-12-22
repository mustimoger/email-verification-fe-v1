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

6) UI handling for credit‑insufficient responses (PENDING)
   - Show a clear error message for insufficient credits across manual/file/verify flows.
   - Keep UI layout intact; only update error copy.

7) Tests + verification (PENDING)
   - Unit tests for atomic debit and ledger idempotency.
   - Integration tests for `/verify` and `/tasks/{id}` debit behavior (success + insufficient).
   - Manual verification: run a verify flow with 0 credits → hard‑fail.

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
- UI error messaging for insufficient credits is not implemented (Step 6).
- Tests for debit/idempotency and insufficient cases are missing (Step 7).
- `/verify` idempotency: if the client does not send `request_id`, server generates one; retries may still double‑debit for the same email unless the client sends a stable `request_id`.
- Task status updates on insufficient credits are not implemented; task detail currently hard‑fails without persisting a blocked status.
- `backend/app/api/tasks.py` is 790 lines (>600). Consider refactor if required.
- Supabase migrations were applied via MCP (no local migration files), so repo does not capture the SQL.

Next steps (do in order, confirm each step)
1) Step 6 — UI messaging for 402:
   - Update Verify page to surface “Insufficient credits” for manual + file flows.
   - Update download flow error text on 402.
2) Step 7 — Tests:
   - Backend tests for `apply_credit_debit` status handling and idempotency.
   - Integration tests for `/verify` and `/tasks/{id}` with insufficient credits.
3) Optional follow‑ups:
   - Add a stable `request_id` from the frontend for `/verify` to ensure idempotency.
   - Decide whether to mark tasks as blocked in Supabase on insufficient credits.
   - Add local migration artifacts for the Supabase RPCs + ledger table if you want repo‑tracked schema.

Status
- Step 1: DONE (documented requirements + plan; clarified completion‑time debit and hard‑fail behavior).
- Step 2: DONE (added `credit_ledger` table with idempotency index and audit fields for credit events).
- Step 3: DONE (added `debit_credits` RPC + client helper for atomic debits; returns no rows on insufficient balance).
- Step 3b: DONE (added `apply_credit_debit` RPC to combine ledger insert + debit with duplicate/insufficient status).
- Step 4: DONE (backend now debits on `/verify` completion and hard‑fails on insufficient credits; best‑effort idempotency uses request_id when provided).
- Step 5: DONE (task detail/download now debit on completion using processed counts and block when credits are insufficient or counts are unavailable).
- Steps 6–7: PENDING.

Notes
- Any stubbed behavior must be replaced by real implementation once schema and APIs are available.
- All steps should be updated in `PLAN.md` once started/completed.
