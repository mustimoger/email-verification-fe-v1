# Handover (2026-01-23)

## Current status
- Deploy workflow still failing at the `Deploy release` step. Latest run: `21287792737` (head `bc6fe7d`), test job succeeded, deploy job failed.
- Local `npm run build` succeeds after recent fixes, but remote releases still show missing `.next/BUILD_ID` and no `current` symlink or `shared/backend-venv`.
- GitHub Actions log download via API returns `403` (admin required). Need the deploy log snippet from the Actions UI to diagnose the latest failure.
- Pricing embed build now fails because `PricingCtaPayload` is not exported from `app/pricing/pricing-client.tsx`; local fix exists and tests/build now pass but is uncommitted.

## Recent code changes (pushed)
- `deploy/remote-deploy.sh`: force dev deps during build, then prune (`NODE_ENV=development`, `NPM_CONFIG_PRODUCTION=false`, build, `npm prune --omit=dev`).
- `app/lib/integrations-catalog.ts`: loosened Supabase client typing; cast query via `unknown` to allow await.
- Added Suspense boundaries for `useSearchParams()` routes: `app/pricing/embed/page.tsx`, `app/pricing/page.tsx`, `app/signin/page.tsx`, `app/signup/page.tsx`.
- Added missing helpers to Git: `app/lib/redirect-utils.ts`, `app/lib/redirect-storage.ts`, `app/lib/embed-config.ts`, `app/pricing/embed/pricing-embed-client.tsx`.

## Recent local changes (not yet pushed)
- `app/pricing/pricing-client.tsx`: export `PricingCtaPayload` and accept embed props so `pricing-embed-client.tsx` compiles.
- `deployment.md` and `handover.md`: updated Step 9.1 notes and next actions for newcomers.

## Latest deploy failure context
- Build errors previously: missing `typescript`, Supabase type mismatch, missing Suspense boundaries, missing helper modules. These are now fixed locally and pushed.
- New build error: `PricingCtaPayload` missing export in `app/pricing/pricing-client.tsx`; fix is local but not committed/pushed yet.
- Latest server release observed: `20260123132918` under `/var/www/boltroute-app/releases` with `.next` present but no `BUILD_ID`.
- `shared/backend-venv` still missing and `/var/www/boltroute-app/current` symlink absent.

## What to do next
1. Commit + push the pricing embed export fix.
2. Re-run the GitHub Actions deploy workflow (prefer `gh` CLI).
3. If deploy still fails, pull the `Deploy release` log lines from the Actions UI and paste them here.
4. If deploy completes, update `deployment.md` Step 9 to complete and run Step 10 post-deploy validation.

## Notes / environment
- Activate the Python venv before running tests or scripts: `source .venv/bin/activate`.
- The Supabase settings were updated by the user in the dashboard (production URLs/redirects).

## Uncommitted local changes (do not touch unless requested)
- Modified: `app/account/account-client.tsx`, `app/components/auth-provider.tsx`, `app/components/oauth-buttons.tsx`, `app/pricing/pricing-client.tsx`, `next.config.ts`, `deployment.md`, `handover.md`.
- Deleted: `handover.md` (recreated here).
- Untracked: `account-migration.md`, `wp-pricing.md`.

## Commands run (recent)
- `npm run build`
- `npx tsx tests/integrations-catalog.test.ts` with env vars set
- GitHub Actions status via GitHub REST API
