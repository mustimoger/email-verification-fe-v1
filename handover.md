# Handover (auth/key issues, history backend)

## Current blockers
- External API key creation fails: the dev key `9a56bd21-eba2-4f8c-bf79-791ffcf2e47b` can list tasks but gets 401 on `/api-keys`. Our backend tries to create a per-user `dashboard_api` key on `/api/tasks` and `/api/api-keys`; new users hit this and the route crashes. External dev confirmed this key is a manual vault key, not allowed for `/api-keys`; proper `/api-keys` requires Supabase-authenticated user tokens (anon key + JWT secret).
- Supabase auth flow is in place on the frontend, but new users still see empty history because `/api/tasks` 500s when external key creation 401s. CORS error is a side effect of the 500.

## Backend state
- Supabase tables populated; seeded tasks exist for mustimoger user. `/api/debug/me` and `/api/debug/tasks` (added) work when called with a valid Supabase JWT and show tasks.
- CORS is configured via `BACKEND_CORS_ORIGINS` array in `backend/.env`; parsing fixed in settings.
- External API client paths fixed for `/api-keys`, but 401 persists because the dev key lacks permissions.

## Frontend state
- History/Overview pages call backend; History crashes when `/api/tasks` fails on external key creation. UI shows CORS/401 because backend returns 500.
- Auth placeholder avatar is static; real Supabase session required for data.

## Next steps (recommended)
1) Add safe fallback in `/api/tasks` (and `/api/api-keys` if needed): on ExternalAPIError 401, skip key creation and return Supabase tasks only; avoid UnboundLocalError on `resolved`. This unblocks History for new users without external key creation.
2) Decide on external key strategy: either supply a master key that can call `/api-keys`, or switch to user-specific `/api-keys` via Supabase auth tokens as external dev expects.
3) Once a valid key strategy exists, re-enable per-user dashboard key creation and remove the fallback.

## Quick commands
- Debug endpoints (require valid JWT): `/api/debug/me`, `/api/debug/tasks`.
- External create-key test (currently 401): `curl -H "Authorization: Bearer $EMAIL_API_KEY" -d '{"name":"test"}' https://email-verification.islamsaka.com/api/v1/api-keys`.
