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
