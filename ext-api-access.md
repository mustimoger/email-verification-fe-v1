# External API Access Plan (Supabase JWT-based)

## Goal
Use Supabase JWTs (or user API keys) for all external API calls, make the app role-aware (`user`/`admin`), remove all legacy master-key tooling/coupling, and keep frontend flows stable (no crashes/CORS gaps).

## Latest info (from api-docs.json)
- External auth scheme is `ApiKeyAuth` with `Authorization` header. Description says "Bearer token (Supabase JWT or API key)".
- `/api-keys` (and some metrics) are admin-capable and accept `user_id` query parameter for admin tokens that do not map to a user UUID.

## Open questions / risks to resolve
- Resolved: external API requires `Authorization: Bearer <token>` (raw token fails).
- Does the external API expect a specific role claim shape (e.g., `app_metadata.role` vs top-level `role`)?
- Do admin endpoints require `user_id` even when using a Supabase JWT for an admin user?
- Where is the existing external API test script that uses `key-value-pair.txt` to set localStorage for Playwright? (Not found in repo yet.)

## Plan (step-by-step)

1) Verify external auth header format (raw vs Bearer)
   - Use the existing external API test flow that reads a Supabase JWT from `key-value-pair.txt`.
   - Run two requests: `Authorization: Bearer <token>` and `Authorization: <token>`.
   - Record which format succeeds for `/tasks`, `/api-keys`, and `/verify`.
   - Update backend `ExternalAPIClient` to send the correct format (configurable) once confirmed.

2) Define and enforce role claims contract
   - Source roles solely from Supabase Auth `app_metadata.role` (`user` default, `admin` for operator).
   - Do not add a DB role column; the JWT should carry the role from `app_metadata`.
   - Confirm the external API role claim shape (if it expects a top-level `role` or a different claim).
   - Ensure app routes that must be admin-only enforce `AuthContext.role == "admin"` explicitly.

3) Update token issuance
   - For existing users, set `app_metadata.role` via service-role script/admin tool. For new users, default `role=user` at signup.
   - Ensure Supabase JWTs include the role claim; confirm audience/issuer match what the external API validates.

4) Switch backend external client auth
   - Forward the caller’s Supabase JWT to the external API using the verified Authorization format.
   - For admin-only external endpoints, include `user_id` query parameter when required by the external API.
   - Keep `DEV_API_KEYS` only as a local admin override (do not forward it to external API unless explicitly required).

5) Remove all legacy master-key tooling/coupling
   - Remove usage of `EMAIL_API_KEY` and the dev master key flow from the backend and scripts.
   - Retire any helpers that create per-user keys via the master key.
   - Keep caching only for non-secret metadata (if still required for UI); do not store plaintext keys unless required.

6) Harden error handling
   - On external 401/403, return structured errors (with CORS) and safe fallbacks (e.g., empty lists) instead of raising unhandled exceptions.
   - Log with context (user_id, endpoint) but no secrets.

7) Verify end-to-end
   - Use a user JWT (role=user) to hit `/tasks`, `/verify`, `/api-keys` → expect 200.
   - Use a non-admin JWT on admin-only endpoints → expect 403.
   - Use an admin JWT (role=admin or `is_admin`) → admin endpoints succeed.
   - Confirm frontend no longer sees “Failed to fetch” during bootstrap/history/tasks.

8) Validate all external endpoints for both roles
   - Enumerate every endpoint/method in `api-docs.json`.
   - Test each endpoint for `user` and `admin` roles.
   - Require explicit test inputs (path params, request bodies) via a config file; skip with explicit logs if missing.
   - Record which endpoints are role-restricted and whether `user_id` is required for admin tokens.

9) Cleanup and docs
   - Update backend config docs to remove the dev master key dependency for user flows.
   - Document the admin credential path for ops/maintenance separately.

## Test scripts
- `backend/scripts/test_external_api.py`: smoke tests external `/tasks`, `/api-keys`, and `/verify` using a Supabase JWT passed via `--token`.
- Supports `--csv test-emails.csv` to POST `/verify` for each email (consumes credits); timeout is 60s per request.
- Example:
  ```
  source .venv/bin/activate
  python backend/scripts/test_external_api.py --token "<ACCESS_TOKEN>" --base-url https://email-verification.islamsaka.com/api/v1 --csv test-emails.csv
  ```
- If required, add a variant that can send raw `Authorization: <token>` to verify the expected format.
- Latest observation (token role=authenticated, no `app_metadata.role`): `/tasks` and `/api-keys` returned empty; `/verify andres@metaltest.com` timed out on SMTP (408, deadline exceeded); `/verify gabr.n@misrins.com.eg` returned `catchall` from cache. No tasks created.
- `backend/tests/external_api_test_runner.py`: config-driven runner that probes raw vs Bearer auth and exercises required endpoints (tasks, api-keys, verify, batch upload) for the user token in `key-value-pair.txt`. Config lives at `backend/tests/external_api_test_config.json`.

## Latest test run (user token)
- Ran `backend/tests/external_api_test_runner.py` with `EMAIL_API_BASE_URL` from `backend/.env` and user token from `key-value-pair.txt`.
- Auth probe results: both `Authorization: Bearer <token>` and raw `Authorization: <token>` returned `401 Unauthorized` for `GET /tasks`.
- Because auth failed, endpoint tests were not executed; further verification requires a valid role-bearing user JWT.
- Re-ran after updating `key-value-pair.txt` (user `dmktadimiz@gmail.com`): same result (`401` for both header formats).
- Re-ran after updating `key-value-pair.txt` with the raw `access_token`: `Authorization: Bearer <token>` succeeds (200), raw `Authorization: <token>` fails (401). All required user endpoints succeeded: `/tasks` list/detail, `/verify`, `/tasks` create, `/tasks/batch/upload`, `/api-keys` list/create/delete. `/api-keys` create requires `purpose` (enum: zapier, n8n, google sheets).
- Re-ran after adding `purpose` to the external `/api-keys` request payload and removing `custom` integration from config: all required user endpoints succeeded, including `/api-keys` create/delete, with Bearer auth only.

## Current implementation status
- External calls now forward the caller’s Supabase JWT using `Authorization: Bearer <token>` for `/tasks`, `/verify`, and `/api-keys`.
- `DEV_API_KEYS` env supports local admin role override (`X-Dev-Api-Key`).
- Dashboard key bootstrap is disabled (returns skipped), so no master-key creation attempts.
- Added `backend/scripts/set_user_role.py` to set `app_metadata.role` (use service role key); admin target: `mkural2016@gmail.com`.
- `/api-keys` routes accept optional `user_id` when the caller is admin, forwarding it to the external API and recording usage under the target user.
- `/tasks` list/create/upload now accept optional `user_id` for admin scoping and forward it to the external API where supported.

## Gaps to close
- Confirm role claim shape required by the external API.
- Validate admin flows with a role-bearing JWT to ensure `user_id` scoping behaves as expected across `/tasks` and `/api-keys`.

## Next steps
- Obtain/issue a Supabase JWT that carries `app_metadata.role=admin` for mkural2016@gmail.com; others default to `user`.
- Re-run `backend/scripts/test_external_api.py` with the role-bearing token to confirm `/tasks`/`/api-keys`/`/verify` access.
