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
- [ ] Task 51 - Validate favicon update and run unit + integration tests.
- [ ] Task 52 - Remove the default Next.js favicon so only `/public/bolt.png` is served (MVP).
- [ ] Task 53 - Validate favicon-only update and run unit + integration tests.
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
