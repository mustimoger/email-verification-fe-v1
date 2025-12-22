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

2) Add credit ledger storage (Supabase) (DONE)
   - Create a `credit_ledger` table (append‑only):
     - `id` (uuid), `user_id`, `source` (purchase|verify|task), `source_id`, `delta`, `created_at`, `meta` jsonb.
     - Unique constraint on `(user_id, source, source_id)` for idempotency.
   - If a ledger table already exists or is preferred elsewhere, use it instead of new schema.

3) Implement atomic debit in Supabase client (DONE)
   - Add a dedicated function that atomically checks and decrements credits with a single statement.
   - Requirements:
     - Hard‑fail if `credits_remaining < debit_amount`.
     - Ensure concurrent requests cannot overspend.
     - Return updated balance on success.
   - Log failures with explicit reason (insufficient vs other).

4) Enforce credit availability in verification endpoints (PENDING)
   - `/verify`:
     - On successful external verification result, debit 1 credit (atomic) using the ledger.
     - If debit fails (insufficient), respond with 402/409 and do not return success to the client.
   - `/tasks` (manual) and `/tasks/upload`:
     - Do not debit on create; defer until task completion is observed.
     - Introduce a completion handler that pulls actual counts and attempts debit once per task.
     - If debit fails, mark task as blocked/failed and return an error on detail fetch.

5) Task completion detection + debit trigger (PENDING)
   - When `/tasks/{id}` is fetched and the task is finished with counts available:
     - Attempt credit debit if not already recorded in ledger.
     - If debit succeeds, store ledger entry and continue.
     - If debit fails, return a hard‑fail response (insufficient credits) and log.
   - Ensure this does not re‑debit on subsequent fetches (idempotency key).

6) UI handling for credit‑insufficient responses (PENDING)
   - Show a clear error message for insufficient credits across manual/file/verify flows.
   - Keep UI layout intact; only update error copy.

7) Tests + verification (PENDING)
   - Unit tests for atomic debit and ledger idempotency.
   - Integration tests for `/verify` and `/tasks/{id}` debit behavior (success + insufficient).
   - Manual verification: run a verify flow with 0 credits → hard‑fail.

Status
- Step 1: DONE (documented requirements + plan; clarified completion-time debit and hard‑fail behavior).
- Step 2: DONE (added `credit_ledger` table with idempotency index and audit fields for credit events).
- Step 3: DONE (added `debit_credits` RPC + client helper for atomic debits; returns no rows on insufficient balance).
- Steps 4–7: PENDING.

Notes
- Any stubbed behavior must be replaced by real implementation once schema and APIs are available.
- All steps should be updated in `PLAN.md` once started/completed.
