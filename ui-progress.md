# UI Progress: Auth Marketing Card

## Tasks
- [x] Task 1 - Increase marketing card scale/typography and reduce background opacity on `/signin` and `/signup` (MVP).
- [x] Task 2 - Verify responsiveness and run unit + integration tests.
- [x] Task 3 - Allow local frontend origins in backend CORS for local auth flows.
- [x] Task 4 - Restart local backend and validate auth confirmation check requests succeed from `http://localhost:3001`.
- [x] Task 5 - Improve dark-mode text contrast on `/signin` and `/signup` without changing layout.
- [x] Task 6 - Validate dark-mode readability and run unit + integration tests after color updates.
- [x] Task 7 - Keep the left sidebar visible while scrolling dashboard pages on desktop.
- [x] Task 8 - Validate sidebar behavior and run unit + integration tests after layout adjustments.
- [x] Task 9 - Add static limit notes to `/verify` manual (Max 25 emails) and bulk upload (100MB file size) cards (MVP).
- [x] Task 10 - Validate `/verify` UI and run unit + integration tests after limit note updates.
- [x] Task 11 - Adjust `/verify` manual limit note copy to match exact requested punctuation and add a bulk upload 100MB limit note using the same visual style as the manual note (MVP).
- [x] Task 12 - Validate `/verify` UI and run unit + integration tests after the manual/bulk note updates.
- [x] Task 13 - Update dashboard footer to show Privacy Policy, Terms of Service, and GDPR Compliance links (new tab) without changing styling; remove Cookie Preferences (MVP).
- [x] Task 14 - Validate dashboard footer behavior and run unit + integration tests after footer link updates.
- [x] Task 15 - Review pricing iframe auth error and identify which auth guard/token check triggers the "Missing auth token" message (MVP).
- [x] Task 16 - Allow unauthenticated access to the embedded `/pricing` view without changing UI styling (MVP).
- [x] Task 17 - Validate pricing embed behavior for logged-out users and run unit + integration tests.
- [ ] Task 18 - Confirm bulk upload completion email notification requirements (trigger, payload, template, success/failure rules).
- [ ] Task 19 - Add SMTP config + mailer service for bulk upload completion notifications (MVP).
- [ ] Task 20 - Implement completion-triggered notification flow with idempotency tracking (MVP).
- [ ] Task 21 - Validate notification flow and run unit + integration tests.
- [x] Task 22 - Confirm consent banner requirements (scope, categories, gated scripts, legal link configuration).
- [x] Task 23 - Implement MVP consent banner + consent storage and gate non-essential scripts (Crisp chat, checkout).
- [x] Task 24 - Validate consent flow and run unit + integration tests.
- [x] Task 25 - Fix dark-mode auth input styling after data entry on `/signin` and `/signup` (MVP).
- [x] Task 26 - Validate dark-mode auth input updates and run unit + integration tests.
- [x] Task 27 - Update API hero buttons to integrations + external API docs links (MVP).
- [x] Task 28 - Validate API hero CTA updates and run unit + integration tests.
- [x] Task 29 - Confirm desired remember-me behavior on `/signin` (email prefill vs session persistence).
- [x] Task 30 - Update `/signin` remember-me toggle to show checked/unchecked visual states (MVP).
- [x] Task 31 - Validate remember-me toggle visuals and run unit + integration tests.
- [x] Task 32 - Swap auth hero images on `/signin`, `/signup`, and `/reset-password` to `/background.jpg` (MVP).
- [ ] Task 33 - Validate auth hero image updates and run unit + integration tests.
- [x] Task 34 - Darken auth hero image overlay so foreground card is more dominant (MVP).
- [ ] Task 35 - Validate darker hero image update and run unit + integration tests.
- [x] Task 36 - Remove auth hero image overlay on `/signin`, `/signup`, and `/reset-password` (MVP).
- [ ] Task 37 - Validate auth hero overlay removal and run unit + integration tests.
- [x] Task 38 - Set auth hero image quality to 100 on `/signin` and `/signup` (MVP).
- [x] Task 39 - Validate auth hero image quality update and run unit + integration tests.
- [x] Task 40 - Serve auth hero image at original resolution on `/signin` and `/signup` (MVP).
- [x] Task 41 - Validate original-resolution hero image update and run unit + integration tests.
- [x] Task 42 - Serve auth hero image at original resolution on `/reset-password` (MVP).
- [x] Task 43 - Validate `/reset-password` hero image update and run unit + integration tests.
- [x] Task 44 - Hide auth hero background image on mobile view for `/signin`, `/signup`, and `/reset-password` (MVP).
- [x] Task 45 - Validate mobile hero image visibility update and run unit + integration tests.
- [ ] Task 46 - Confirm icon replacement scope (all icon components vs inline SVG assets) and Phosphor style defaults (MVP).
- [ ] Task 47 - Replace existing icon components with Phosphor equivalents across the app (MVP).
- [ ] Task 48 - Remove unused icon dependencies after migration (MVP).
- [ ] Task 49 - Validate icon migration and run unit + integration tests.
- [x] Task 50 - Set `/public/bolt.png` as the browser favicon (MVP).
- [x] Task 51 - Validate favicon update and run unit + integration tests.
- [x] Task 52 - Remove the default Next.js favicon so only `/public/bolt.png` is served (MVP).
- [x] Task 53 - Validate favicon-only update and run unit + integration tests.
- [x] Task 54 - Define marketing demo dataset (credits, metrics, tasks, API usage) for screenshots (MVP).
- [x] Task 55 - Create a dedicated Supabase demo user with provided credentials (MVP).
- [x] Task 56 - Seed ext API Postgres with insert-only demo data (>=15 completed file-backed tasks + API usage) (MVP).
- [x] Task 57 - Validate Overview/History/API dashboards with the demo account and adjust seed data if needed (MVP).
- [x] Task 58 - Align demo credit balance with ext API credits ledger via admin grant (MVP).
- [x] Task 59 - Update Overview metrics mapping to accept ext API `valid/invalid` keys and include invalid sub-statuses (MVP).
- [x] Task 60 - Validate Overview stats render correctly and run `test:overview` after mapping update (MVP).
- [x] Task 61 - Fix Overview mapping TypeScript build error in deploy pipeline (MVP).
- [x] Task 62 - Redeploy to main after fixing Overview mapping build error (MVP).
- [x] Task 63 - Plan marketing mock data artifacts (Overview/History/API) with no code/ext API changes (MVP).
- [x] Task 64 - Create artifacts-only mock data JSONs for Overview/History/API (MVP).
- [x] Task 65 - Add mock data README with totals and usage guidance (MVP).
- [x] Task 66 - Validate mock data consistency and update handover notes (MVP).
- [x] Task 67 - Audit Overview verification history mismatch vs History table (demo user) (MVP).
- [ ] Task 68 - Backfill missing task counts in ext API DB for demo user (Overview table) (MVP).
- [ ] Task 69 - Validate Overview history table matches History list after data fixes (MVP).
- [x] Task 70 - Add demo purchase grant for Enterprise plan (boltroute@gmail.com) so Overview Plan card shows data (MVP).
- [ ] Task 71 - Validate Overview Plan card shows Enterprise + purchase date (MVP).
- [x] Task 72 - Swap dashboard logo to `/logo-white.svg` in dark mode only (MVP).
- [ ] Task 73 - Validate dark-mode dashboard logo renders correctly (MVP).
- [x] Task 74 - Swap auth page logos to `/logo-white.svg` in dark mode (signin/signup/reset-password) (MVP).
- [ ] Task 75 - Validate auth page dark-mode logos render correctly (MVP).
- [x] Task 76 - Soften dark-mode Validation chart + pill colors on `/overview` to better match dark theme (MVP).
- [ ] Task 77 - Validate `/overview` Validation card color updates and run unit + integration tests.
- [x] Task 78 - Add `/pricing/embed` embed-support requirements to plan and audit current CSP/parent-origin behavior (MVP).
- [x] Task 79 - Implement `/pricing/embed` header and `parent_origin` allowlist updates for local parent origins (MVP).
- [x] Task 80 - Validate `/pricing/embed` resize + CTA postMessage flow and run unit + integration tests.
- [x] Task 81 - Deploy embed-support changes to `main` and capture final `/pricing/embed` response headers.
- [x] Task 82 - Define phased monorepo migration tasks (Step 1 add `apps/website`, Step 2 move dashboard later) (MVP).
- [x] Task 83 - Import `br-website1` into `apps/website` as source-only files while keeping dashboard at repo root (MVP).
- [x] Task 84 - Validate Step 1 monorepo structure and confirm dashboard root flow is unchanged (MVP).
- [x] Task 85 - Prepare Step 2 move plan (`apps/dashboard`) and request confirmation before execution (MVP).
- [x] Task 86 - Commit and push Step 1 baseline (`apps/website` import) before major dashboard move (MVP).
- [x] Task 87 - Move dashboard project from repo root to `apps/dashboard` with no behavior change target (MVP).
- [x] Task 88 - Update dashboard deploy pipeline and deploy scripts to new `apps/dashboard` paths (MVP).
- [x] Task 89 - Add independent website CI workflow with path filters (MVP).
- [x] Task 90 - Validate monorepo Step 2 (dashboard tests/build + workflow lint sanity) and request confirmation before further enhancements (MVP).
- [x] Task 91 - Create root `handover.md` with unambiguous next-session execution steps (what/why/how/where) (MVP).
- [x] Task 92 - Verify production dashboard deploy status after monorepo move (workflow health + endpoint smoke checks) (MVP).
- [x] Task 93 - Define and document website production deployment contract (host/path/service/domain/env/trigger) (MVP).
- [x] Task 94 - Implement website production deploy workflow/script from locked contract (manual trigger pre-cutover) (MVP).
- [x] Task 95 - Add root monorepo operator README (layout/commands/workflows/deploy ownership) (MVP).
- [x] Task 96 - Choose and execute the first resumed pending product task after deploy-stability steps (MVP).
- [x] Task 97 - Choose and execute the next resumed pending product task after Task 65 (MVP).
- [x] Task 98 - Validate pre-cutover website deploy readiness and run manual website deploy workflow (MVP).
- [x] Task 99 - Provision website deploy prerequisites on target host and rerun manual website deploy workflow (MVP).
- [x] Task 99.1 - Prepare target host filesystem and permissions for `/var/www/boltroute-website` (MVP).
- [x] Task 99.2 - Provision and verify `boltroute-website` systemd service on `127.0.0.1:3002` (MVP).
- [x] Task 99.3 - Add `WEBSITE_APP_ENV_LOCAL` GitHub Actions secret for website deploy (MVP).
- [x] Task 99.4 - Rerun manual website deploy workflow and record run outcome (MVP).
- [x] Task 99.5 - Run pre-cutover runtime smoke checks (website + dashboard unaffected) (MVP).
- [x] Task 99.6 - Execute DNS + proxy cutover for `boltroute.ai` and `www.boltroute.ai` (MVP, when approved).
- [x] Task 99.6.1 - Capture pre-cutover baseline evidence (DNS, public headers, local service health) (MVP).
- [x] Task 99.6.2 - Configure and verify reverse proxy vhosts for `boltroute.ai` + `www.boltroute.ai` to `127.0.0.1:3002` (MVP).
- [x] Task 99.6.3 - Execute DNS cutover for apex and `www` to website host IP (MVP).
- [x] Task 99.6.4 - Run post-cutover validation (DNS, TLS, routes, dashboard non-regression) (MVP).
- [ ] Task 99.6.5 - Roll back DNS/proxy only if post-cutover validation fails (MVP).
- [x] Task 100 - Normalize root integration tracking docs (`handover.md`, `ui-progress.md`, `deployment.md`) so status and next steps are internally consistent (MVP).
- [x] Task 101 - Execute Step 100.1 by persisting website vhosts in `/etc/caddy/Caddyfile` and reloading Caddy (MVP).
- [x] Task 102 - Execute Step 100.2 post-persistence smoke checks for `boltroute.ai`/`www`/`app` + service health (MVP).
- [x] Task 103 - Complete Step 100.1 with operator root commands and re-run Step 100.2 against persisted on-disk Caddy config (MVP).
- [x] Task 104 - Capture final operator verification (`17:53:35 UTC`) and Caddyfile formatting hardening, then update runbook commands for hosts without `rg` (MVP).
- [x] Task 105 - Execute Step 100.4 by deciding and implementing post-cutover website deploy trigger policy in GitHub Actions (MVP).
- [x] Task 106 - Rewrite root `handover.md` with unambiguous post-Step-100.4 continuation steps (What/Why/How/Where) and explicit next-session execution order (MVP).
- [x] Task 107 - Execute Step 110.1 session preflight and state sync before any new product work (MVP).
- [x] Task 108 - Execute Step 110.2 production health check gate and capture fresh evidence (MVP).
- [x] Task 109 - Execute Step 110.3 stale unchecked task reconciliation in `ui-progress.md` (MVP).
- [x] Task 110 - Execute Step 110.4 by selecting one true pending product task with user confirmation (MVP).
- [x] Task 111 - Create root `structure.md` that explains monorepo production deployment and GitHub Actions push-to-production flow in beginner-friendly language (MVP).
- [x] Task 112 - Fix broken privacy link on website Terms page by replacing `https://boltroute.ai/privacy` with `https://boltroute.ai/privacy-policy` (MVP).
- [x] Task 113 - Add a `make.com` integration card to the dashboard Integrations Catalog using the logo in `apps/dashboard/public` (MVP).
- [x] Task 114 - Increase homepage pricing teaser text size by 1.5x for specified pricing volumes, prices, CTA, and trust-row copy (MVP).
- [x] Task 115 - Validate homepage pricing teaser typography update and run required checks (MVP).
- [x] Task 116 - Add a root shell script to run website/dashboard/backend locally on ports `3010/8010/8011` with safe shutdown that preserves SSH session (MVP).
- [x] Task 117 - Validate local-run shell script behavior and syntax checks (MVP).
- [x] Task 118 - Change website browser tab title from `Saatosa` to `BoltRoute` in root metadata (MVP).
- [x] Task 119 - Validate website title metadata update and run required checks (MVP).
- [x] Task 120 - Fix auth-page logo hydration mismatch by making initial SSR/client render deterministic before theme-based logo swap (MVP).
- [x] Task 121 - Validate auth hydration mismatch fix and run required dashboard checks (MVP).
- [x] Task 122 - Keep homepage pricing trust-row copy on a single line (no wrapping) for the four requested items (MVP).
- [x] Task 123 - Validate homepage trust-row single-line behavior and run required website checks (MVP).
- [x] Task 124 - Remove homepage pricing trust-row horizontal scrollbar while keeping all four trust items on one line (MVP).
- [x] Task 125 - Validate trust-row scrollbar fix and run required website checks (MVP).
- [x] Task 126 - Add website SEO/LLM crawler endpoints: `robots.txt`, `sitemap.xml`, and `llms.txt` with allow-all crawler policy (MVP).
- [x] Task 127 - Add sitemap auto-discovery logic so new published posts/pages/landing content is included without manual URL edits (MVP).
- [x] Task 128 - Validate SEO/LLM endpoint behavior with unit + integration checks and website lint/build (MVP).
- [x] Task 129 - Deploy SEO/LLM endpoint changes to `main` and capture post-deploy endpoint smoke checks (MVP).
- [x] Task 145 - Complete External API migration Phase E3 smoke evidence and log concrete runtime blockers before Phase F (MVP).
- [x] Task 146 - Fix dashboard backend `/account` profile and purchases proxy `502` failures discovered in E3, then revalidate smoke evidence (MVP).
- [x] Task 147 - Harden post-F0 migration handover docs for context-limited continuation with strict preflight + F1/F2 sequencing (MVP).
- [x] Task 148 - Implement website homepage hero email verification backend logic with secure external API integration and popup wiring (MVP).
- [x] Task 149 - Validate homepage hero verification flow with website checks (unit/integration/build) and document outcomes (MVP).
- [ ] Task 150 - Deploy homepage hero email verification MVP to `main` and run production smoke checks with env-backed realtime verification (MVP).
- [x] Task 151 - Complete External API migration Phase F1 pre-deploy gate (tests/build + authenticated runtime evidence) (MVP).
- [x] Task 152 - Implement website newsletter subscribe API route with Acumbamail integration + unit tests (MVP).
- [x] Task 153 - Wire website footer newsletter form to the API route with success/error UX (MVP).
- [ ] Task 154 - Validate newsletter flow (tests + website build) and deploy to `main` (MVP).

## Progress log
### Task 1 - Completed
- What: Scaled the auth marketing card and typography using CSS variables, and reduced the background opacity by 50%.
- Why: Meet the requested 2x sizing while keeping the layout responsive and configurable across auth pages.
- How: Added global auth-benefits tokens, updated `AuthBenefitsCard` to use scale-aware spacing/typography, and expanded the card max width on `/signin` and `/signup` using the scale token.

### Task 2 - Completed
- What: Ran the full test suite and checked responsive impact for the auth marketing card.
- Why: MVP changes require unit + integration coverage and confirmation that layout behavior remains stable.
- How: Activated the Python venv, loaded `.env.local`, executed all `tests/*.test.ts` with `tsx`, and confirmed the card remains hidden below `lg` so mobile layout is unaffected; console warnings from tests are expected debug logs.

### Task 3 - Completed
- What: Added local frontend origins (`http://localhost:3001`, `http://127.0.0.1:3001`) to backend CORS settings.
- Why: Local auth and email confirmation checks need to call the local FastAPI backend without browser CORS blocking.
- How: Updated `BACKEND_CORS_ORIGINS` in `backend/.env` to include local origins alongside existing production domains.

### Task 4 - Completed
- What: Confirmed local backend restart and auth confirmation checks working with the updated CORS settings.
- Why: Ensure local sign-in flows can call the backend without CORS errors.
- How: User restarted the backend manually; login/confirmation flows now succeed in local dev.

### Task 5 - Completed
- What: Updated `/signin` and `/signup` typography colors to use theme tokens for dark-mode readability.
- Why: Hard-coded dark text colors were nearly invisible in dark mode.
- How: Replaced fixed hex text colors with `var(--text-primary)`, `var(--text-secondary)`, and `var(--text-muted)` for headings, labels, input text, and helper copy.

### Task 6 - Completed
- What: Ran unit + integration tests after the dark-mode color updates.
- Why: Ensure UI-only changes did not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, ran all `tests/*.test.ts` via `tsx`; initial run failed due to missing Supabase env vars, then succeeded once environment variables were loaded. Logged warnings are expected debug output from tests.

### Task 7 - Completed
- What: Adjusted the dashboard sidebar to remain visible while scrolling.
- Why: The sidebar was leaving the viewport on long pages, making navigation inaccessible.
- How: Switched the desktop sidebar from `lg:static` to `lg:sticky` with `lg:top-0` and `lg:self-start`.

### Task 8 - Completed
- What: Re-ran unit + integration tests after the sidebar layout tweak.
- Why: Confirm layout change did not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and ran all `tests/*.test.ts` via `tsx`; warnings are expected debug output.

### Task 9 - Completed
- What: Added static limit notes to `/verify` for manual (max 25 emails) and bulk upload (max 100MB file size).
- Why: Communicate ext API constraints in the UI without changing layout or flow.
- How: Updated the manual verification note copy to include the email cap and added a small pill badge to the bulk upload card indicating the file size limit.

### Task 10 - Completed
- What: Re-ran unit + integration tests after the `/verify` limit note updates.
- Why: Ensure UI-only copy changes do not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and ran all `tests/*.test.ts` via `tsx`.

### Task 11 - Completed
- What: Updated `/verify` manual note copy to the exact requested punctuation and replaced the bulk upload limit pill with a matching warning-style note.
- Why: Match requested wording and keep both manual/bulk limit notes visually consistent.
- How: Edited the manual note string verbatim and inserted the bulk limit note using the same border, background, and typography style as the manual note.

### Task 12 - Completed
- What: Re-ran unit + integration tests after the manual/bulk note updates.
- Why: Confirm UI copy/layout adjustments did not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and ran all `tests/*.test.ts` via `tsx`.

### Task 13 - Completed
- What: Replaced dashboard footer buttons with Privacy Policy, Terms of Service, and GDPR Compliance links, and removed the Cookie Preferences item.
- Why: Provide correct legal links that open in new tabs without altering visual styling.
- How: Swapped footer `button` elements for anchor tags with the same classes, added external URLs, and set `target="_blank"` with `rel="noreferrer noopener"`.

### Task 14 - Completed
- What: Re-ran unit + integration tests after footer link updates.
- Why: Confirm UI-only changes do not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and ran all `tests/*.test.ts` via `tsx`.

### Task 15 - Completed
- What: Identified the source of the "Missing auth token" error in the pricing iframe flow.
- Why: We need the exact auth guard blocking unauthenticated pricing data before changing behavior.
- How: Traced the pricing page to `billingApi.getPricingConfigV2()` and confirmed `/api/billing/v2/config` is protected by `get_current_user`, which throws `Missing auth token` when no session is present.

### Task 16 - Completed
- What: Made `/api/billing/v2/config` accessible without authentication to unblock the pricing embed.
- Why: The pricing iframe needs pricing config/quotes for logged-out users without triggering `Missing auth token`.
- How: Added an optional auth dependency in `backend/app/core/auth.py`, updated the config endpoint to accept optional users safely, and added a test to confirm unauthenticated access.

### Task 17 - Completed
- What: Ran pricing backend tests after enabling unauthenticated pricing config.
- Why: Ensure the new optional-auth path is covered and does not break pricing flow.
- How: Activated the Python venv and ran `pytest backend/tests/test_pricing_v2.py`; warnings are from dependencies.

### Task 18 - Pending
- What: Confirm bulk upload completion email notification requirements (trigger, payload, template, success/failure rules).
- Why: We need precise notification behavior and message content before implementing SMTP or webhook handling.
- How: Waiting on clarification for webhook payloads, notification timing, and email copy; no code changes yet.

### Task 19 - Pending
- What: Add SMTP config + mailer service for bulk upload completion notifications (MVP).
- Why: A dedicated SMTP integration is required to send completion emails via Acumbamail.
- How: Blocked until SMTP details and template requirements are confirmed.

### Task 20 - Pending
- What: Implement completion-triggered notification flow with idempotency tracking (MVP).
- Why: Ensure each bulk upload completion sends one email and avoids duplicate notifications.
- How: Blocked pending decision on trigger source (webhook vs polling) and idempotency storage.

### Task 21 - Pending
- What: Validate notification flow and run unit + integration tests.
- Why: MVP changes must be verified with tests to avoid regressions.
- How: Will run backend tests once implementation is complete.

### Task 22 - Pending
### Task 22 - Completed
- What: Confirmed consent banner requirements (scope, UX, gated scripts, storage, legal link sources).
- Why: Clear decisions are needed to implement a compliant MVP without guessing.
- How: Scoped the banner to first visit on any page, set Accept/Reject-only UX, chose to gate Crisp chat and the checkout script until accept, and kept logging local-only using stored consent; legal URLs will be read from optional env vars.

### Task 23 - Completed
- What: Implemented the MVP consent banner, consent storage helper, and gated non-essential scripts (Crisp chat + checkout script).
- Why: Ensure non-essential scripts only load after explicit opt-in while keeping the UI subtle and consistent with the dashboard design.
- How: Added a consent storage module + hook, rendered a fixed bottom banner with Accept/Reject controls, gated Crisp initialization + checkout script loading on consent, and centralized legal link retrieval via env-driven config (with warnings when missing).

### Task 24 - Completed
- What: Validated the consent flow changes and ran unit + integration tests.
- Why: Confirm consent gating and UI updates did not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and executed all `tests/*.test.ts` via `./node_modules/.bin/tsx`.

### Task 25 - Completed
- What: Fixed dark-mode auth input styling after data entry on `/signin` and `/signup`.
- Why: Inputs were using hard-coded light backgrounds that looked wrong in dark mode.
- How: Replaced hard-coded border/background colors with theme tokens and added a dedicated `auth-input` class for targeted autofill styling.

### Task 26 - Completed
- What: Validated dark-mode auth input updates and ran unit + integration tests.
- Why: Ensure the auth input styling updates do not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and executed all `tests/*.test.ts` via `./node_modules/.bin/tsx`.

### Task 27 - Completed
- What: Updated API hero buttons to "Check integrations" and "API docs" with the correct destinations.
- Why: The prior CTA buttons were redundant within the API page.
- How: Swapped the primary CTA to `/integrations` and the secondary CTA to the external API docs link.

### Task 28 - Completed
- What: Validated API hero CTA updates and ran unit + integration tests.
- Why: Ensure CTA changes do not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and executed all `tests/*.test.ts` via `./node_modules/.bin/tsx`.

### Task 29 - Completed
- What: Confirmed the `/signin` remember-me behavior should remain email-prefill only, and the checked state should use the existing accent theme color.
- Why: Avoid guessing the intended behavior or styling before implementing the MVP toggle update.
- How: Collected explicit requirements (email storage only + `--accent` for checked state) and recorded them for the upcoming UI change.

### Task 50 - Completed
- What: Set the browser favicon to the provided `/public/bolt.png`.
- Why: Ensure the app uses the Bolt icon in the browser tab as requested.
- How: Added the favicon reference to Next.js metadata icons in `app/layout.tsx` so it loads globally.

### Task 30 - Completed
- What: Updated the `/signin` remember-me toggle to visually reflect checked/unchecked states using theme tokens.
- Why: The toggle was only moving the knob without any color feedback, so checked state was unclear.
- How: Replaced hard-coded track colors with theme variables and added `peer-checked` styles to apply `--accent` on the track and `--accent-contrast` on the knob.

### Task 31 - Completed
- What: Validated the remember-me toggle visuals and ran unit + integration tests.
- Why: MVP UI updates must be verified to avoid regressions.
- How: Activated the Python venv, loaded `.env.local`, and executed `tests/*.test.ts` via `./node_modules/.bin/tsx`.

### Task 32 - Completed
- What: Replaced the auth hero image on `/signin`, `/signup`, and `/reset-password` with `/background.jpg`.
- Why: Align the auth visuals with the new shared background asset.
- How: Updated the `Image` `src` in each auth page to reference `/background.jpg` while keeping existing layout/sizing.

### Task 34 - Completed
- What: Darkened the auth hero background on `/signin`, `/signup`, and `/reset-password`.
- Why: Increase contrast so the foreground card feels more dominant.
- How: Added an `absolute` overlay using `--overlay-strong` above the hero image across the three auth pages.

### Task 36 - Completed
- What: Removed the auth hero overlay on `/signin`, `/signup`, and `/reset-password`.
- Why: The overlay was no longer desired after updating the background asset.
- How: Deleted the overlay `div` so the new background image displays without additional darkening.

### Task 38 - Completed
- What: Set the auth hero image quality to 100 on `/signin` and `/signup`.
- Why: Reduce compression artifacts and better match the original background image fidelity.
- How: Added `quality={100}` to the Next.js `Image` components on the two auth pages.

### Task 39 - Completed
- What: Validated the auth hero image quality update and ran unit + integration tests.
- Why: Ensure the image quality adjustment did not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and executed `tests/*.test.ts` via `./node_modules/.bin/tsx`.

### Task 40 - Completed
- What: Served the auth hero image at original resolution on `/signin` and `/signup`.
- Why: Avoid any Next.js resizing or compression so the background renders at full fidelity.
- How: Set `unoptimized` on the hero `Image` components to bypass Next.js image optimization.

### Task 42 - Completed
- What: Served the auth hero image at original resolution on `/reset-password`.
- Why: Keep the reset password page background fidelity consistent with the other auth pages.
- How: Added `unoptimized` to the hero `Image` component on `/reset-password`.

### Task 41 - Completed
- What: Validated the original-resolution hero image update and ran unit + integration tests.
- Why: Ensure disabling image optimization does not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and executed `tests/*.test.ts` via `./node_modules/.bin/tsx`.

### Task 43 - Completed
- What: Validated the `/reset-password` hero image update and ran unit + integration tests.
- Why: Confirm the reset password background change is stable.
- How: Activated the Python venv, loaded `.env.local`, and executed `tests/*.test.ts` via `./node_modules/.bin/tsx`.

### Task 44 - Completed
- What: Hid the auth hero background image on mobile for `/signin`, `/signup`, and `/reset-password`.
- Why: Reduce mobile visual noise and keep the auth forms front-and-center on smaller screens.
- How: Updated the hero image wrapper to `hidden` by default and show it only at `lg` breakpoints.

### Task 45 - Completed
- What: Validated the mobile hero image visibility update and ran unit + integration tests.
- Why: Confirm the responsive visibility change does not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and executed `tests/*.test.ts` via `./node_modules/.bin/tsx`.

### Task 46 - Pending
- What: Confirm the icon replacement scope and Phosphor size/color conventions before swapping icons.
- Why: The requested conventions reference `Screenshot_5.png`, which is not present in the repo, so icon sizing/colors cannot be inferred yet.
- How: Awaiting the screenshot file or explicit sizing/color rules to proceed.

### Task 54 - Completed
- What: Defined a consistent, realistic demo dataset for marketing screenshots (credits, verification metrics, task history, and API usage).
- Why: The demo account needs coherent totals and time series values so screenshots look realistic and internally consistent.
- How: Specified a 30-day verification series totaling 17,700, 15 completed file-backed tasks summing to 17,700, pending/failed counts for in-flight tasks, balanced verification status totals, and 30-day API usage series totaling 9,480 with per-purpose breakdowns.

### Task 55 - Completed
- What: Created the dedicated Supabase demo user for marketing screenshots.
- Why: The ext API data must be scoped to a single, isolated user UUID with no impact on existing accounts.
- How: Created the user via the Supabase admin API using the provided email, confirmed email at creation, and recorded the user UUID for seeding (`ceb24fa7-d8e6-4833-be9c-e148c6e2ecf8`). Credentials are not stored here.

### Task 56 - Completed
- What: Seeded insert-only demo data in the ext API Postgres for the demo user.
- Why: Overview/History/API pages require realistic task history, verification metrics, credits, and API usage to appear populated in screenshots.
- How: Added 17 tasks (15 completed file-backed + 2 manual in-flight), 17,700 completed email jobs with status breakdown, credits (4 grants + 15 deductions), 3 API keys with 30-day usage series, and matching batch upload metadata. All inserts are scoped to the demo user UUID and avoid updates/deletes.

### Task 57 - Completed
- What: Validated demo data coverage for Overview, History, and API dashboard sections.
- Why: Confirm the seeded dataset meets screenshot requirements (>=15 completed file-backed tasks, API usage series, coherent totals).
- How: Queried ext API Postgres for the demo user and verified 17 tasks with 15 file-backed uploads, latest tasks ordering for Overview, 17,700 completed jobs, credit balance 22,400, 3 API keys, and API usage totals (9,480) aligned with per-purpose breakdowns.

### Task 58 - Completed
- What: Synced the demo credit balance with the ext API credit ledger used by `/credits/balance`.
- Why: The UI reads credits from the ext API ledger (not direct DB inserts), so the balance needed an admin grant.
- How: Granted 22,000 credits via the admin `/credits/grant` endpoint, bringing the demo balance to 22,400.

### Task 59 - Completed
- What: Updated Overview verification totals mapping to support ext API `valid/invalid` fields and invalid sub-statuses.
- Why: The ext API metrics payload uses `valid/invalid` plus `invalid_syntax`, `unknown`, and `disposable_domain`, which previously rendered as zeros in the Overview stats.
- How: Added fallback mapping for `valid` and `invalid`, summed invalid sub-statuses into the invalid total, included `disposable_domain` in disposable totals, and added a unit test to cover the new mapping.

### Task 60 - Completed
- What: Validated the Overview mapping behavior after the metrics update.
- Why: Ensure the new mapping renders correct totals and stays covered by tests.
- How: Ran `npm run test:overview` after activating the Python venv; all mapping tests passed.

### Task 61 - Completed
- What: Fixed the Overview mapping TypeScript build error blocking deploys.
- Why: The deploy pipeline failed `next build` because the reducer accumulator was inferred as `number | null`.
- How: Added an explicit `reduce<number>(...)` generic to keep the accumulator strictly numeric and re-ran `npm run test:overview`.

### Task 62 - Completed
- What: Redeployed to main after fixing the Overview mapping build error.
- Why: The production site must include the new metrics mapping so the Overview cards show valid/invalid counts.
- How: Pushed commit `7b07a8f` to `main` and confirmed GitHub Actions Deploy run `21593379994` completed successfully.

### Task 63 - Completed
- What: Recorded the planned marketing mock data artifact tasks in the UI progress tracker.
- Why: The new mock data work must be tracked in root-level planning/progress docs before any implementation.
- How: Added Tasks 64-66 to cover artifact JSON creation, README guidance, and handover validation, while keeping scope limited to no code or ext API changes.

### Task 64 - Completed
- What: Created artifacts-only mock data JSONs for Overview, History, and API usage.
- Why: Marketing screenshots need realistic, consistent values without touching the codebase or ext API data.
- How: Wrote `artifacts/marketing/mock_overview.json`, `artifacts/marketing/mock_history.json`, and `artifacts/marketing/mock_api_usage.json` with aligned totals (17,700 verifications, 22,400 credits, 9,480 API usage) and realistic task/series breakdowns.

### Task 67 - Completed
- What: Audited ext API `/tasks` response and DB schema to understand why Overview verification history shows zeros while History has data.
- Why: The Overview table depends on `/tasks` fields that are null, so we need a data-only remediation path or confirm a code exception is required.
- How: Queried ext API DB tables (tasks, task_email_jobs, emails, batch_uploads) and called `/api/v1/tasks` with a refreshed demo-user token; confirmed `/tasks` returns `metrics` with correct counts but leaves `email_count`, `valid_count`, `invalid_count`, `catchall_count`, and `job_status` as null; the tasks table has no count/status columns to backfill directly.
### Task 68 - Pending
### Task 69 - Pending
### Task 70 - Completed
- What: Inserted a demo purchase grant for the Enterprise plan for `boltroute@gmail.com`.
- Why: The Overview Plan card reads purchase history from `credit_grants` and showed `Unavailable` because no purchase rows existed.
- How: Upserted a `credit_grants` row with source `purchase`, event_type `transaction.completed`, Enterprise `price_ids`, credits/amount/currency defaults, and `purchased_at` set to `2026-02-05T00:00:00Z`.
### Task 72 - Completed
- What: Switched the dashboard wordmark to `/logo-white.svg` when the resolved theme is dark.
- Why: Ensure the sidebar logo remains legible in dark mode while preserving the existing light-mode asset.
- How: Updated `DashboardShell` to choose between `/logo.png` and `/logo-white.svg` based on `resolvedTheme`.
### Task 74 - Completed
- What: Swapped auth page logos to use `/logo-white.svg` in dark mode.
- Why: Keep the sign-in, sign-up, and reset-password wordmarks readable against dark surfaces.
- How: Used `useTheme()` in each auth page to select `/logo-white.svg` when `resolvedTheme` is `dark`.

### Task 76 - Pending
### Task 76 - Completed
- What: Softened the dark-mode Validation chart and pill colors while keeping the same green/orange/red/gray hues.
- Why: The prior dark-mode palette was too bright against dark surfaces and felt out of place.
- How: Updated the dark-theme chart color tokens in `app/globals.css` to deeper, lower-saturation values so both the donut segments and pill backgrounds render more subdued while keeping white text legible.

### Task 77 - Pending
- What: Validate `/overview` Validation card color updates and run unit + integration tests.
- Why: Ensure the color adjustments render correctly and do not introduce regressions.
- How: Not started yet. Will run unit + integration tests after Task 76 is implemented.

### Task 78 - Completed
- What: Audited the current `/pricing/embed` implementation and documented the embed-support requirements for local parent origins.
- Why: We need a verified baseline before changing CSP/iframe policy and parent-origin messaging behavior.
- How: Checked `next.config.ts`, embed helpers, and live `https://app.boltroute.ai/pricing/embed` headers; confirmed `frame-ancestors` was built from a comma-separated env string and local dev origins were missing.

### Task 79 - Completed
- What: Implemented `/pricing/embed` CSP + allowlist handling and updated embed messaging origin validation.
- Why: The old header used a comma-separated `frame-ancestors` value and local dev origins were not guaranteed in allowlist resolution.
- How: Refactored embed origin helpers (`app/lib/embed-config.ts`) to normalize origins, build a space-separated `frame-ancestors` directive, and resolve `parent_origin` against the allowlist; wired `next.config.ts` to use the shared directive builder and updated `app/pricing/embed/pricing-embed-client.tsx` to use validated `parent_origin` for `postMessage` target origin.

### Task 80 - Completed
- What: Validated `/pricing/embed` messaging/CSP changes and executed repo unit + integration checks.
- Why: Embed behavior must remain stable while adding local-origin support.
- How: Added `tests/embed-config.test.ts` for origin parsing/directive/allowlist resolution, then ran tests with venv active: `tsx tests/embed-config.test.ts`, `npm run test:auth-guard`, `npm run test:history`, `npm run test:overview`, `npm run test:account-purchases`, plus `npm run build`.

### Task 81 - Completed
- What: Deployed embed-support changes to `main` and verified live `/pricing/embed` headers on `app.boltroute.ai`.
- Why: The final requirement is production validation for local-parent embedding behavior and exact response headers.
- How: Pushed commit `574e58a`, monitored GitHub Actions Deploy run `21783740878` to success, validated embed behavior from a local parent origin (`http://127.0.0.1:3010`) with headless Playwright (received both `pricing_embed_resize` and `pricing_embed_cta` messages), and captured live headers via `curl -I`.

### Task 82 - Completed
- What: Defined phased monorepo migration tasks in root progress docs before file moves.
- Why: Monorepo migration has multiple high-impact steps, so task sequencing must be explicit for safe execution and newcomer handover.
- How: Added Task 82-85 entries that lock the agreed order: Step 1 adds `apps/website`, Step 2 moves dashboard only after explicit confirmation.

### Task 83 - Completed
- What: Imported the public website project into `apps/website` as source-only content.
- Why: This is the agreed MVP phase that starts monorepo adoption without breaking the existing dashboard root runtime/deploy path.
- How: Synced `/home/codex/br-website1/` to `/home/codex/email-verification-fe-v1/apps/website/` via `rsync`, excluding `.git`, `node_modules`, `.next`, and `.env` so only source/config/content assets were added.

### Task 84 - Completed
- What: Validated the Step 1 repository state after website import.
- Why: Ensure the monorepo folder exists and the dashboard root project remains unchanged for current production flow.
- How: Verified `apps/website` structure and key files, confirmed excluded runtime directories are absent, confirmed `rsync --dry-run` shows no deltas vs source, and ran root dashboard regression check `npm run test:auth-guard` (with Python venv active), which passed.

### Task 85 - Pending
- What: Prepare Step 2 move plan to relocate dashboard into `apps/dashboard`.
- Why: Step 2 will affect CI/CD paths and deployment scripts, so it must begin only after explicit user confirmation.
- How: Document required path updates and sequence, then wait for confirmation before executing any dashboard move.

### Task 85 - Completed
- What: Finalized the Step 2 execution plan and received explicit confirmation to proceed.
- Why: The migration rule requires user confirmation between steps because Step 2 changes core repo layout and CI/CD paths.
- How: Locked execution order to: baseline push, dashboard move, pipeline rewiring, website CI isolation, then validation.

### Task 86 - Pending
- What: Commit and push the Step 1 baseline before the major Step 2 move.
- Why: Repo rules require pushing before major changes so rollback points are clear and remote history stays aligned.
- How: Commit `apps/website` import + progress updates, then push `main`.

### Task 86 - Completed
- What: Committed and pushed the Step 1 baseline before dashboard relocation.
- Why: Creates a stable rollback checkpoint before high-impact path moves.
- How: Created commit `fb7a33d` with `apps/website` import + tracker updates and pushed to `origin/main`.

### Task 87 - Pending
- What: Move dashboard project from root into `apps/dashboard`.
- Why: Complete monorepo structure while preserving current dashboard behavior and keeping website isolated in `apps/website`.
- How: Relocate dashboard frontend/backend/deploy/test/config assets into `apps/dashboard`, keep root docs/planning intact, and avoid introducing behavior changes.

### Task 87 - Completed
- What: Moved dashboard project from repo root to `apps/dashboard`.
- Why: This completes the agreed monorepo structure while preserving website isolation and minimizing behavior drift.
- How: Relocated dashboard frontend (`app`), backend (`backend`), deploy scripts (`deploy`), tests (`tests`), static assets (`public`), and dashboard configs/scripts into `apps/dashboard` using `git mv` so history is preserved; added root monorepo scripts in a new root `package.json`; updated root `.gitignore` to ignore nested `node_modules` and `.next`.

### Task 88 - Pending
- What: Update dashboard deployment workflow and remote deploy script paths for `apps/dashboard`.
- Why: Existing CI/CD assumes dashboard files live at repo root and would fail after relocation.
- How: Rewrite workflow commands/rsync/deploy script references to operate from `apps/dashboard`, while keeping existing server/service names.

### Task 88 - Completed
- What: Updated dashboard deployment workflow for the new `apps/dashboard` layout.
- Why: The existing workflow was root-path based and would fail after relocation.
- How: Updated `.github/workflows/deploy.yml` to trigger only for dashboard path changes, run test commands from `apps/dashboard`, and sync release payload from `./apps/dashboard/` to the server release directory; server/service names and remote deploy script behavior were kept unchanged.

### Task 89 - Pending
- What: Add independent website CI workflow with path-based triggering.
- Why: Website changes should not trigger dashboard deployment, and website CI should run independently.
- How: Add a separate GitHub Actions workflow scoped to `apps/website/**` (and shared root workflow files as needed) to run install/lint/build checks.

### Task 89 - Completed
- What: Added an independent website CI workflow with path filters.
- Why: Website updates must be validated independently and must not trigger dashboard deployment pipeline runs.
- How: Added `.github/workflows/website-ci.yml` with `push`/`pull_request` path filters for `apps/website/**`; workflow runs `npm ci`, `npm run lint`, and `npm run build` in `apps/website`.
- Not implemented yet: Website production deploy stage is intentionally not included because deploy target/server credentials/domain routing details were not provided in this step.

### Task 90 - Pending
- What: Validate Step 2 monorepo state and pause for confirmation.
- Why: Need proof that the relocated dashboard and updated workflows are operational before any further enhancement work.
- How: Run dashboard tests/build from new paths and perform workflow sanity checks; then report and wait for confirmation.

### Task 90 - Completed
- What: Validated monorepo Step 2 state after dashboard relocation and workflow updates.
- Why: Confirms the MVP migration is operational before any follow-up enhancements.
- How: Ran dashboard frontend tests and build via root monorepo scripts (`npm run test:dashboard`, `npm run build:dashboard`), ran backend smoke test from new path (`pytest backend/tests/test_settings.py` from `apps/dashboard` with venv active), and ran website CI-equivalent commands locally (`npm --prefix apps/website ci`, `lint`, `build`). All commands completed successfully; website lint/build emitted existing non-blocking warnings (e.g., `<img>`/hook dependency notices).

### Task 91 - Completed
- What: Created a root-level `handover.md` with explicit continuation steps for the next Codex session.
- Why: Current context window is nearly exhausted and the migration state must be documented to prevent uncertainty in follow-up work.
- How: Added `handover.md` covering current monorepo state, validated commit anchors, unresolved gaps, strict ordered next actions, and mandatory process rules using explicit what/why/how/where sections.

### Task 92 - Completed
- What: Verified production dashboard deploy health after the monorepo move.
- Why: Step 1 in `handover.md` requires proof that `apps/dashboard` path changes deploy correctly and production routes remain healthy.
- How: Queried GitHub Actions deploy runs with `gh run list --workflow deploy.yml`; confirmed commit `018aca6` run `21796340993` succeeded (both `test` and `deploy` jobs green via `gh run view 21796340993`). Then ran production smoke checks: `https://app.boltroute.ai/` (`307` to `/overview`, final `200`), `https://app.boltroute.ai/overview` (`200`), and `https://app.boltroute.ai/pricing/embed` (`200`).

### Task 93 - Completed
- What: Define the website deployment contract inputs required before implementing `website-deploy.yml`.
- Why: Step 2 in `handover.md` blocks deploy automation until host/user/path/service/domain/env/trigger values are explicitly locked.
- How: Audited current deploy workflows/secrets/runtime usage (`deploy.yml`, `website-ci.yml`, `apps/website/src/**`, `gh secret list`) and live DNS/headers (`dig`, `curl`), then finalized the contract in `deployment.md`: Option A host/user reuse, release root `/var/www/boltroute-website`, service `boltroute-website`, upstream `127.0.0.1:3002`, env path `/var/www/boltroute-website/shared/.env.local`, and manual-only deploy trigger before cutover.
- Not implemented yet: No deploy workflow/script or DNS/proxy cutover changes were made in this step; those are deferred to the next steps by design.

### Task 94 - Completed
- What: Implement website production deploy workflow and remote deploy script from the locked contract.
- Why: Step 3 in `handover.md` requires a separate website deploy path independent of dashboard deploy.
- How: Added `apps/website/deploy/remote-deploy.sh` (release validation, env symlink, `npm ci`, `npm run build`, prune dev deps, switch `current` symlink, restart `boltroute-website`) and `.github/workflows/website-deploy.yml` (`workflow_dispatch` trigger, website CI gate, rsync of `apps/website/`, remote deploy execution). Workflow uses existing deploy host/user/SSH secrets plus new `WEBSITE_APP_ENV_LOCAL` secret and locked paths (`/var/www/boltroute-website`, shared env path, service name).
- Validation: With Python venv active, ran website checks locally via `cd apps/website && npm ci --include=dev && npm run lint && npm run build`; all passed with existing non-blocking warnings (`<img>` optimization and one React hook dependency warning).
- Not implemented yet: No manual production deploy run executed yet; domain/proxy cutover away from WordPress is still pending by design.

### Task 95 - Completed
- What: Add a root monorepo operator README for daily usage and ownership boundaries.
- Why: Step 4 in `handover.md` requires a clear runbook to avoid wrong-path edits in future sessions.
- How: Created root `README.md` with monorepo layout, local dev/test/build commands per app, CI/deploy workflow triggers, required deploy secrets, and current deployment ownership/status (dashboard active on `app.boltroute.ai`, website deploy workflow manual pre-cutover while WordPress remains live on `boltroute.ai`).
- Not implemented yet: No runtime/deploy behavior changed in this step; this task is documentation only.

### Task 65 - Completed
- What: Added a mock data README with totals and practical usage rules for marketing artifacts, and made the marketing artifact files trackable in git.
- Why: Task 64 created artifact JSONs, but there was no single operator guide explaining expected totals and how to use each file consistently in screenshots.
- How: Added `artifacts/marketing/README.md` with file purpose, snapshot totals, usage guidance per page (Overview/History/API), and cross-file consistency rules so future sessions can reuse the same values without drift; updated `.gitignore` to allow `artifacts/marketing/*.json` and `artifacts/marketing/README.md` so these artifacts are persisted.
- Not implemented yet: Formal consistency validation + handover sync remains in Task 66.

### Task 96 - Completed
- What: Start Step 5 by selecting and executing the next pending product task from the tracker.
- Why: `handover.md` sequence says product work resumes only after deploy-stability steps (Steps 1-4) are complete.
- How: Selected Task 65 (`artifacts/marketing` mock data README) as the first resumed product task, updated progress tracking before implementation, created the README, and verified documented totals match the artifact JSON values.
- Not implemented yet: Additional pending product tasks remain and are deferred to follow-up steps one at a time.

### Task 66 - Completed
- What: Validated marketing mock artifact consistency and updated handover notes with current execution state.
- Why: Task 65 established artifact guidance, and Task 66 required proof that cross-file totals remain consistent plus handover updates so future sessions do not restart from stale assumptions.
- How: Ran Node-based consistency checks across `artifacts/marketing/mock_overview.json`, `mock_history.json`, and `mock_api_usage.json` (task counts, completed totals, verification subtotals, API series sums, purpose sums) and all checks passed. Updated `handover.md` with current completion status (Steps 1-4 done, Step 5 active), added mock-data validation details, and refreshed known gaps to reflect current website deploy/cutover reality.
- Not implemented yet: Data backfill/overview-history DB reconciliation tasks remain in Task 68 and Task 69.

### Task 97 - Completed
- What: Continue Step 5 by executing the next pending product task after Task 65.
- Why: Product backlog items remain open and must be completed in controlled, single-task increments.
- How: Selected Task 66 as the next resumed task, updated progress tracking before implementation, completed consistency validation, and updated root handover notes.
- Not implemented yet: Additional pending product tasks remain and are intentionally deferred to the next single-task step.

### Task 98 - Completed
- What: Validate website pre-cutover deployment readiness and execute the manual website deploy workflow.
- Why: Before DNS cutover from WordPress to the new website, we need proof that deploy automation, secrets, and remote release steps work on the target host.
- How: Verified workflow/secret state (`Website Deploy` exists, no prior runs, missing `WEBSITE_APP_ENV_LOCAL` secret), dispatched `.github/workflows/website-deploy.yml` on `main`, and inspected run `21801362879`. `website-checks` passed, but `deploy` failed at `Create release directory` with `mkdir: cannot create directory '/var/www/boltroute-website': Permission denied`.
- Update: Follow-up Tasks 99.1, 99.2, 99.3, 99.4, and 99.5 have completed prerequisites, deploy rerun, and smoke checks; only DNS/proxy cutover remains.

### Task 99 - Completed
- What: Provision website deploy prerequisites on the target host and rerun manual website deploy.
- Why: Task 98 identified concrete blockers that must be resolved before DNS cutover readiness can be confirmed.
- How: Ensure `/var/www/boltroute-website` exists with deploy-user write access, create/configure `boltroute-website` service and upstream binding (`127.0.0.1:3002`), add `WEBSITE_APP_ENV_LOCAL` GitHub secret, rerun `.github/workflows/website-deploy.yml`, then verify run success and runtime health.
- Update: `handover.md` was fully rewritten with strict, no-ambiguity next-session sequencing (What/Why/How/Where) focused on Task 99 execution order and cutover readiness.
- Update (`2026-02-08`): Tasks 99.1, 99.2, 99.3, 99.4, and 99.5 are completed; next strict step is Task 99.6 DNS/proxy cutover (when approved).
- Update (`2026-02-08 17:17:24 UTC`): Task `99.6.1` baseline capture is completed; next strict step is Task `99.6.2` (proxy vhost verification/configuration).
- Update (`2026-02-08 17:22:58 UTC`): Task `99.6.2` proxy-vhost config/verification is completed; next strict step is Task `99.6.3` DNS cutover.
- Update (`2026-02-08 17:29:20 UTC`): Task `99.6.3` DNS cutover is completed at authoritative DNS; next strict step is Task `99.6.4` post-cutover validation.
- Update (`2026-02-08 17:33:29 UTC`): Task `99.6.4` post-cutover validation is completed successfully (public website + dashboard + local service checks all passed), so Task `99` is closed.
- Update (`2026-02-08`): Root `handover.md` was rewritten again with a cutover-only continuation runbook (exact evidence + strict 99.6 step order + rollback procedure) to support context-window handoff with no ambiguity.

### Task 99.1 - Completed
- What: Provisioned the website release root directories and deploy-user permissions for `/var/www/boltroute-website`.
- Why: The website deploy workflow cannot create a release without write access to the contract path.
- How: Operator executed root-level setup commands to create `/var/www/boltroute-website/{releases,shared}`, set ownership to `boltroute:boltroute`, and verify write access with a write-test file; then validation confirmed all three paths exist with `755` permissions and `boltroute:boltroute` ownership.

### Task 99.2 - Completed
- What: Provisioned and validated the `boltroute-website` systemd service bound to `127.0.0.1:3002`.
- Why: The deploy script always runs `sudo systemctl restart boltroute-website`, so the service and restart permission must exist before rerunning website deploy.
- How: Operator created `/etc/systemd/system/boltroute-website.service`, added `/etc/sudoers.d/boltroute-website-deploy` (`boltroute` can restart only this service), bootstrapped release `bootstrap-20260208174705` under `/var/www/boltroute-website/releases`, linked `/var/www/boltroute-website/current`, and enabled/restarted the service; validation confirms `systemctl status boltroute-website` is `active`, `ss -ltn` shows `127.0.0.1:3002`, and `curl -I http://127.0.0.1:3002` returns `HTTP/1.1 200 OK`.

### Task 99.3 - Completed
- What: Configured the missing `WEBSITE_APP_ENV_LOCAL` repository secret for website deployment.
- Why: `website-deploy.yml` requires this secret during `Upload env file`; without it deploy fails before remote build/restart.
- How: Operator created `/tmp/website.env.local`, set the secret via `gh secret set WEBSITE_APP_ENV_LOCAL --repo mustimoger/email-verification-fe-v1 < /tmp/website.env.local`, removed the temp file, and verification shows `WEBSITE_APP_ENV_LOCAL 2026-02-08T16:58:17Z` in `gh secret list`.

### Task 99.4 - Completed
- What: Rerun `Website Deploy` manually and capture the run result after prerequisites were provisioned.
- Why: We need a successful end-to-end deployment run before runtime smoke checks and DNS/proxy cutover steps.
- How: Triggered `.github/workflows/website-deploy.yml` on `main` and monitored run `21801917773` to completion; overall conclusion is `success`, with both jobs successful (`website-checks` and `deploy`) and all deploy steps passing (`Create release directory`, `Upload env file`, `Sync release`, `Deploy release`).

### Task 99.5 - Completed
- What: Execute pre-cutover runtime smoke checks for website service health and dashboard non-regression.
- Why: Even with deploy success, runtime checks are required before any DNS/proxy cutover action.
- How: Verified `systemctl status boltroute-website` is `active`; verified local listener (`ss -ltn` shows `127.0.0.1:3002`); checked website routes on local upstream (`curl -I http://127.0.0.1:3002/`, `/pricing`, `/integrations` all `200`); confirmed dashboard remained healthy with `curl -I https://app.boltroute.ai/` (`307` to `/overview`), `curl -I https://app.boltroute.ai/overview` (`200`), and `curl -I https://app.boltroute.ai/pricing/embed` (`200`).

### Task 99.6 - Completed
- What: Execute DNS + proxy cutover so public traffic for `boltroute.ai` and `www.boltroute.ai` serves the new website.
- Why: This is the final migration step after deploy/runtime validation is complete.
- How: Update DNS A/AAAA records to the website host, configure/verify reverse proxy vhosts + TLS for `boltroute.ai` and `www.boltroute.ai` -> `127.0.0.1:3002`, then run post-cutover smoke checks with rollback plan ready.

### Task 99.6.1 - Completed
- What: Captured pre-cutover baseline evidence for DNS, public headers, and local website service health.
- Why: Establish a rollback-safe, timestamped before-state snapshot immediately before any proxy or DNS cutover changes.
- How: At `2026-02-08 17:17:24 UTC`, recorded: `dig +short boltroute.ai A` => `192.248.184.194`; `dig +short www.boltroute.ai A` => `boltroute.ai.` then `192.248.184.194`; `curl -I https://boltroute.ai` => `HTTP/2 200` (`server: nginx`, WordPress `wp-json` links present); `curl -I https://www.boltroute.ai` => TLS hostname mismatch (`curl` exit `60`); `systemctl status boltroute-website --no-pager` => `active (running)`; `curl -I http://127.0.0.1:3002/` => `HTTP/1.1 200 OK`.
- Historical note: At this checkpoint, later cutover steps were still pending; those are now completed in the entries below.

### Task 99.6.2 - Completed
- What: Configured and verified target-host reverse proxy vhosts for `boltroute.ai` and `www.boltroute.ai` to route to `127.0.0.1:3002`.
- Why: DNS cutover requires domain routing to be ready on the destination host before apex/`www` records are switched.
- How: Built candidate config at `/tmp/Caddyfile.99_6_2` (existing `letterlinq.com` + `app.boltroute.ai` retained; added `boltroute.ai, www.boltroute.ai` block with security headers, compression, and `reverse_proxy 127.0.0.1:3002`), validated with `caddy validate --config /tmp/Caddyfile.99_6_2 --adapter caddyfile` (`Valid configuration`), and applied with `caddy reload --config /tmp/Caddyfile.99_6_2 --adapter caddyfile`. Routing evidence: `curl -I http://127.0.0.1 -H 'Host: boltroute.ai'` => `HTTP/1.1 308` to `https://boltroute.ai/`, and `/var/log/caddy/boltroute_website_access.log` records host `boltroute.ai` requests. Dashboard non-regression check: `curl -I --resolve app.boltroute.ai:443:127.0.0.1 https://app.boltroute.ai/overview` => `HTTP/2 200`.
- Not implemented yet: Persistent on-disk update of `/etc/caddy/Caddyfile` was not possible from this shell because the file is root-owned and `sudo` requires a password; runtime config is active via Caddy admin reload.
- Historical note: Pre-cutover TLS checks to `127.0.0.1` reported expected handshake failures while DNS still pointed to WordPress.

### Task 99.6.3 - Completed
- What: Confirmed DNS cutover for apex and `www` to the website host IP in Cloudflare authoritative DNS.
- Why: Task `99.6.3` requires provider-side DNS record updates before post-cutover service validation can begin.
- How: Reviewed operator-provided Cloudflare screenshot showing `A boltroute.ai -> 135.181.160.203` and `CNAME www -> boltroute.ai` (with `app` already `135.181.160.203`), then verified authoritative nameservers directly: `dig @saanvi.ns.cloudflare.com +short boltroute.ai A` => `135.181.160.203`, `dig @alaric.ns.cloudflare.com +short boltroute.ai A` => `135.181.160.203`, and `dig @saanvi.ns.cloudflare.com +short www.boltroute.ai CNAME` => `boltroute.ai.`.
- Historical note: During early propagation, recursive DNS was mixed; this was expected and was resolved during Task `99.6.4` validation.

### Task 99.6.4 - Completed
- What: Completed post-cutover validation for DNS propagation, public website HTTPS routes, dashboard non-regression, and local website service health.
- Why: This is the cutover acceptance gate; without passing checks we would trigger rollback (`99.6.5`).
- How: At `2026-02-08 17:33:29 UTC`, final checks passed: `dig +short boltroute.ai A` => `135.181.160.203`; `dig +short www.boltroute.ai A` => `boltroute.ai.` then `135.181.160.203`; `curl -I https://boltroute.ai` => `HTTP/2 200`; `curl -I https://www.boltroute.ai` => `HTTP/2 200`; `curl -I https://boltroute.ai/pricing` => `HTTP/2 200`; `curl -I https://boltroute.ai/integrations` => `HTTP/2 200`; `curl -I https://app.boltroute.ai/overview` => `HTTP/2 200`; `systemctl status boltroute-website --no-pager` => `active (running)`.
- Not implemented yet: Rollback Task `99.6.5` was intentionally not executed because validation recovered and passed. During the first validation attempt at `17:31:33 UTC`, apex/`www` briefly returned TLS alert internal error (`curl` exit `35`), then succeeded from `17:32:19 UTC` onward as certificate issuance completed.

### Task 100 - Completed
- What: Normalized root integration tracking docs after successful website cutover.
- Why: Mixed in-progress snapshots and stale checklist states were causing ambiguity for next-session execution.
- How: Updated `handover.md` to post-cutover `100.x` strict next actions, reconciled `deployment.md` checklist/status and open items, and removed stale `99.6.x In Progress` log entries from `ui-progress.md` while preserving final evidence and historical notes.
- Not implemented yet: Persistent on-disk Caddyfile update still requires root access; rollback task `99.6.5` remains conditional and unexecuted by design.

### Task 101 - Completed
- What: Persisted Step `100.1` website vhost config in `/etc/caddy/Caddyfile` and reloaded Caddy with root-assisted execution.
- Why: Runtime-only config is not durable; on-disk persistence is required to survive restarts and future maintenance windows.
- How: Operator executed root commands: backed up `/etc/caddy/Caddyfile`, appended `boltroute.ai, www.boltroute.ai` host block with `reverse_proxy 127.0.0.1:3002`, validated (`Valid configuration`), and reloaded Caddy successfully at `2026-02-08 17:52:06 UTC`.
- Not implemented yet: Optional `caddy fmt` normalization remains pending; current config is valid and active despite formatting warning.

### Task 102 - Completed
- What: Ran Step `100.2` smoke checks for website and dashboard health after Step `100.1` runtime reload.
- Why: Even with the Step `100.1` persistence blocker, we need current production-route health evidence before handoff.
- How: At `2026-02-08 17:48:29 UTC`, checks returned healthy responses: `dig +short boltroute.ai A` => `135.181.160.203`; `dig +short www.boltroute.ai A` => `boltroute.ai.` then `135.181.160.203`; `curl -I https://boltroute.ai` => `HTTP/2 200`; `curl -I https://www.boltroute.ai` => `HTTP/2 200`; `curl -I https://boltroute.ai/pricing` => `HTTP/2 200`; `curl -I https://boltroute.ai/integrations` => `HTTP/2 200`; `curl -I https://app.boltroute.ai/overview` => `HTTP/2 200`; `systemctl status boltroute-website` => `active (running)`.
- Historical note: This was an interim runtime-health check before on-disk persistence was finalized in Task `103`.

### Task 103 - Completed
- What: Closed operator-assisted Step `100.1` + durable Step `100.2` validation loop.
- Why: Step `100.1` initially failed from this shell due root restrictions, so operator execution was required to complete the MVP safely.
- How: Operator completed root persistence/reload and shared output; then at `2026-02-08 17:52:35 UTC` revalidation confirmed persisted host block (`/etc/caddy/Caddyfile` line `30`) and healthy endpoints/services (`boltroute.ai`, `www`, `/pricing`, `/integrations`, `app/overview` all `HTTP/2 200`; `boltroute-website` `active`).
- Not implemented yet: None for this task.

### Task 104 - Completed
- What: Captured final operator verification and Caddyfile formatting hardening, then synced runbook compatibility guidance.
- Why: Operator output added newer proof (`17:53:35 UTC`) and revealed that `rg` is unavailable on the target host, causing a blank `SYSTEMD_ACTIVE` capture in one command variant.
- How: Recorded the final persisted-config check (`/etc/caddy/Caddyfile` host block line `30`, public routes all `HTTP/2 200`, DNS `135.181.160.203`), captured successful `sudo caddy fmt --overwrite /etc/caddy/Caddyfile` + validate/reload at `2026-02-08 17:54:22 UTC`, and updated docs to use `grep -m1 'Active:'` for portable service-status capture.
- Not implemented yet: None for this task.

### Task 105 - Completed
- What: Completed Step `100.4` decision and implementation for website deploy trigger policy.
- Why: Post-cutover operations required a locked, automation-backed release policy instead of manual-only ambiguity.
- How: Updated `.github/workflows/website-deploy.yml` to trigger on `push` to `main` for `apps/website/**` and workflow-file changes while retaining `workflow_dispatch`; verified implementation by successful auto-triggered run `21802721793` (`website-checks` + `deploy` both `success`) at `2026-02-08 17:59:01 UTC`.
- Not implemented yet: None for this task.

### Task 106 - Completed
- What: Rewrote root `handover.md` into a strict, post-Step-100.4 continuation runbook for next Codex session.
- Why: The previous handover mixed historical cutover detail with current-state operations, leaving avoidable ambiguity when context is nearly exhausted.
- How: Replaced handover content with a clean sequence including: locked contract values, validated evidence anchors, active open items only, and strict ordered next steps (`110.1` to `110.5`) using explicit `What/Why/How/Where` for each step.
- Not implemented yet: Handover rewrite is complete; next execution work begins from Step `110.1` in the new runbook.

### Task 107 - Completed
- What: Executed Step `110.1` session preflight and repository state synchronization.
- Why: The post-cutover runbook requires baseline state validation before any production health checks or product-task work.
- How: Ran `git push origin main` (returned `Everything up-to-date`), re-read `AGENTS.md`, `handover.md`, `ui-progress.md`, and `deployment.md`, then confirmed a clean tree with `git status --short --branch` showing only `## main...origin/main`.
- Where: Repo root `/home/codex/email-verification-fe-v1` and root docs listed above.
- Not implemented yet: Step `110.2` (production health gate), Step `110.3` (stale-task reconciliation), and Step `110.4` (single pending product task selection) are still pending in strict order.

### Task 108 - Completed
- What: Executed Step `110.2` production health check gate and captured fresh runtime evidence.
- Why: The runbook requires a live production-health pass before reconciling pending task state or starting new product implementation.
- How: Ran the exact gate commands in order: `dig +short boltroute.ai A`, `dig +short www.boltroute.ai A`, `curl -I https://boltroute.ai`, `curl -I https://www.boltroute.ai`, `curl -I https://boltroute.ai/pricing`, `curl -I https://boltroute.ai/integrations`, `curl -I https://app.boltroute.ai/overview`, and `systemctl status boltroute-website --no-pager | grep -m1 'Active:'`. Results at `2026-02-08 18:10:59 UTC`: DNS resolves to `135.181.160.203` (with `www` via `boltroute.ai.`), all required endpoints returned `HTTP/2 200`, and `boltroute-website` remained `active (running)`.
- Where: Public internet endpoints (`boltroute.ai`, `www.boltroute.ai`, `app.boltroute.ai`) and target host service check (`systemctl`).
- Not implemented yet: Step `110.3` (stale unchecked-task reconciliation) and Step `110.4` (single true pending task selection with user confirmation) remain pending in strict order.

### Task 109 - Completed
- What: Reconciled stale unchecked items in the Tasks checklist against actual completion history.
- Why: Step `110.3` prevents selecting the wrong next product task by ensuring the pending list reflects reality.
- How: Audited every unchecked task and cross-checked against progress-log completion entries; corrected only stale mismatches by marking Tasks `3`, `4`, `5`, `6`, `7`, and `8` as completed because each already had a `Task X - Completed` log entry. Verified remaining unchecked tasks are true pending items.
- Where: `ui-progress.md` Tasks list and Progress log sections.
- Not implemented yet: Step `110.5` remains ongoing operational guidance; no additional product task is started until user confirms the next selection.

### Task 110 - Completed
- What: Executed Step `110.4` selection gate by choosing the next true pending product task with user confirmation.
- Why: Runbook order requires explicit user-confirmed task selection after Step `110.3` before new work starts.
- How: Presented the reconciled pending-task list, received user instruction to create deployment-structure documentation, and selected Task `111` as the single scoped product task for this step.
- Where: `ui-progress.md` pending list + user-confirmed request flow in this session.
- Not implemented yet: Step `110.5` steady-state ops posture remains active guidance for future infra-adjacent changes.

### Task 111 - Completed
- What: Created a concise root `structure.md` that explains monorepo production deployment and push-to-production flow in beginner-friendly language.
- Why: New contributors need one simple file focused on deployment mechanics (workflows, triggers, release paths, and secrets) rather than app business functionality.
- How: Documented the two production pipelines from real workflow/script sources (`deploy.yml`, `website-deploy.yml`, `website-ci.yml`, and both remote deploy scripts), including trigger rules, release process, service restarts, secret usage, and practical "how code reaches production" steps.
- Where: `structure.md` (repo root).
- Not implemented yet: No runtime or infrastructure changes were performed; this task is documentation-only.

### Task 112 - Completed
- What: Fixed the broken privacy URL in the Terms page content by changing `https://boltroute.ai/privacy` to `https://boltroute.ai/privacy-policy`.
- Why: The previous URL is broken on production and sends users to a non-existent page from the legal terms content.
- How: Updated the Terms MDX source at `apps/website/content/pages/terms.mdx`, then verified the replacement with `rg` and ran `source .venv/bin/activate && npm --prefix apps/website run build` to confirm website build integrity.
- Where: `apps/website/content/pages/terms.mdx`.
- Not implemented yet: No additional legal-page link normalization was performed in this task beyond the user-requested Terms-page fix.

### Task 113 - Completed
- What: Added a fourth Integrations Catalog card for `make.com` on the dashboard Integrations page.
- Why: The Catalog was showing only Zapier, n8n, and Google Sheets; the requested `make.com` option needed to appear as a first-class integration card with the provided logo.
- How: Copied the make logo into dashboard public assets (`apps/dashboard/public/integrations/make.png`), updated `apps/dashboard/app/lib/integrations-catalog.ts` to append a managed `Make.com` catalog option when the existing Zapier/n8n/Google Sheets trio is present and Make is absent, and added test coverage in `apps/dashboard/tests/integrations-catalog.test.ts`. Validation run: `source .venv/bin/activate && cd apps/dashboard && set -a && source .env.local && set +a && npx tsx tests/integrations-catalog.test.ts`; `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard`; `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard`.
- Where: `apps/dashboard/app/lib/integrations-catalog.ts`, `apps/dashboard/public/integrations/make.png`, `apps/dashboard/tests/integrations-catalog.test.ts`.
- Not implemented yet: No redesign of card layout/spacing was needed; existing Catalog styling and structure were preserved per current design principles.

### Task 114 - Completed
- What: Increased the homepage `Simple, Transparent Pricing` teaser typography by 1.5x for the requested text nodes (`10K/100K/1M emails`, `$37/$141/$426`, `See Full Pricing`, and trust-row items).
- Why: The pricing anchors and trust copy needed stronger visual emphasis without changing component structure or behavior.
- How: Updated `apps/website/src/components/PricingTeaser.jsx` with scoped class-size changes only: tier volume labels from `11px` to `16.5px`, tier prices from `text-2xl` to `text-4xl` (24px to 36px), CTA label to `21px`, and trust-row text from `12px` to `18px`.
- Where: `apps/website/src/components/PricingTeaser.jsx`.
- Not implemented yet: No copy/content changes were made outside the requested text-size updates.

### Task 115 - Completed
- What: Validated the homepage pricing typography update with project checks.
- Why: Ensure the MVP text-size change did not break website build/lint integrity.
- How: Ran `source .venv/bin/activate && npm run lint:website` and `source .venv/bin/activate && npm run build:website`; both passed. Existing pre-existing warnings remained (`<img>` optimization warnings and `metadataBase` warnings), with no new errors from this task.
- Where: Website lint/build scripts executed from repo root using `apps/website` pipeline.
- Not implemented yet: Dedicated website unit/integration test suites are not currently defined in `apps/website/package.json`; validation used available lint + production build checks.

### Task 116 - Completed
- What: Added a root-level shell script to start website, dashboard, and backend together on `3010/8010/8011`.
- Why: Running all local services in one terminal was requested, and previous ad-hoc command sequences were error-prone (port conflicts, unsafe shutdown behavior).
- How: Created `run-local-dev.sh` with fixed ports, venv activation, local backend log-path overrides, pre-start port cleanup, and PID-based shutdown traps that stop only spawned processes.
- Where: `run-local-dev.sh` (repo root).
- Not implemented yet: No custom CLI flags were added; script currently uses the requested fixed ports only.

### Task 117 - Completed
- What: Validated the new local-run script for syntax and runtime behavior.
- Why: Ensure the script reliably starts all services and shuts down cleanly without terminating the SSH session.
- How: Ran `bash -n run-local-dev.sh` and `timeout 20s ./run-local-dev.sh`; confirmed startup URLs, website/dashboard/backend processes on `3010/8010/8011`, and clean teardown on timeout. Also fixed a reliability issue by preferring `fuser` over `lsof` for port cleanup in this environment.
- Where: Validation executed from repo root against `run-local-dev.sh`.
- Not implemented yet: End-to-end application interaction tests were not added in this task; validation focused on startup/port/process behavior.

### Task 118 - Completed
- What: Updated the website browser tab title from `Saatosa` to `BoltRoute`.
- Why: Browser tab branding needed to match the product name.
- How: Changed root metadata title in `apps/website/src/app/layout.tsx` from `Saatosa` to `BoltRoute`.
- Where: `apps/website/src/app/layout.tsx`.
- Not implemented yet: No other text/branding strings were modified in this task beyond tab metadata title.

### Task 119 - Completed
- What: Validated the website title metadata update with standard website checks.
- Why: Ensure this metadata-only change does not introduce website regressions.
- How: Ran `source .venv/bin/activate && npm run lint:website` and `source .venv/bin/activate && npm run build:website`; both succeeded with existing pre-existing warnings only.
- Where: Repo root commands targeting `apps/website` lint/build pipeline.
- Not implemented yet: No new automated UI assertion was added for tab title; validation used the existing lint/build workflow.

### Task 120 - Completed
- What: Fixed auth-page hydration mismatch caused by theme-based logo source switching on initial render.
- Why: `/signin` (and same pattern on `/signup` and `/reset-password`) rendered different `Image src/srcSet` values between SSR HTML and first client render, producing React hydration mismatch errors.
- How: Added a `hasMounted` gate in `apps/dashboard/app/signin/page.tsx`, `apps/dashboard/app/signup/page.tsx`, and `apps/dashboard/app/reset-password/page.tsx`; logo source now defaults deterministically to `/logo.png` for SSR and initial hydration, then switches to `/logo-white.svg` only after client mount when `resolvedTheme === "dark"`.
- Where: `apps/dashboard/app/signin/page.tsx`, `apps/dashboard/app/signup/page.tsx`, `apps/dashboard/app/reset-password/page.tsx`.
- Not implemented yet: No broader theme-provider refactor was done; this task targets the concrete hydration mismatch path only.

### Task 121 - Completed
- What: Validated the auth hydration fix using dashboard checks.
- Why: Ensure hydration fix does not break dashboard behavior or build pipeline.
- How: Ran `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard`, then `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard`; both passed.
- Where: Repo root using `apps/dashboard` test/build scripts.
- Not implemented yet: Browser-level visual regression snapshot was not added in this task; validation used existing unit/integration/build coverage.

### Task 51 - Completed
- What: Validated dashboard favicon behavior against the configured Bolt icon path.
- Why: The browser tab was not reliably showing a favicon, so we needed to validate favicon configuration with current dashboard assets.
- How: Confirmed `apps/dashboard/public/bolt.png` exists, verified metadata icon configuration in `apps/dashboard/app/layout.tsx`, and re-ran dashboard test/build checks after favicon routing updates.
- Where: `apps/dashboard/app/layout.tsx`, `apps/dashboard/public/bolt.png`.
- Not implemented yet: No browser-automation assertion was added; validation used existing build/test coverage plus manual browser verification step.

### Task 52 - Completed
- What: Removed the default Next.js favicon file from the dashboard app so Bolt icon configuration is the single source.
- Why: `apps/dashboard/app/favicon.ico` could override intended favicon behavior and conflict with `/public/bolt.png` branding.
- How: Deleted `apps/dashboard/app/favicon.ico` and kept explicit metadata icons pointing to `/bolt.png`.
- Where: Removed `apps/dashboard/app/favicon.ico`; updated `apps/dashboard/app/layout.tsx`.
- Not implemented yet: No `.ico` conversion asset was introduced; favicon now uses the existing PNG asset.

### Task 53 - Completed
- What: Validated the favicon-only update after removing default Next.js favicon.
- Why: Ensure favicon cleanup did not cause regressions in dashboard runtime/build pipeline.
- How: Ran `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard`, then `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard`; both passed.
- Where: Repo root using `apps/dashboard` test/build scripts.
- Not implemented yet: No additional cross-browser favicon cache-busting mechanism was added; may require hard refresh/new tab in already-open browser sessions.

### Task 122 - Completed
- What: Kept the homepage pricing trust-row items on one line for the four requested strings: `Credits never expire`, `No charge for unknowns`, `99%+ accuracy`, and `No credit card to start`.
- Why: The requested homepage behavior is to avoid wrapping these trust-row labels onto new lines.
- How: Updated `apps/website/src/components/PricingTeaser.jsx` trust-row container classes from wrapping layout to `flex-nowrap` + `whitespace-nowrap` and added `overflow-x-auto`; also set each trust item to `shrink-0` so labels stay on a single row.
- Where: `apps/website/src/components/PricingTeaser.jsx`.
- Not implemented yet: No copy/content changes were made; only layout behavior for the existing four strings was adjusted.

### Task 123 - Completed
- What: Validated the single-line trust-row update with website checks.
- Why: Confirm the no-wrap change does not break website lint/build behavior.
- How: Ran `source .venv/bin/activate && npm run lint:website && npm run build:website`; both passed. Existing warnings remained (`<img>` optimization and `metadataBase`) with no new errors from this change.
- Where: Repo root commands using the `apps/website` lint/build pipeline.
- Not implemented yet: No browser automation snapshot test was added; validation used current project lint/build checks.

### Task 124 - Completed
- What: Removed the horizontal scrollbar under the homepage pricing trust-row while keeping the four trust texts on a single line.
- Why: The previous implementation used horizontal overflow scrolling to force single-line behavior, which showed an unwanted scrollbar in the UI.
- How: Updated the trust-row container in `apps/website/src/components/PricingTeaser.jsx` by removing `overflow-x-auto` and tightening spacing (`gap-x-6` to `gap-x-4`) while retaining `flex-nowrap` + `whitespace-nowrap`.
- Where: `apps/website/src/components/PricingTeaser.jsx`.
- Not implemented yet: No text/content changes were made; this task is layout-only.

### Task 125 - Completed
- What: Validated the trust-row scrollbar fix with website checks.
- Why: Ensure the layout tweak did not break lint/build behavior and remains deploy-safe.
- How: Ran `source .venv/bin/activate && npm run lint:website && npm run build:website`; both passed. Existing warnings remained unchanged (`<img>` and `metadataBase`).
- Where: Repo root `apps/website` lint/build pipeline.
- Not implemented yet: No browser automation regression test was added in this task.

### Task 126 - Completed
- What: Added website crawler/SEO endpoints for `robots.txt`, `sitemap.xml`, and `llms.txt` with an allow-all crawler policy.
- Why: The site needed explicit crawler discovery surfaces for search engines and LLM agents.
- How: Implemented route handlers at `apps/website/src/app/robots.txt/route.ts`, `apps/website/src/app/sitemap.xml/route.ts`, and `apps/website/src/app/llms.txt/route.ts`; added shared site URL resolution helper `apps/website/src/lib/seo/site-url.ts` so endpoint URLs are generated from configured site env values or request origin.
- Where: `apps/website/src/app/robots.txt/route.ts`, `apps/website/src/app/sitemap.xml/route.ts`, `apps/website/src/app/llms.txt/route.ts`, `apps/website/src/lib/seo/site-url.ts`.
- Not implemented yet: No `app/robots.ts` or `app/sitemap.ts` metadata-route variants were added; this MVP intentionally uses explicit route handlers for plain-text/XML control.

### Task 127 - Completed
- What: Added sitemap auto-discovery so newly published content is included without manually editing URL lists.
- Why: New posts/pages/landing content should appear in sitemap automatically as content grows.
- How: Implemented reusable sitemap builder logic in `apps/website/src/lib/seo/sitemap-core.ts` and wired production content source in `apps/website/src/lib/seo/sitemap.ts`; static public routes are included explicitly, while Velite `posts/pages/landings` are included automatically when `draft` is false and placeholder canonicals (`example.com`) are excluded.
- Where: `apps/website/src/lib/seo/sitemap-core.ts`, `apps/website/src/lib/seo/sitemap.ts`.
- Not implemented yet: New non-content app routes still need a one-line static route entry in `PUBLIC_STATIC_PATHS` to appear in sitemap (content-backed routes are fully automatic).

### Task 128 - Completed
- What: Validated SEO/LLM endpoint behavior with unit + integration checks and website lint/build.
- Why: Confirm endpoint correctness and deploy safety for the MVP before pushing to `main`.
- How: Added unit tests in `apps/website/tests/seo/site-url.test.ts` and `apps/website/tests/seo/sitemap.test.ts`, wired `test:seo` script in `apps/website/package.json`, installed `tsx` dev dependency, and ran:
  `source .venv/bin/activate && npm --prefix apps/website run test:seo`,
  `source .venv/bin/activate && npm --prefix apps/website run lint`,
  `source .venv/bin/activate && npm --prefix apps/website run build`.
  Then ran integration smoke checks by starting production server on port `3022` and fetching `/robots.txt`, `/sitemap.xml`, and `/llms.txt` (all returned `HTTP 200` with expected content types and body content).
- Where: `apps/website/tests/seo/site-url.test.ts`, `apps/website/tests/seo/sitemap.test.ts`, `apps/website/package.json`, `apps/website/package-lock.json`.
- Not implemented yet: Existing pre-existing lint/build warnings in website remain (`<img>` optimization and `metadataBase` warnings); no new blocking errors were introduced.

### Task 129 - Completed
- What: Deployed the SEO/LLM endpoint changes to `main` and verified production endpoint behavior.
- Why: MVP required deployment and real production evidence, not only local validation.
- How: Committed and pushed `main` commit `2f70dc6` (`feat(website): add robots, sitemap, and llms endpoints`). Verified GitHub Actions success:
  Website CI run `21828246386` and Website Deploy run `21828246368` both completed successfully. Then executed production smoke checks:
  `curl -I https://boltroute.ai/robots.txt`,
  `curl -I https://boltroute.ai/sitemap.xml`,
  `curl -I https://boltroute.ai/llms.txt`
  (all `HTTP/2 200` with correct content types). Confirmed robots allow-all policy + sitemap pointer, confirmed sitemap contains key public URLs and excludes `/test_home` and `/test_page`, and confirmed `llms.txt` is reachable with the expected policy text.
- Where: GitHub Actions runs `21828246386` and `21828246368`; production endpoints `https://boltroute.ai/robots.txt`, `https://boltroute.ai/sitemap.xml`, `https://boltroute.ai/llms.txt`.
- Not implemented yet: No separate `llms-full.txt` or segmented sitemap index was added in this MVP.

### Task 130 - Completed
- What: Scanned the full dashboard codebase for External API integration touchpoints and created a root migration runbook for updated `docs.boltroute.ai` contracts.
- Why: The External API contract changed and the dashboard needs a clear, session-resumable, file-by-file adaptation plan before implementation starts.
- How: Audited frontend direct External API client usage, backend External API client/proxy routes/services, and related tests/scripts; validated current docs endpoints and payloads from `https://docs.boltroute.ai/llms.txt` plus endpoint markdown pages; then authored `ext-api-updates.md` with phased MVP-first steps, affected files, test/deploy gates, and explicit open questions.
- Where: `ext-api-updates.md` (new root plan file).
- Not implemented yet: No code behavior changes were made in this step; migration implementation tasks remain pending in `ext-api-updates.md`, including confirmation of `/credits/grant` support and upload-column canonical handling.

### Task 131 - Completed
- What: Locked user clarifications into the External API migration runbook and started an append-only execution log in that file.
- Why: The next Codex session must continue without confusion, and implementation must follow confirmed rules (credits grant support, explicit upload column selection, and 5-status model with disposable separated).
- How: Updated `ext-api-updates.md` by adding a dedicated "Locked migration decisions" section, adjusting migration phases to enforce the new status model/full-switch direction, narrowing open questions to unresolved non-primary status behavior, and appending an execution-log entry for this completed step.
- Where: `ext-api-updates.md`.
- Not implemented yet: Runtime dashboard/backend code changes are still pending; only planning/progress documentation was updated in this step.

### Task 132 - Completed
- What: Implemented the first runtime External API migration step for dashboard status/count mapping and switched to the new 5-primary-status model with `unknown` as secondary.
- Why: Dashboard logic still relied on legacy status assumptions (`exists/not_exists`) and merged disposable/role-based semantics incorrectly for the updated External API contract.
- How: Added shared status normalization in `apps/dashboard/app/lib/verification-status.ts`, then updated mapping/count logic across `apps/dashboard/app/history/utils.ts`, `apps/dashboard/app/overview/utils.ts`, `apps/dashboard/app/overview/overview-client.tsx`, `apps/dashboard/app/verify/verify-client.tsx`, `apps/dashboard/app/verify/verify-sections.tsx`, and `apps/dashboard/app/verify/utils.ts` to use primary buckets (`valid`, `invalid`, `catchall`, `disposable_domain`, `role_based`) with separate `unknown` handling; updated affected tests in `apps/dashboard/tests/history-mapping.test.ts`, `apps/dashboard/tests/overview-mapping.test.ts`, and `apps/dashboard/tests/verify-mapping.test.ts`; validated with:
  `source .venv/bin/activate && npm --prefix apps/dashboard run test:history`,
  `source .venv/bin/activate && npm --prefix apps/dashboard run test:overview`,
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm --prefix apps/dashboard exec tsx apps/dashboard/tests/verify-mapping.test.ts`,
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard`,
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard`.
- Where: `apps/dashboard/app/lib/verification-status.ts`, `apps/dashboard/app/history/utils.ts`, `apps/dashboard/app/overview/utils.ts`, `apps/dashboard/app/overview/overview-client.tsx`, `apps/dashboard/app/verify/verify-client.tsx`, `apps/dashboard/app/verify/verify-sections.tsx`, `apps/dashboard/app/verify/utils.ts`, and the three updated dashboard mapping test files.
- Not implemented yet: Backend External API migration phases (`apps/dashboard/backend/*`) are still pending, and no deployment to `main` has been executed for this step yet.

### Task 133 - Completed
- What: Hardened handover documentation for context-constrained continuation and created a ready-to-send kickoff message for the next Codex session.
- Why: Session context is near limit; next session must continue from exact migration state without ambiguity or accidental rework.
- How: Updated `ext-api-updates.md` to remove ambiguous checklist state, mark completed file-level items, and add a strict "Next Session Resume Guide" section with explicit What/Why/How/Where plus timestamped repo-state snapshot and validated command list; created root `next-codex-session-handover.md` containing a copy-ready first-message template for the next session start.
- Where: `ext-api-updates.md`, `next-codex-session-handover.md`.
- Not implemented yet: Backend migration phases (`C1`/`C2`/`C3`/`C4`) remain pending; no new runtime behavior changes or deployment were executed in this documentation step.

### Task 134 - Completed
- What: Updated backend test coverage first for Phase `C1 + C2` contract alignment and upload-status support expectations.
- Why: The migration requires tests-first execution before backend client/runtime updates, so regressions are caught by contract assertions instead of after-the-fact behavior checks.
- How: Updated `apps/dashboard/backend/tests/test_external_client.py` to assert docs-aligned task/file-backed fields (`is_file_backed`, nested `file.*`) plus upload-status endpoint behavior (`GET /tasks/batch/uploads/{upload_id}`), and updated `apps/dashboard/backend/tests/test_tasks_metrics_mapping.py` to assert new status vocabulary handling (`valid`, `invalid`, `catchall`, `invalid_syntax`, `disposable_domain`, `unknown`) while still covering legacy aliases (`exists`, `not_exists`, `disposable_domain_emails`). Ran `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_external_client.py apps/dashboard/backend/tests/test_tasks_metrics_mapping.py` and confirmed expected red-state failures against current backend runtime code.
- Where: `apps/dashboard/backend/tests/test_external_client.py`, `apps/dashboard/backend/tests/test_tasks_metrics_mapping.py`, `ext-api-updates.md`.
- Not implemented yet: Runtime implementation in `apps/dashboard/backend/app/clients/external.py` and `apps/dashboard/backend/app/services/task_metrics.py` is still pending for this phase, so the updated tests are intentionally failing until the next step.

### Task 135 - Completed
- What: Completed Phase `C1 + C2` runtime backend alignment for External API client models/methods and metrics status mapping behavior.
- Why: Updated backend runtime needed to match docs contract and pass the tests-first assertions added in Task 134, while preserving locked migration rules (5 primary statuses and `unknown` kept secondary).
- How: Updated `apps/dashboard/backend/app/clients/external.py` with docs-aligned status/model coverage (expanded realtime response fields, task file-backed metadata fields, upload-status response models, new `get_upload_status(upload_id)`, and `list_credit_transactions(limit, offset)`), then updated `apps/dashboard/backend/app/services/task_metrics.py` so counting uses `valid/invalid/catchall/disposable_domain/role_based` with `unknown` excluded from primary invalid totals and legacy aliases still supported. Validation commands:
  `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_external_client.py apps/dashboard/backend/tests/test_tasks_metrics_mapping.py`
  `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_tasks_list_fallback.py apps/dashboard/backend/tests/test_tasks_jobs_proxy.py apps/dashboard/backend/tests/test_tasks_upload_email_count.py apps/dashboard/backend/tests/test_tasks_latest_upload.py apps/dashboard/backend/tests/test_tasks_latest_uploads.py`
  `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests`
  Both suites passed.
- Where: `apps/dashboard/backend/app/clients/external.py`, `apps/dashboard/backend/app/services/task_metrics.py`, `ext-api-updates.md`.
- Not implemented yet: Phase `C3` route implementation is still pending; `/api/tasks/latest-upload` and `/api/tasks/latest-uploads` continue to return `204` until that step is executed.

### Task 136 - Completed
- What: Hardened migration handover documentation for context-limited continuation and recreated a copy-ready initial message for the next Codex session.
- Why: Current session context is near limit, and the next session must continue from the exact checkpoint (C3 only) without redoing completed C1/C2 work or mis-ordering phases.
- How: Updated `ext-api-updates.md` to remove ambiguity by marking P0.2 complete, tightening Section 9 into an explicit C3-only resume guide with strict guardrails, validation commands, remaining-gap evidence, and non-goals; added Section 10 handover lock entry with What/Why/How/Where; recreated `next-codex-session-handover.md` with a strict copy-ready first message specifying read order, locked rules, and required C3 execution flow.
- Where: `ext-api-updates.md`, `next-codex-session-handover.md`.
- Not implemented yet: No runtime code changes were made in this step; `apps/dashboard/backend/app/api/tasks.py` C3 route implementation remains pending.

### Task 137 - Completed
- What: Completed C3 tests-first update for latest-upload route behavior and captured the expected pre-implementation red state.
- Why: C3 must replace fixed `204` latest-upload behavior with metadata-backed responses, and tests needed to define and lock that contract before route code changes.
- How: Updated `apps/dashboard/backend/tests/test_tasks_latest_upload.py` and `apps/dashboard/backend/tests/test_tasks_latest_uploads.py` to assert:
  - `200` payloads for file-backed uploads (including upload-status metadata merge),
  - fallback to task metadata when upload-status lookup is unavailable,
  - `204` only when no resolvable file-backed uploads exist,
  - default `LATEST_UPLOADS_LIMIT` usage and `limit <= 0` validation.
  Then ran `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_tasks_latest_upload.py apps/dashboard/backend/tests/test_tasks_latest_uploads.py` and observed expected failures because `apps/dashboard/backend/app/api/tasks.py` still returns fixed `204`.
- Where: `apps/dashboard/backend/tests/test_tasks_latest_upload.py`, `apps/dashboard/backend/tests/test_tasks_latest_uploads.py`, `ext-api-updates.md`.
- Not implemented yet: C3 route implementation in `apps/dashboard/backend/app/api/tasks.py` is still pending; full backend suite rerun is deferred until that code update is complete.

### Task 138 - Completed
- What: Implemented C3 latest-upload backend routes to return upload/task metadata-based responses while preserving frontend route contracts.
- Why: The remaining migration gap was fixed `204` behavior on `/api/tasks/latest-upload` and `/api/tasks/latest-uploads` despite completed C1/C2 upload-status support.
- How: Updated `apps/dashboard/backend/app/api/tasks.py` by adding route-local helpers to identify file-backed tasks, fetch upload status via `get_upload_status(upload_id)` when available, and fall back to task/file metadata when upload-status lookup fails; routes now return `LatestUploadResponse` payloads when resolvable and keep `204` only when none are available. Explicit email-column selection/upload mapping logic was not changed. Validation commands run:
  `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_tasks_latest_upload.py apps/dashboard/backend/tests/test_tasks_latest_uploads.py`
  `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests`
  Both passed (`7 passed` targeted, `116 passed` full backend suite).
- Where: `apps/dashboard/backend/app/api/tasks.py`, `apps/dashboard/backend/tests/test_tasks_latest_upload.py`, `apps/dashboard/backend/tests/test_tasks_latest_uploads.py`, `ext-api-updates.md`.
- Not implemented yet: Phase C4 and later migration phases (D/E3/F) remain pending.

### Task 139 - Completed
- What: Completed Phase C4 by reconciling `/credits/grant` flow coverage for signup, trial, and purchase paths with updated backend/external client expectations.
- Why: C4 required preserving `/credits/grant` as the backend grant path and hardening tests so future model updates do not silently break credit grant propagation.
- How: Added tests-first assertions that grant flows call external grants with correct reasons/metadata in:
  - `apps/dashboard/backend/tests/test_signup_bonus.py` (`reason="signup_bonus"`, source metadata for signup),
  - `apps/dashboard/backend/tests/test_trial_bonus.py` (`reason="trial_bonus"`, source metadata for trial),
  - `apps/dashboard/backend/tests/test_billing.py` (`reason="purchase"`, purchase metadata from webhook transaction),
  and added external client route contract coverage in `apps/dashboard/backend/tests/test_external_client.py` to assert `grant_credits()` posts to `POST /credits/grant`. Ran:
  `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_signup_bonus.py apps/dashboard/backend/tests/test_trial_bonus.py apps/dashboard/backend/tests/test_billing.py apps/dashboard/backend/tests/test_external_client.py`
  `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests`
  Both passed (`25 passed` targeted, `117 passed` full backend suite).
- Where: `apps/dashboard/backend/tests/test_signup_bonus.py`, `apps/dashboard/backend/tests/test_trial_bonus.py`, `apps/dashboard/backend/tests/test_billing.py`, `apps/dashboard/backend/tests/test_external_client.py`, `ext-api-updates.md`.
- Not implemented yet: No runtime code path changes were required for C4; remaining migration work is Phase D onward.

### Task 140 - Completed
- What: Completed Phase D1 by aligning shared dashboard frontend API TypeScript contracts to the updated External API/backend shapes.
- Why: The migration required current typed payload coverage for verify/task/metrics/latest-upload flows and explicit separation of primary statuses from legacy aliases to prevent type-level drift back to legacy-first assumptions.
- How: Updated `apps/dashboard/app/lib/api-client.ts` with richer response type fields (`VerifyEmailResponse`, `VerificationStep`, `TaskDetailResponse`, `TaskListResponse`), added structured status/count types (`VerificationStatusCounts`, `TaskJobStatusCounts`), and introduced explicit verification status taxonomy types that keep `exists/not_exists` as compatibility aliases rather than primary status definitions. Ran:
  `source .venv/bin/activate && npm --prefix apps/dashboard run test:history`
  `source .venv/bin/activate && npm --prefix apps/dashboard run test:overview`
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm --prefix apps/dashboard exec tsx apps/dashboard/tests/verify-mapping.test.ts`
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard`
  All passed.
- Where: `apps/dashboard/app/lib/api-client.ts`, `ext-api-updates.md`.
- Not implemented yet: Phase D2 dashboard surface validation, E3 integration/smoke checks, and deploy phases remain pending.

### Task 141 - Completed
- What: Hardened `ext-api-updates.md` handover sections for context-limited continuation with zero ambiguity on next scope.
- Why: The file still contained stale C3-only resume instructions that no longer matched completed C3/C4/D1 state and could cause incorrect rework in the next session.
- How: Updated `ext-api-updates.md` Section 9 and Section 10 to D2-only scope, refreshed completed-file inventory, refreshed evidence snapshot command results/counts, and tightened non-goals/guardrails; also appended a Section 8 execution-log entry with explicit What/Why/How/Where for this documentation step.
- Where: `ext-api-updates.md` (Sections 8, 9, 10).
- Not implemented yet: Phase D2 runtime surface validation, E3 integration/smoke checks, and Phase F deploy gates remain pending.

### Task 142 - Completed
- What: Created a new copy-ready root kickoff message artifact for the next Codex session.
- Why: You requested an explicit initial handover message, and the previous artifact was missing while context is near limit.
- How: Added `next-codex-session-handover.md` with a strict first-message template aligned to current migration lock state (B/C1/C2/C3/C4/D1 complete, D2 only next), including exact read order, locked rules, required D2 validation commands, and mandatory progress-log updates after each completed step.
- Where: `next-codex-session-handover.md`, `ext-api-updates.md` Section 8.
- Not implemented yet: D2 runtime surface validation, E3 integration/smoke checks, and Phase F deploy gates remain pending.

### Task 143 - Completed
- What: Completed Phase D2 validation for dashboard surfaces against the updated External API contract and re-baselined migration handover docs to post-D2 scope.
- Why: D2 was the only remaining Phase D task and needed concrete validation evidence before proceeding to final regression/deploy gates.
- How: Executed required D2 checks:
  `source .venv/bin/activate && npm --prefix apps/dashboard run test:history`,
  `source .venv/bin/activate && npm --prefix apps/dashboard run test:overview`,
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm --prefix apps/dashboard exec tsx apps/dashboard/tests/verify-mapping.test.ts`,
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard`,
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard`.
  Added D2-adjacent validation for API/account-shell utility behavior with:
  `source .venv/bin/activate && npm --prefix apps/dashboard exec tsx apps/dashboard/tests/api-usage-utils.test.ts` and
  `source .venv/bin/activate && npm --prefix apps/dashboard exec tsx apps/dashboard/tests/credits-cache.test.ts`.
  Attempted Playwright-authenticated protected-route smoke checks on local dashboard dev (`/overview`), but injected session from `key-value-pair.txt` failed refresh (`AuthApiError: Invalid Refresh Token`), so Playwright-authenticated evidence is deferred to E3 with refreshed session data.
- Where: `ext-api-updates.md` (Sections 4, 8, 9, 10), `next-codex-session-handover.md`, `ui-progress.md`.
- Not implemented yet: Phase E2 remaining backend task/job status-payload proxy test coverage, Phase E3 authenticated Playwright smoke checks, and Phase F deploy gates remain pending.

### Task 144 - Completed
- What: Completed Phase E2 remaining backend coverage by adding task/job proxy tests for updated status payload passthrough and input validation.
- Why: E2 still had one pending item (`task/job proxy tests for new status payloads`) blocking transition to E3 smoke checks.
- How: Updated `apps/dashboard/backend/tests/test_tasks_jobs_proxy.py` with:
  - a new route-level test asserting `/api/tasks/{task_id}/jobs` preserves nested `email.status` payloads for `valid`, `invalid`, `catchall`, `disposable_domain`, `role_based`, and `unknown`, including `is_disposable` and `is_role_based` flags;
  - a new route-level test asserting invalid negative `offset` is rejected with `400`.
  Validation commands:
  `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_tasks_jobs_proxy.py` (`5 passed`),
  `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests` (`119 passed`).
- Where: `apps/dashboard/backend/tests/test_tasks_jobs_proxy.py`, `ext-api-updates.md`, `next-codex-session-handover.md`, `ui-progress.md`.
- Not implemented yet: Phase E3 authenticated Playwright smoke checks and Phase F deploy gates remain pending; Playwright route checks still require refreshed session data in `key-value-pair.txt`.

### Task 145 - Completed
- What: Completed Phase E3 integration/smoke evidence capture with backend/frontend command validation plus authenticated Playwright route checks for `overview`, `history`, `verify`, `api`, and `account`.
- Why: Migration could not move to deploy gating without end-to-end smoke evidence showing real runtime behavior on protected dashboard routes.
- How: Ran:
  `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_tasks_*.py apps/dashboard/backend/tests/test_account.py` (`41 passed`),
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard` (passed),
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard` (passed);
  then injected refreshed auth session from `key-value-pair.txt` and captured route artifacts:
  `tmp/e3-overview.png`, `tmp/e3-history.png`, `tmp/e3-verify.png`, `tmp/e3-api.png`, `tmp/e3-account.png` and matching `tmp/e3-*-console.log` files.
  Console evidence shows:
  - `POST /api/credits/signup-bonus` -> `409 Conflict` with eligibility-window warning for current test user;
  - `GET /api/account/profile` and `GET /api/account/purchases` -> `502 Bad Gateway` on `/account`.
- Where: `tmp/e3-*.png`, `tmp/e3-*-console.log`, `ext-api-updates.md`, `next-codex-session-handover.md`, `ui-progress.md`.
- Not implemented yet: `/account` backend `502` fixes are still pending, so Phase F deploy gates remain blocked until those endpoints are fixed and E3 smoke is revalidated.

### Task 146 - Completed
- What: Completed F0 revalidation for the `/account` blocker fix and confirmed no blocking `502` responses remain for account profile/purchases routes.
- Why: Phase F could not advance to deploy gating until post-fix runtime smoke proved the E3-discovered `/account` failures were resolved in authenticated flow.
- How: Ran
  `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests/test_account.py` (`11 passed`),
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard` (passed),
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard` (passed),
  then captured authenticated Playwright artifacts for `/account` and `/overview` using refreshed `key-value-pair.txt` session storage data.
  Console evidence in `tmp/f0-account-reval-console.log` and `tmp/f0-overview-reval-console.log` shows no `/api/account/profile` or `/api/account/purchases` `502` entries; remaining `POST /api/credits/signup-bonus` `409 Conflict` is the expected warning path for current test user.
- Where: `apps/dashboard/backend/app/api/account.py`, `apps/dashboard/backend/tests/test_account.py`, `tmp/f0-account-reval.png`, `tmp/f0-account-reval-console.log`, `tmp/f0-overview-reval.png`, `tmp/f0-overview-reval-console.log`, `ext-api-updates.md`, `next-codex-session-handover.md`, `ui-progress.md`.
- Not implemented yet: Phase F1 pre-deploy gate and Phase F2 deploy-to-main verification remain pending.

### Task 147 - Completed
- What: Hardened migration handover documentation so the next Codex session can continue from post-F0 state without ambiguity.
- Why: Context is near limit and the next session must start directly on deploy gates, not re-derive runtime prerequisites or reopen completed blocker-fix work.
- How: Updated `ext-api-updates.md` to append a dedicated post-F0 handover-hardening execution entry (What/Why/How/Where), tightened Section 9 with mandatory runtime preflight (`run-local-dev.sh`, backend health check, `key-value-pair.txt` readiness), and refreshed Section 10 lock wording to post-F0-handover-hardened scope; updated `next-codex-session-handover.md` with a copy-ready first message that includes mandatory preflight plus explicit F1/F2 execution order.
- Where: `ext-api-updates.md`, `next-codex-session-handover.md`, `ui-progress.md`.
- Not implemented yet: Phase F1 pre-deploy gate and Phase F2 deploy-to-main verification remain pending.

### Task 151 - Completed
- What: Completed Phase F1 pre-deploy gates (backend tests, dashboard tests/build, and authenticated protected-route smoke evidence) for the External API migration.
- Why: Phase F2 deploy-to-main cannot start until the full pre-deploy quality gates are green and the post-F0 runtime behavior is reconfirmed in an authenticated flow.
- How: Ran
  `source .venv/bin/activate && pytest -q apps/dashboard/backend/tests` (`123 passed`),
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run test:dashboard` (passed),
  `source .venv/bin/activate && set -a && source apps/dashboard/.env.local && set +a && npm run build:dashboard` (passed),
  then captured authenticated Playwright artifacts for `/account` and `/overview` using refreshed `key-value-pair.txt` session storage data:
  `tmp/f1-account-predeploy.png`, `tmp/f1-account-predeploy-console.log`, `tmp/f1-overview-predeploy.png`, `tmp/f1-overview-predeploy-console.log`.
  Console evidence shows no `/api/account/profile` or `/api/account/purchases` `502` entries; expected `POST /api/credits/signup-bonus` `409 Conflict` warning path remains for the current test user.
- Where: `ext-api-updates.md`, `next-codex-session-handover.md`, `tmp/f1-account-predeploy.png`, `tmp/f1-account-predeploy-console.log`, `tmp/f1-overview-predeploy.png`, `tmp/f1-overview-predeploy-console.log`.
- Not implemented yet: Phase F2 deploy-to-main and post-deploy verification remain pending.

### Task 148 - Completed
- What: Implemented website homepage hero email-verification backend logic and wired the hero form to show verification results in the popup UI.
- Why: The homepage hero input existed visually but had no secure backend integration for realtime verification.
- How: Added a secure server route `POST /api/email-verification` in the website app that calls external realtime verification (`/api/v1/verify`) using server-only env vars (`BOLTROUTE_VERIFY_API_BASE_URL`, `BOLTROUTE_VERIFY_API_KEY`), handles invalid payload/upstream/network failures with explicit messages, and normalizes API responses for UI consumption. Moved popup implementation from repo root to `apps/website/src/components/EmailVerificationPopup.tsx`, added shared normalization in `apps/website/src/lib/email-verification.ts`, added a new client form component `apps/website/src/components/HeroVerificationForm.tsx`, and integrated it into `apps/website/src/components/HeroSection.tsx`.
- Where: `apps/website/src/app/api/email-verification/route.ts`, `apps/website/src/lib/email-verification.ts`, `apps/website/src/components/EmailVerificationPopup.tsx`, `apps/website/src/components/HeroVerificationForm.tsx`, `apps/website/src/components/HeroSection.tsx`.
- Not implemented yet: Deployment environment must provide `BOLTROUTE_VERIFY_API_BASE_URL` and `BOLTROUTE_VERIFY_API_KEY` for runtime verification requests.

### Task 149 - Completed
- What: Validated the new homepage verification flow with focused unit/integration-style tests and full website lint/build checks.
- Why: MVP completion required proving the new route and UI wiring compile and behave as expected before deploy.
- How: Added and executed:
  `source .venv/bin/activate && cd apps/website && npx tsx tests/email-verification-normalize.test.ts`,
  `source .venv/bin/activate && cd apps/website && npx tsx tests/email-verification-route.test.ts`,
  `source .venv/bin/activate && cd apps/website && npm run test:seo`,
  `source .venv/bin/activate && npm --prefix apps/website run lint`,
  `source .venv/bin/activate && npm --prefix apps/website run build`.
  New tests passed, and lint/build passed with existing non-blocking warnings unrelated to this task.
- Where: `apps/website/tests/email-verification-normalize.test.ts`, `apps/website/tests/email-verification-route.test.ts`, `apps/website` lint/build outputs, `ui-progress.md`.
- Not implemented yet: Browser-level manual smoke on production `https://boltroute.ai` after env vars are set and deployed to `main`.

### Task 152 - Completed
- What: Implemented a production-grade MVP newsletter subscription API route for the website footer using Acumbamail, plus unit tests.
- Why: The footer newsletter input existed visually but had no backend integration to actually add subscribers to a list.
- How: Added a Next.js server route `POST /api/newsletter/subscribe` (Node.js runtime) that validates JSON payloads, rejects invalid emails, supports a honeypot bot trap, optionally rate-limits by client IP (env-driven), and calls Acumbamail `addSubscriber` using server-only env vars. Implemented the Acumbamail integration as a shared helper module so request construction and error normalization are testable. Added a focused route test that mocks `fetch` and verifies the outbound request shape and error handling. Executed `source .venv/bin/activate && npm --prefix apps/website run test:newsletter` (passed).
- Where: `apps/website/src/app/api/newsletter/subscribe/route.ts`, `apps/website/src/lib/newsletter/acumbamail.ts`, `apps/website/tests/newsletter/subscribe-route.test.ts`, `apps/website/package.json`, `ui-progress.md`.
- Not implemented yet: Footer UI wiring (Task 153) and deployment with production env vars (`ACUMBAMAIL_API_BASE_URL`, `ACUMBAMAIL_AUTH_TOKEN`, `ACUMBAMAIL_LIST_ID`) remain pending.

### Task 153 - Completed
- What: Wired the website footer newsletter form to the new newsletter subscription API route with basic success/error UX.
- Why: Without client-side wiring, visitors could type an email but nothing would be submitted to Acumbamail.
- How: Added a small client component that submits to `POST /api/newsletter/subscribe`, includes a honeypot field, disables submission while loading, and shows an inline success or error message based on the API response. Replaced the static footer input/button with this component while keeping the existing footer layout/styling intact.
- Where: `apps/website/src/components/NewsletterSignupForm.tsx`, `apps/website/src/components/FooterSection.tsx`, `ui-progress.md`.
- Not implemented yet: Production validation + deploy (Task 154) is still pending, including setting `ACUMBAMAIL_API_BASE_URL`, `ACUMBAMAIL_AUTH_TOKEN`, and `ACUMBAMAIL_LIST_ID` in the website runtime env.
