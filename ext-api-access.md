# External API Access Plan (Supabase JWT-based)

## Goal
Move external API calls to use Supabase JWT Bearer tokens with role-based access (`user`, `admin`), remove reliance on the dev master key, and keep frontend flows stable (no crashes/CORS gaps).

## Plan (step-by-step)

1) Define role claims contract
   - Source roles solely from Supabase Auth `app_metadata.role` (`user` default, `admin` for the single operator). Do not add a DB role column; the JWT should carry the role from `app_metadata`.
   - Document expected claims the external API enforces (e.g., `role: user|admin`, optional `is_admin: true`).

2) Update token issuance
   - For existing users, set `app_metadata.role` via service-role script/admin tool. For new users, default `role=user` at signup.
   - Ensure Supabase JWTs include the role claim; confirm audience/issuer match what the external API validates.

3) Switch backend external client auth
   - Replace use of `EMAIL_API_KEY` (dev master) for `/tasks*`, `/verify*`, `/api-keys*` with forwarding the caller’s Supabase JWT as `Authorization: Bearer <user_jwt>`.
   - Keep a separate admin credential path (admin Supabase JWT or `DEV_API_KEYS`) only for true admin endpoints, never for end-user flows.

4) Remove per-user dashboard key creation
   - Stop creating per-user external keys via the dev master key. Resolve external auth solely from the forwarded user JWT.
   - Adjust caching logic: no longer cache `key_plain`; rely on JWT validation upstream. Retain any needed identifiers purely for tagging/analytics.

5) Harden error handling
   - On external 401/403, return structured errors (with CORS) and safe fallbacks (e.g., empty lists) instead of raising unhandled exceptions.
   - Log with context (user_id, endpoint) but no secrets.

6) Verify end-to-end
   - Use a user JWT (role=user) to hit `/tasks`, `/verify`, `/api-keys` → expect 200.
   - Use a non-admin JWT on admin-only endpoints → expect 403.
   - Use an admin JWT (role=admin or `is_admin`) → admin endpoints succeed.
   - Confirm frontend no longer sees “Failed to fetch” during bootstrap/history/tasks.

7) Cleanup and docs
   - Update backend config docs to remove the dev master key dependency for user flows.
   - Document the admin credential path for ops/maintenance separately.
