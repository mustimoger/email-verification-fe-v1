# Handover (2026-01-23)

## Current status
- Deploy workflow succeeded on `2026-01-23T13:52:34Z` (head `856ad06`), release `20260123135238`.
- Build completed (`next build` succeeded) and backend dependencies installed into the shared venv.
- Step 10 post-deploy validation is complete; public routes return `200` and backend health is `ok`.
- Frontend now has a systemd drop-in that binds it to `127.0.0.1:3000`; verified via `ss`.
- GitHub CLI is installed locally at `~/.local/bin/gh` but not authenticated; no longer required unless you want to rerun workflows from this host.
- Repo housekeeping complete: all local changes committed and pushed to `main` (head `608ad10`).

## Recent code changes (pushed)
- `deploy/remote-deploy.sh`: force dev deps during build, then prune (`NODE_ENV=development`, `NPM_CONFIG_PRODUCTION=false`, build, `npm prune --omit=dev`).
- `app/lib/integrations-catalog.ts`: loosened Supabase client typing; cast query via `unknown` to allow await.
- Added Suspense boundaries for `useSearchParams()` routes: `app/pricing/embed/page.tsx`, `app/pricing/page.tsx`, `app/signin/page.tsx`, `app/signup/page.tsx`.
- Added missing helpers to Git: `app/lib/redirect-utils.ts`, `app/lib/redirect-storage.ts`, `app/lib/embed-config.ts`, `app/pricing/embed/pricing-embed-client.tsx`.
- `app/account/account-client.tsx`: load credits from `externalApiClient` and truncate long checkout emails in purchase tables.
- `app/components/auth-provider.tsx`: consume stored redirect paths after OAuth sign-in to return users to their intended page.
- `app/components/oauth-buttons.tsx`: store resolved next path before OAuth sign-in.
- `app/pricing/pricing-client.tsx`: adjust embed layout breakpoints for sticky sidebar on medium screens.
- `next.config.ts`: add CSP `frame-ancestors` header for `/pricing/embed` based on env allowlist.
- `deployment.md` and `handover.md`: updated for deploy completion and localhost bind validation.

## Recent local changes (not yet pushed)
- None.

## Latest deploy failure context
- Previous build errors (missing `typescript`, Supabase type mismatch, missing Suspense boundaries, missing helper modules, pricing payload export) are resolved.
- Latest server release observed: `20260123135238`.

## What to do next
1. Optional: authenticate `gh` locally if you want to trigger workflows from this host.

## Notes / environment
- Activate the Python venv before running tests or scripts: `source .venv/bin/activate`.
- The Supabase settings were updated by the user in the dashboard (production URLs/redirects).

## Uncommitted local changes (do not touch unless requested)
- None.

## Commands run (recent)
- `npm run build`
- `npx tsx tests/integrations-catalog.test.ts` with env vars set
- GitHub Actions status via GitHub REST API
