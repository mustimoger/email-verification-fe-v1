# Account Email/Password Sync Plan

Goal: ensure email/password updates use Supabase Auth with confirmation and keep `profiles.email` in sync only after confirmation, while requiring reauth and logging clearly.

Tasks
- [x] Backend guard: block `profiles.email` updates unless the authenticated token email matches the payload. Log mismatches and return a clear error.  
  Explanation: `backend/app/api/account.py` now rejects profile email updates when the token email is missing or different, preventing premature profile updates before Supabase email confirmation.
- [x] Frontend account update flow: require current password for email/password changes, call Supabase `updateUser({ email })` for email change (confirmation), call `updateUser({ password })` for password change, and avoid updating `profiles.email` until confirmation. Show user message to verify email + relogin.  
  Explanation: `app/account/page.tsx` now reauths before email/password changes, triggers Supabase email confirmation, and only updates `profiles.email` when no email change is pending; users see a clear confirmation + relogin message.
- [x] Auth provider sync: on session change, upsert confirmed `session.user.email` to `profiles.email` (backend will allow it); log success/failure.  
  Explanation: `app/components/auth-provider.tsx` now syncs confirmed session email to `profiles` on login to keep Postgres aligned after email confirmation.
- [x] Tests: add backend tests for email-guarded profile update, and adjust existing tests to include email claims.  
  Explanation: `backend/tests/test_account.py` now covers email mismatch/acceptance and uses email claims for the update path.

Notes
- Email confirmation is handled by Supabase Auth. Until confirmed, the JWT email claim remains the old email; backend must reject mismatched profile email updates.
- Password updates are only in Supabase Auth; no Postgres password column exists.

# Account Purchases Wiring Plan

Goal: record each successful Paddle purchase with all relevant details in Supabase and show them on `/account` so users can review their purchase history.

Tasks
- [x] Step 1 — Add `billing_purchases` storage (Supabase).  
  Explanation: What: created a normalized `billing_purchases` table keyed by `transaction_id` with `user_id`, `event_id`, `event_type`, `price_ids`, `credits_granted`, `amount`, `currency`, `checkout_email`, `invoice_id`, `invoice_number`, `purchased_at`, and `raw` (jsonb). Why: account history needs durable, queryable purchase records instead of only webhook events and credit totals. How: applied the `create_billing_purchases_table` migration with a primary key on `transaction_id`, user/time indexes for ordering, nullable fields when Paddle omits data, and timestamp columns for auditing.
- [x] Step 2 — Record purchases from webhook and expose read API.  
  Explanation: What: added purchase upsert on `transaction.completed`/`transaction.billed` in `/api/billing/webhook` and introduced `/api/account/purchases` to return the current user’s history. Why: ensure each purchase is captured when the webhook arrives and can be read by the account UI. How: added `backend/app/services/billing_purchases.py` to upsert/list records, resolved user IDs via `custom_data` or Paddle customer mapping, extracted amount/currency/invoice/email/purchase date defensively with logs, and exposed a paginated purchases endpoint with usage logging.
- [ ] Step 3 — Wire Account UI to backend purchases.  
  Explanation: What: add `apiClient.getPurchases()` and load purchases in `app/account/page.tsx` alongside profile/credits; render real date/amount/credits/invoice data in the table. Why: users should see their purchase history on `/account`. How: add a typed `Purchase` response, map backend fields to the table, and keep the empty state when no purchases exist.
- [ ] Step 4 — Tests + manual verification.  
  Explanation: What: add backend tests for webhook upsert and `/api/account/purchases`, plus a frontend mapping/empty-state test; verify with a sandbox purchase. Why: prevent regressions and confirm end-to-end visibility. How: unit tests for Supabase write/read helpers, API route tests with mocked webhook payloads, and a manual Paddle sandbox purchase check.

Notes
- Keep fields nullable when Paddle omits them; log missing data rather than hardcoding defaults.
- Ask for confirmation after completing each step before starting the next.
