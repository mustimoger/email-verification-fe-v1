# Handover (low auth noise, external `/api-keys` still broken)

## Current state
- Frontend auth: Supabase session required; dashboard chrome hidden for signed-out users. AuthProvider fixed (apiClient imported). Bootstrap `/api-keys/bootstrap` call now suppresses noisy errors and logs warnings only.
- Backend safety: `/api/tasks` returns Supabase tasks first; if external fails, returns empty safely. `/api/api-keys` now falls back to cached/empty keys even if external 500s, so UI should not crash.
- External diagnostics: Using a real Supabase session token + dev API key, `/tasks` succeeds; `/api-keys` still returns 500 `{"error":"Failed to list API keys"}` from upstream. This is an external issue; we handle it by fallback but can’t list/create keys externally until they fix it.
- Overview: wired to Supabase-backed `/api/overview`; mapping helpers/tests added.
- History: uses Supabase cached tasks; key dropdown stays empty when external `/api-keys` fails, but page loads. Must have session.
- Verify: UI-only; not wired to backend.
- Plans updated; new `non-dashboard-api-usage-plan.md` describes how to sync external usage into Supabase.

## Next steps for successor
1) Coordinate with external API dev to fix `/api-keys` (GET/POST). Once fixed, re-test creation/listing with Supabase JWT + key and remove UI “loading” lock in History/API page.
2) Implement external usage ingestion per `non-dashboard-api-usage-plan.md` (poll per key, write tasks/api_usage, deduct credits, last-sync metadata; webhook-first if external adds it).
3) Wire Verify flows to backend; add credit deduction and usage logging.
4) Wire payment/credits if needed.

## How to test external API quickly
- Script: `source .venv/bin/activate && python backend/scripts/check_external_api.py --base-url https://email-verification.islamsaka.com/api/v1 --api-key <Supabase access_token> [--x-api-key <dev key>] --include-api-keys`
- Supabase session token for mustimoger (from user): `eyJhbGciOiJIUzI1NiIsImtpZCI6IlgzNWFqVks2VXJRaGpweDQiLCJ0eXAiOiJKV1QifQ...yi2s009Foc5MIBD0ZsmF9BdXLl2xZioqd0fj6ofxU0U`
- Dev key: `9a56bd21-eba2-4f8c-bf79-791ffcf2e47b`

## Important files
- Plans: `PLAN.md`, `overview-plan.md`, `history-plan.md`, `non-dashboard-api-usage-plan.md`
- Backend resilience: `backend/app/api/tasks.py`, `backend/app/api/api_keys.py`
- Frontend auth/bootstrap: `app/components/auth-provider.tsx`, `app/lib/api-client.ts`
- External test script: `backend/scripts/check_external_api.py`

## Warnings / known issues
- External `/api-keys` still broken upstream (500). UI will show empty keys; no creation until fixed.
- History key dropdown may stay disabled/empty due to the above; tasks still show from Supabase.
- Verify page unwired; credits/purchases unwired.
