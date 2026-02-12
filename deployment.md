# Deployment plan: app.boltroute.ai (Next.js on this Ubuntu server)

## Scope and goals (what/why/how)
- **What:** Deploy the Next.js app in `/home/codex/email-verification-fe-v1` to `app.boltroute.ai` on this server. The WordPress landing page at `boltroute.ai` is hosted elsewhere.
- **Why:** Provide a production-grade, secure, and fast app endpoint without coupling to the WordPress infrastructure.
- **How:** Deploy via GitHub Actions on the `main` branch (build → test → release → restart), then enhancements only after validation.

## Preconditions to confirm (must be answered before execution)
- **Ownership/Access:** DNS access for `app.boltroute.ai`, SSH access to the server, and permission to change the web server config.
- **Existing stack:** Which web server currently runs on this server (Nginx, Apache, Caddy, other) and how TLS is handled today.
- **Runtime requirements:** Required environment variables, secrets source, and any external services needed at runtime.
- **GitHub access:** Ability to manage repo secrets and workflows in `https://github.com/mustimoger/email-verification-fe-v1`.
- **Deploy auth:** A deploy key or SSH keypair that GitHub Actions can use to reach this server.
- **Release policy:** Downtime tolerance and rollback expectations.

## Execution checklist (run log)
- [x] Step 1 - Inventory and baseline checks (capture OS/web server/TLS/ports/firewall/Node)
- [x] Step 2 - DNS and TLS readiness (verify DNS and obtain TLS for `app.boltroute.ai`)
- [x] Step 3 - CI/CD pipeline (GitHub Actions deploy)
- [x] Step 4 - Runtime configuration and secrets (`.env.local` on server)
- [x] Step 5 - Process management (systemd)
- [x] Step 5.1 - Deploy sudoers (limited systemctl restarts)
- [x] Step 6 - Reverse proxy and routing hardening
- [x] Step 7 - Security hardening
- [x] Step 8 - Test and verify before deployment
- [x] Step 8.1 - Fix backend test failure (missing helper)
- [x] Step 9 - Deploy to main (cutover)
- [x] Step 9.1 - Investigate deploy workflow failure (resolved before Step 10)
- [x] Step 10 - Post-deploy validation
- [x] Step 10.1 - Tighten frontend bind to localhost (security hardening follow-up)
- [ ] Step 10.2 - Update external API base URL env + redeploy (Overview data unavailable)
- [ ] Step 10.3 - Fix frontend API base URL env + redeploy (CORS on /api)

## Step 2 (Monorepo) - Website deployment contract status

### What
- Lock the website deployment contract before implementing `.github/workflows/website-deploy.yml`.

### Why
- `handover.md` requires exact deploy inputs (host/path/service/domain/env/trigger) before any website production deploy automation is written.

### How
- Collected facts from:
  - `.github/workflows/deploy.yml` (dashboard deploy baseline)
  - `.github/workflows/website-ci.yml` (current website CI-only status)
  - `apps/website/src/**` (runtime env usage)
  - live DNS + header checks (`dig`, `curl`) on February 8, 2026.

### Contract items (required)
- 1. Destination host + deploy user:
  - Locked: Reuse dashboard deploy host/user (Option A) via existing repo secrets `DEPLOY_HOST` + `DEPLOY_USER`.
  - Known: dashboard deploy currently targets `/var/www/boltroute-app` on host `135.181.160.203` (`app.boltroute.ai` infra).
  - Known: `boltroute.ai` and `www.boltroute.ai` resolve to `192.248.184.194`, while `app.boltroute.ai` resolves to `135.181.160.203`.
  - Known: `https://boltroute.ai` currently serves WordPress via `nginx` (response includes `wp-json` links).
  - Status: Locked.
- 2. Website release root path:
  - Locked: `/var/www/boltroute-website`.
  - Status: Locked.
- 3. Website systemd service name:
  - Locked: `boltroute-website`.
  - Status: Locked.
- 4. Reverse proxy/vhost mapping:
  - Known: final target domains are `boltroute.ai` and `www.boltroute.ai`.
  - Known: new website is not assigned to those domains yet; current WordPress site remains active there and will be replaced at cutover.
  - Known: `http://www.boltroute.ai` redirects to HTTPS, but `https://www.boltroute.ai` currently has a certificate hostname mismatch.
  - Locked pre-cutover deploy shape: run website service on `127.0.0.1:3002` on Option A host for verification without switching public traffic.
  - Locked cutover target: move `boltroute.ai` and `www.boltroute.ai` to website host and proxy both hostnames to `127.0.0.1:3002`.
  - Status: Deployment contract locked; DNS/TLS/proxy cutover execution remains a later operational step.
- 5. Environment file location + required env keys:
  - Known runtime key from code: one of `NEXT_PUBLIC_SITE_URL` or `SITE_URL` is needed for absolute canonical/OG URLs (`apps/website/src/app/[slug]/page.tsx`).
  - Website hero email verification (server-side route `POST /api/email-verification`) requires:
    - `BOLTROUTE_VERIFY_API_BASE_URL` (e.g. `https://api.boltroute.ai`)
    - `BOLTROUTE_VERIFY_API_KEY` (server-side API key; do not expose via `NEXT_PUBLIC_*`)
  - Known optional automation keys (not website runtime): `IMAP_*`, `PROCESSED_FOLDER`, `ALLOWED_SENDERS`, `GIT_AUTHOR_*` for email publishing workflow in `.github/workflows/email-publish.yml`.
  - Locked env file path: `/var/www/boltroute-website/shared/.env.local`.
  - Status: Locked.
- 6. Deploy trigger policy:
  - Initial policy (pre-cutover): manual deploy only (`workflow_dispatch`).
  - Post-cutover locked policy: automatic deploy on `push` to `main` scoped to `apps/website/**`, while retaining `workflow_dispatch`.
  - Implemented workflow paths:
    - `apps/website/**`
    - `.github/workflows/website-deploy.yml`
  - Status: Locked and implemented.

### Current state and open items
- Website deploy workflow/script are implemented:
  - `.github/workflows/website-deploy.yml`
  - `apps/website/deploy/remote-deploy.sh`
- Latest state updates:
  - Task 99.1 completed on `2026-02-08`: `/var/www/boltroute-website/{releases,shared}` now exists with `boltroute:boltroute` ownership and `755` permissions, and deploy-user write access was verified with a write-test.
  - Task 99.2 completed on `2026-02-08`: `boltroute-website.service` now exists, is enabled/active, and serves on `127.0.0.1:3002`; local upstream check returns `HTTP/1.1 200 OK`.
  - Task 99.3 completed on `2026-02-08`: `WEBSITE_APP_ENV_LOCAL` secret is configured in GitHub Actions (`2026-02-08T16:58:17Z`).
  - Task 99.4 completed on `2026-02-08`: website deploy rerun `21801917773` succeeded (`website-checks` + `deploy` jobs both `success`).
  - Task 99.5 completed on `2026-02-08`: pre-cutover smoke checks passed (`boltroute-website` active, local upstream routes `/`, `/pricing`, `/integrations` all `200`, and dashboard endpoints remained healthy: `/` `307`, `/overview` `200`, `/pricing/embed` `200`).
  - Task 99.6.1 completed on `2026-02-08 17:17:24 UTC`: pre-cutover baseline was captured and confirms no public cutover yet (`boltroute.ai` A = `192.248.184.194`; `www.boltroute.ai` resolves via `boltroute.ai.` to `192.248.184.194`; `https://boltroute.ai` returns `HTTP/2 200` from WordPress/nginx; `https://www.boltroute.ai` still fails TLS hostname validation; local website service remains healthy with `systemctl` active and `http://127.0.0.1:3002/` returning `HTTP/1.1 200 OK`).
  - Task 99.6.2 completed on `2026-02-08 17:22:58 UTC`: configured/verified Caddy runtime vhosts for `boltroute.ai` and `www.boltroute.ai` -> `127.0.0.1:3002` using validated reload config (`/tmp/Caddyfile.99_6_2`), confirmed host routing (`curl -I http://127.0.0.1 -H 'Host: boltroute.ai'` => `308` and access log entry in `/var/log/caddy/boltroute_website_access.log`), and confirmed dashboard non-regression (`curl -I --resolve app.boltroute.ai:443:127.0.0.1 https://app.boltroute.ai/overview` => `HTTP/2 200`); TLS for `boltroute.ai`/`www.boltroute.ai` is still not issued pre-cutover (TLS alert internal error when resolved to `127.0.0.1`).
  - Task 99.6.3 completed on `2026-02-08 17:29:20 UTC`: DNS cutover is confirmed at Cloudflare authoritative nameservers (`dig @saanvi.ns.cloudflare.com +short boltroute.ai A` => `135.181.160.203`; `dig @alaric.ns.cloudflare.com +short boltroute.ai A` => `135.181.160.203`; `dig @saanvi.ns.cloudflare.com +short www.boltroute.ai CNAME` => `boltroute.ai.`). Operator screenshot confirms matching Cloudflare records (`A boltroute.ai -> 135.181.160.203`, `CNAME www -> boltroute.ai`).
  - Task 99.6.4 completed on `2026-02-08 17:33:29 UTC`: post-cutover validation passed (`dig +short boltroute.ai A` => `135.181.160.203`; `dig +short www.boltroute.ai A` => `boltroute.ai.` then `135.181.160.203`; `curl -I https://boltroute.ai` => `HTTP/2 200`; `curl -I https://www.boltroute.ai` => `HTTP/2 200`; `curl -I https://boltroute.ai/pricing` => `HTTP/2 200`; `curl -I https://boltroute.ai/integrations` => `HTTP/2 200`; dashboard check `https://app.boltroute.ai/overview` => `HTTP/2 200`; `systemctl status boltroute-website` => `active (running)`). Rollback step `99.6.5` was not triggered.
  - Step 100.1 initial attempt on `2026-02-08 17:47:49 UTC`: backup `/tmp/Caddyfile.backup.20260208T174749Z` and candidate `/tmp/Caddyfile.step1001.20260208T174749Z` were created; `caddy validate` passed and `caddy reload` succeeded from candidate; final write to `/etc/caddy/Caddyfile` initially failed with `Permission denied` due missing passwordless sudo.
  - Step 100.1 completion on `2026-02-08 17:52:06 UTC`: operator executed root commands to persist website host block in `/etc/caddy/Caddyfile`; `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` returned `Valid configuration`; reload succeeded.
  - Step 100.2 post-persist smoke checks on `2026-02-08 17:52:35 UTC`: persisted host block present at `/etc/caddy/Caddyfile` line `30`; `boltroute.ai`, `www`, `/pricing`, `/integrations`, and `app.boltroute.ai/overview` all returned `HTTP/2 200`; DNS resolves to `135.181.160.203`; `boltroute-website` service is `active (running)`.
  - Step 100.2 operator rerun on `2026-02-08 17:53:35 UTC`: repeated persisted-host-block (`line 30`), DNS, and public-route checks all remained healthy (`HTTP/2 200` on apex/`www`/`pricing`/`integrations`/`app /overview`).
  - Caddyfile formatting hardening on `2026-02-08 17:54:22 UTC`: `sudo caddy fmt --overwrite /etc/caddy/Caddyfile` completed, followed by successful validate + reload.
  - Step 100.4 completion on `2026-02-08`: post-cutover deploy policy implemented in `.github/workflows/website-deploy.yml`; workflow now triggers on `push` to `main` with website path filters and still supports manual `workflow_dispatch`.
  - Step 100.4 validation on `2026-02-08 17:59:01 UTC`: push commit `25886db` auto-triggered run `21802721793`; run completed `success` with `website-checks` and `deploy` jobs green.
- Open items:
  - Keep rollback procedure (`99.6.5`) available for regressions.
- Historical notes:
  - Initial manual run `21801362879` failed at `Create release directory` due missing permissions; this was remediated and superseded by successful run `21801917773`.
  - During initial post-cutover checks at `2026-02-08 17:31:33 UTC`, apex/`www` TLS briefly failed (`curl` exit `35`) while cert issuance completed; it recovered by `17:32:19 UTC` and final validation passed.
  - Target-host shell does not include `rg` by default; use `grep -m1 'Active:'` for portable service-status capture in operator commands.

## MVP deployment plan (production-grade baseline)

### Step 1 - Inventory and baseline checks
- **What:** Capture the current server state and existing services so the new app vhost does not disrupt other workloads.
- **Why:** Prevent conflicts on ports, TLS, and routing; ensure the plan fits the existing stack on this host.
- **How:** Identify OS version, active web server, current vhosts, TLS method, and firewall rules; confirm Node version availability or install via a managed package source.

### Step 2 - DNS and TLS readiness
- **What:** Point `app.boltroute.ai` to this server and ensure TLS can be issued for the subdomain.
- **Why:** Production-grade TLS is mandatory for security and modern browser features.
- **How:** Add/verify DNS records for `app.boltroute.ai`; configure the existing web server to issue/renew TLS for the new vhost.

### Step 3 - CI/CD pipeline (GitHub Actions deploy)
- **What:** Build, test, and deploy from GitHub on changes to `main`.
- **Why:** Ensures all updates go through version control and a consistent, repeatable deploy process.
- **How:** Add a GitHub Actions workflow that runs tests, builds the app, and deploys to this server over SSH using a release directory and a `current` symlink.
- **Planned tasks (must complete in order):**
  - Create an SSH deploy key pair and install the public key on this server for the deploy user.
  - Add a GitHub Actions workflow that runs tests and triggers a deploy on `main`.
  - Add a server-side deploy script that builds, links shared `.env` files, and restarts services.

### Step 4 - Runtime configuration and secrets (`.env.local`)
- **What:** Store production env values in a server-side `.env.local`.
- **Why:** Keep secrets out of Git and avoid leaking config in logs or build artifacts.
- **How:** Write `/var/www/boltroute-app/shared/.env.local` from GitHub Actions secrets and symlink it into each release; restrict file permissions to the deploy user.
- **Planned tasks (must complete in order):**
  - Update GitHub Secrets for frontend `.env.local` (production URLs + OAuth redirect URL).
  - Update GitHub Secrets for backend `.env` (prod env + CORS + sandbox Paddle config).
  - Verify Supabase OAuth redirect URL allowlist includes the production callback URL.

### Step 5 - Process management (systemd)
- **What:** Run the app as a managed service.
- **Why:** Reliable restarts, logging, and controlled startup/shutdown are required for production stability.
- **How:** Create a systemd unit that runs `next start` from the `current` release directory, binds to localhost, and restarts on failure; run as a dedicated, least-privileged user.
- **Findings:**
  - **Units:** `/etc/systemd/system/boltroute-frontend.service` and `/etc/systemd/system/boltroute-backend.service`.
  - **Enabled:** both services enabled to start on boot.
  - **Config:** frontend runs Next.js on `127.0.0.1:3000`; backend runs Uvicorn on `127.0.0.1:8001` using shared venv.
- **Status:** Complete (services will start after first deploy creates `current` release).

### Step 5.1 - Deploy sudoers (limited systemctl restarts)
- **What:** Allow the deploy user to restart only the required services.
- **Why:** GitHub Actions deploy needs to restart services without full sudo access.
- **How:** Added `/etc/sudoers.d/boltroute-deploy` to allow `systemctl restart` for `boltroute-frontend` and `boltroute-backend`; validated via `visudo -cf`.
- **Status:** Complete.

### Step 6 - Reverse proxy and routing hardening
- **What:** Confirm proxy settings and add performance headers.
- **Why:** Improve performance and reduce repeated load on the app server.
- **How:** Ensure Caddy proxies `app.boltroute.ai` to `127.0.0.1:3000`, enable HTTP/2, set cache headers for `/_next/static`, and enable compression.
- **Findings:**
  - **Routing:** `app.boltroute.ai/api/*` proxies to `127.0.0.1:8001`, all other paths to `127.0.0.1:3000`.
  - **Caching:** `/_next/static/*` responses are set to immutable caching.
  - **Compression:** gzip + zstd enabled.
  - **Caddy reload:** configuration validated and reloaded.
- **Status:** Complete.

### Step 7 - Security hardening
- **What:** Apply production security controls at the OS and edge.
- **Why:** Reduce attack surface and enforce secure defaults.
- **How:** Restrict inbound access to standard HTTP(S) ports, keep the app bound to localhost, enable HSTS, set security headers, and ensure logs do not contain secrets.
- **Findings:**
  - **Firewall:** UFW active with default deny inbound; only 22/80/443 allowed (IPv4 + IPv6).
  - **Headers:** Added HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and removed `Server` header for `app.boltroute.ai`.
  - **Proxy:** Backend remains bound to localhost and is only reachable via Caddy.
- **Status:** Complete.

### Step 8 - Test and verify before deployment
- **What:** Validate app behavior before switching traffic.
- **Why:** First-principles requirement: test thoroughly before deployment.
- **How:** Run unit and integration tests from the repo, perform a local production build, and verify no runtime config is missing.

### Step 9 - Deploy to main (cutover)
- **What:** Switch traffic to the new release.
- **Why:** Controlled cutover reduces risk.
- **How:** Update the `current` symlink to the new release, reload/restart the systemd service, and confirm the reverse proxy routes to the new process.

### Step 9.1 - Investigate deploy workflow failure
- **What:** Inspect the failed Deploy job and identify the root cause.
- **Why:** The workflow must complete successfully before post-deploy validation is reliable.
- **How:** Review GitHub Actions logs for the Deploy job, capture the failing step and error output, fix the underlying issue, then re-run the workflow and confirm a successful deploy.
- **Planned tasks (must complete in order):**
  - Diagnose the failure from the Deploy job logs and capture the exact error.
  - Update the deploy script to install dev dependencies for build, then switch to production for runtime.
  - Ensure npm does not omit dev dependencies during the build, even if production configs are present; prune dev deps after build.
  - Fix the TypeScript type error in `app/lib/integrations-catalog.ts` exposed by the production build.
  - Update the Supabase catalog query cast to go through `unknown` so the build type-check passes.
  - Wrap `useSearchParams()` usage for pricing/sign-in/sign-up routes with Suspense boundaries to satisfy Next.js CSR bailout rules.
  - Commit missing redirect and embed helper modules so the deploy build can resolve their imports.
  - Export the pricing embed CTA payload type and embed props from `app/pricing/pricing-client.tsx` so `pricing-embed-client.tsx` can compile.
  - Re-run unit/integration tests and a production build after the pricing embed export fix to confirm CI readiness.
  - Commit and push the pricing embed export fix so the deploy workflow can pick it up.
  - Install and authenticate the GitHub CLI locally (user-level) to re-run the workflow from this host.
  - Write/update `handover.md` so the next session can pick up with full context.
  - Re-run the Deploy workflow and confirm the deploy job completes successfully.

### Step 10 - Post-deploy validation
- **What:** Confirm the app is healthy and fast in production.
- **Why:** Production readiness requires verification, not assumption.
- **How:** Run smoke checks on `app.boltroute.ai`, monitor logs for errors, and verify other services on this host remain unaffected.

## Enhancements (only after MVP is verified in production)
- Add deploy approvals and a documented rollback playbook.
- Add metrics/alerting (uptime checks, error rates, latency, resource utilization).
- Add CDN for static assets if traffic volume warrants it.
- Add WAF or rate limiting at the edge if threat profile requires it.

## Progress log
### Step 0 - Deployment plan drafted
- **What:** Created a step-by-step, production-grade MVP plan with security and performance best practices.
- **Why:** Provide a clear, low-risk path to deploy `app.boltroute.ai` on the existing server.
- **How:** Documented baseline steps, tests, and post-deploy verification before any enhancements.
- **Status:** Complete (plan only; deployment not executed).

### Step 0.1 - Clarified hosting separation
- **What:** Updated the plan to reflect that WordPress is hosted on a different server.
- **Why:** Avoid assumptions about shared infrastructure and focus on this host's stack.
- **How:** Adjusted scope, preconditions, and validation steps to reference only services on this server.
- **Status:** Complete (plan only; deployment not executed).

### Step 0.2 - Switched to GitHub Actions deployment
- **What:** Updated the plan to require deployments through GitHub Actions on `main`.
- **Why:** Ensure all updates are managed through Git and CI/CD, not manual server changes.
- **How:** Revised steps to define a GitHub Actions workflow, SSH-based release deploy, and server-side `.env.local` handling.
- **Status:** Complete (plan only; deployment not executed).

### Step 1 - Inventory and baseline checks
- **What:** Collected current OS, web server, ports, and Node runtime details for this host.
- **Why:** Ensure the deployment plan aligns with the actual server stack and avoids port conflicts.
- **How:** Checked OS release, systemd services, Caddy config, open ports, and Node version; attempted firewall status but lacked root access.
- **Findings:**
  - **OS:** Ubuntu 24.04.3 LTS.
  - **Web server:** Caddy active (`caddy.service`), Nginx/Apache inactive.
  - **Caddy config:** `/etc/caddy/Caddyfile` currently proxies `letterlinq.com` to `127.0.0.1:8000` and logs to `/var/log/caddy/frontend_access.log`.
  - **Ports:** `:80` and `:443` listening; `127.0.0.1:8000` and `:8001` in use; Caddy admin on `127.0.0.1:2019`.
  - **Node:** `v24.13.0`.
  - **Firewall:** `ufw status` not accessible without root.
- **Status:** Complete.

### Step 2 - DNS and TLS readiness
- **What:** Verify DNS points to this host and enable Caddy to issue TLS for `app.boltroute.ai`.
- **Why:** DNS and TLS are prerequisites for production traffic.
- **How:** Confirmed DNS resolution, updated `/etc/caddy/Caddyfile` with an `app.boltroute.ai` site block, validated config, and reloaded Caddy.
- **Findings:**
  - **DNS:** `app.boltroute.ai` resolves to `135.181.160.203`.
  - **Caddy:** TLS certificate successfully obtained for `app.boltroute.ai`.
  - **HTTP check:** `https://app.boltroute.ai` returns `502` because the app is not yet running on `127.0.0.1:3000`.
- **Status:** Complete.

### Step 3 - Release layout staged (superseded by CI/CD)
- **What:** Prepared an initial release directory layout on the server.
- **Why:** Establish the standard release structure needed for CI/CD deployments.
- **How:** Created `/var/www/boltroute-app` with `releases/`, `shared/`, and `logs/`, and staged release `20260123103558` without secrets.
- **Findings:**
  - **Release root:** `/var/www/boltroute-app`.
  - **Release ID:** `20260123103558` exists and is owned by `boltroute`.
- **Status:** Complete (future deploys should be via GitHub Actions).

### Step 3 - CI/CD pipeline (GitHub Actions deploy)
- **What:** Added the deployment workflow and server-side deploy script.
- **Why:** All updates must ship via GitHub Actions on `main`.
- **How:** Generated an SSH deploy key, added the public key for the `boltroute` user, added `.github/workflows/deploy.yml`, and added `deploy/remote-deploy.sh`.
- **Findings:**
  - **Workflow:** `.github/workflows/deploy.yml` runs frontend + backend tests and deploys via SSH.
  - **Deploy script:** `deploy/remote-deploy.sh` builds frontend, installs backend deps in a shared venv, links shared env files, and restarts services.
  - **SSH key:** Deploy key generated and installed on server; `boltroute` user now has a login shell for SSH access.
- **Status:** Complete (first deploy still depends on Step 5 systemd units).

### Step 4 - Runtime configuration and secrets
- **What:** Align frontend `.env.local` and backend `.env` with production values.
- **Why:** Production builds must not rely on localhost or dev-only settings.
- **How:** Use GitHub Secrets to populate shared env files on the server via the deploy workflow.
- **Findings:**
  - **Frontend:** `NEXT_PUBLIC_API_BASE_URL` set to `https://app.boltroute.ai/api`; `NEXT_PUBLIC_OAUTH_REDIRECT_URL` set to `https://app.boltroute.ai/overview`.
  - **Backend:** prod values provided via secrets, including updated CORS and sandbox Paddle config.
  - **Supabase:** OAuth redirect allowlist updated to include `https://app.boltroute.ai/*`.
- **Status:** Complete.

### Step 8 - Tests
- **What:** Ran frontend and backend test suites.
- **Why:** Required before first production deploy.
- **How:** Ran frontend tests via `npm run test:*` and backend tests via `pytest` with minimal env.
- **Findings:**
  - **Frontend:** all tests passed.
  - **Backend:** all tests passed after fixing `backend/tests/test_tasks_limits.py`.
- **Status:** Complete.

### Step 8.1 - Fix backend test failure
- **What:** Resolve failing backend test caused by missing `upsert_tasks_from_list`.
- **Why:** Deployment requires a clean test run.
- **How:** Removed stale monkeypatch in `backend/tests/test_tasks_limits.py` that referenced a deleted helper.
- **Status:** Complete.

### Step 9 - Deploy to main (completed)
- **What:** Triggered the GitHub Actions deployment on `main`.
- **Why:** Cutover is now handled by the CI/CD workflow.
- **How:** Pushed commits `9152659`, `dcccc00`, `1d014a3`, `95b550b`, `ea9255a`, `a8fb475`, `9a67190`, `6119523`, and `bc6fe7d` to `main`, which triggered the Deploy workflow.
- **Findings:**
  - **Workflow runs:** previous failures listed in Step 9.1; latest deploy run at `2026-01-23T13:52:34Z` (head `856ad06`) completed successfully.
  - **Release:** `20260123135238` built and deployed.
  - **Build:** `next build` succeeded and generated static pages.
  - **Backend deps:** shared venv updated and requirements installed.
- **Status:** Complete (proceed to Step 10 validation).

### Step 9.2 - Deploy to main (2026-02-02) failed
- **What:** Deploy run for the Overview metrics mapping update.
- **Why:** Required to ship the `valid/invalid` mapping fix to production.
- **How:** GitHub Actions Deploy workflow run `21593228396` triggered on push of `12adc42`.
- **Findings:**
  - **Failing step:** `Deploy release` during `next build`.
  - **Error:** TypeScript error in `app/overview/utils.ts` (`sum` possibly `null` in reducer).
- **Status:** Blocked pending code fix and redeploy.

### Step 9.3 - Deploy to main (2026-02-02) succeeded
- **What:** Redeployed after fixing the Overview mapping build error.
- **Why:** Needed to ship the `valid/invalid` mapping fix to production.
- **How:** GitHub Actions Deploy workflow run `21593379994` (head `7b07a8f`) completed successfully; deploy job finished without errors.
- **Status:** Complete.

### Step 9.1 - Investigate deploy workflow failure (resolved)
- **What:** Diagnose the Deploy job failure and re-run the workflow.
- **Why:** Deployment must succeed before post-deploy validation can be completed.
- **How:** Obtain Deploy job logs (admin access or shared logs), capture the failing step, fix the root cause, and re-run the workflow.
- **Findings:**
  - **Failing step:** `npm run build` inside `deploy/remote-deploy.sh`.
  - **Error:** `next build` failed to load `next.config.ts` because `typescript` was missing.
  - **Cause:** `NODE_ENV=production` is set before `npm ci`, so dev dependencies (including `typescript`) are omitted during the build.
  - **Server inspection:** Latest releases `20260123113632`, `20260123114625`, `20260123121841`, and `20260123132918` contain the updated deploy script and `node_modules/typescript`, but `.next/BUILD_ID` is missing and no `shared/backend-venv` exists; `current` symlink is absent. This suggests the deploy script still fails before the venv step, likely during the build phase.
  - **New error:** Production build fails with a TypeScript error in `app/lib/integrations-catalog.ts` (cast to `PromiseLike` rejected; TS suggests casting through `unknown` first).
  - **Follow-on error:** `SupabaseClient` is not assignable to `SupabaseCatalogClient` because the custom query type expects `eq`/`order` on the value returned by `from(...)`.
  - **Next.js error:** `useSearchParams()` requires Suspense boundaries for `/pricing`, `/pricing/embed`, `/signin`, and `/signup` during prerender.
  - **Module error:** Build failed with `Module not found` for `../lib/redirect-utils` and `./pricing-embed-client` because the files existed locally but were not committed, so the deploy release was missing them.
  - **Follow-on error:** `PricingCtaPayload` is not exported from `app/pricing/pricing-client.tsx`, so the embed client fails to compile.
- **Action taken:** Updated `deploy/remote-deploy.sh` to install dev dependencies for the build and switch to production afterward.
- **Why:** `next.config.ts` requires `typescript` during the build, but runtime should stay production-grade.
- **How:** Use `npm ci --include=dev`, run `NODE_ENV=production npm run build`, then export `NODE_ENV=production` for subsequent steps.
- **Action taken (follow-up):** Hardened the deploy script to force dev deps during the build and prune afterward.
- **Why:** Some environments still omit dev dependencies if `production` is set; pruning keeps runtime lean.
- **How:** Set `NODE_ENV=development` and `NPM_CONFIG_PRODUCTION=false` for `npm ci`, build with `NODE_ENV=production`, then `npm prune --omit=dev` before runtime.
- **Action taken (follow-up):** Adjusted the await cast to go through `unknown` as suggested by the build error.
- **Why:** TypeScript rejects direct casting from the custom query type to `PromiseLike`.
- **How:** Cast via `unknown` before `PromiseLike<{ data; error }>`; build then failed due to the `from(...)` type mismatch.
- **Action taken (follow-up):** Loosened the Supabase client interface to avoid deep type instantiation and match the runtime query chain.
- **Why:** The Supabase client generics caused an infinite instantiation error when matching the custom query type.
- **How:** Accept `from()` returning `unknown`, cast to a minimal select/query shape, then await the thenable query.
- **Action taken (follow-up):** Added Suspense boundaries for the pricing embed, pricing page, sign-in, and sign-up routes.
- **Why:** `useSearchParams()` requires a Suspense boundary when prerendering to avoid CSR bailout errors.
- **How:** Wrapped client components in `<Suspense>` with a minimal loading fallback.
- **Action taken (follow-up):** Prepared to commit missing redirect/embed helper modules referenced in auth and pricing routes.
- **Why:** Deploy releases are created from the repo, and missing files cause `Module not found` during build.
- **How:** Add `app/lib/redirect-utils.ts`, `app/lib/redirect-storage.ts`, `app/lib/embed-config.ts`, and `app/pricing/embed/pricing-embed-client.tsx` to Git.
- **Action taken (follow-up):** Added the missing helper modules to Git so deploy releases include them.
- **Why:** The deploy build runs from the release directory created from Git; missing files break imports during `next build`.
- **How:** Staged the missing files and verified the build succeeds locally.
- **Action taken (follow-up):** Exposed the pricing embed payload type and embed props in `app/pricing/pricing-client.tsx`.
- **Why:** `app/pricing/embed/pricing-embed-client.tsx` imports the payload type and passes embed props to `PricingV2Client`.
- **How:** Exported `PricingCtaPayload` and added `variant`/`onCtaClick` props so the embed build compiles.
- **Action taken (follow-up):** Installed GitHub CLI locally at `~/.local/bin/gh` using the latest release tarball.
- **Why:** Need to re-run the Deploy workflow from this host as requested.
- **How:** Downloaded the latest GitHub CLI release from `cli/cli`, extracted it, and copied the binary into `~/.local/bin`.
- **Tests (follow-up):** Ran `npm run test:history`, `npm run test:auth-guard`, `npm run test:overview`, and `npm run test:account-purchases` with env loaded from `.env.local`; ran `npx tsx tests/integrations-catalog.test.ts`. All passed.
- **Why:** Ensure the pricing embed export change doesn’t regress existing unit/integration coverage before re-running CI/CD.
- **Build check (follow-up):** `npm run build` succeeds with the pricing embed export fix applied.
- **Resolution:** Deploy workflow rerun succeeded with head `856ad06` and release `20260123135238`.
- **Notes:** Deploy logs show npm audit warnings and an ssh-agent cleanup warning, but the deploy completed.
- **Status:** Complete.

### Step 10 - Post-deploy validation (completed)
- **What:** Smoke-check production endpoints and service health.
- **Why:** Validate the running services and ensure nothing regressed.
- **How:** Hit public app routes, verify backend health locally, and check systemd service status.
- **Findings:**
  - **Public app:** `https://app.boltroute.ai` returns `307` to `/overview`; `/overview` returns `200`.
  - **Public pages:** `/pricing`, `/pricing/embed`, `/signin`, `/signup`, `/verify`, `/reset-password`, `/integrations`, `/history`, and `/account` all return `200`.
  - **Backend via public proxy:** `https://app.boltroute.ai/api/health` returns `404` (backend health is not exposed under `/api`).
  - **Backend local health:** `http://127.0.0.1:8001/health` returns `{"status":"ok"}`.
  - **Services:** `boltroute-frontend` and `boltroute-backend` systemd units are **active**.
  - **Ports:** `127.0.0.1:8001` is bound as expected; `:3000` is bound on all interfaces (not just localhost), which is a deviation from the intended reverse-proxy-only exposure.
- **Status:** Complete; consider tightening frontend bind to `127.0.0.1` if external exposure is not desired.

### Step 10.1 - Tighten frontend bind to localhost
- **What:** Bind the Next.js service to `127.0.0.1` instead of all interfaces.
- **Why:** The frontend currently listens on `:3000` (all interfaces), which bypasses the intended reverse-proxy-only exposure.
- **How:** Update the systemd unit `ExecStart` to pass `-H 127.0.0.1`, then reload daemon and restart the service; verify `ss -ltnp` shows `127.0.0.1:3000`.
- **Action taken:** Added a systemd drop-in override and restarted the service.
- **Why:** Ensure the frontend only binds to localhost.
- **How:** Created `/etc/systemd/system/boltroute-frontend.service.d/override.conf`, cleared `ExecStart`, and set `next start -H 127.0.0.1 -p 3000`; reloaded daemon and restarted `boltroute-frontend`.
- **Verification:** `ss -ltnp` shows `127.0.0.1:3000`.
- **Status:** Complete.

### Step 10.2 - Update external API base URL env + redeploy (pending)
- **What:** Update frontend and backend environment base URLs to the documented `https://api.boltroute.ai/api/v1`.
- **Why:** `/overview` shows `Unavailable` when the browser calls `https://email-verification.islamsaka.com` (TLS mismatch) instead of the documented API host.
- **How:** Update GitHub Secrets (`APP_ENV_LOCAL` and `BACKEND_ENV`) to set `NEXT_PUBLIC_EMAIL_API_BASE_URL` and `EMAIL_API_BASE_URL` to `https://api.boltroute.ai/api/v1`, then trigger a deploy to rebuild the frontend and refresh the runtime env.
- **Status:** Pending.

### Step 10.3 - Fix frontend API base URL env + redeploy (pending)
- **What:** Ensure `NEXT_PUBLIC_API_BASE_URL` targets `https://app.boltroute.ai/api` instead of `https://api.boltroute.ai/api`.
- **Why:** Requests to `https://api.boltroute.ai/api/*` are blocked by CORS when sent with credentials from `https://app.boltroute.ai`, causing `/overview` to show `Unavailable`.
- **How:** Update GitHub Secret `APP_ENV_LOCAL` to set `NEXT_PUBLIC_API_BASE_URL=https://app.boltroute.ai/api`, then trigger a deploy to rebuild the frontend.
- **Status:** Pending verification (this file does not yet contain a final completion log for this sub-step).

### Step 110.1 - Session preflight and state sync (completed)
- **What:** Executed runbook preflight to synchronize repository state before new operations.
- **Why:** Step `110.1` is the mandatory anti-drift gate before fresh production checks and backlog reconciliation.
- **How:** Ran `git push origin main` (no new remote changes), re-read root execution documents (`AGENTS.md`, `handover.md`, `ui-progress.md`, `deployment.md`), and verified a clean working tree with `git status --short --branch` reporting `## main...origin/main`.
- **Where:** `/home/codex/email-verification-fe-v1` (repo root) and root docs listed above.
- **Status:** Complete (`2026-02-08 18:07:42 UTC`).

### Step 110.2 - Production health check gate (completed)
- **What:** Executed full production route/service health gate before pending-task reconciliation.
- **Why:** Step `110.2` is required to confirm post-cutover runtime stability and preserve rollback optionality before any new product work.
- **How:** Ran required checks in strict order at `2026-02-08 18:10:59 UTC`: `dig +short boltroute.ai A` => `135.181.160.203`; `dig +short www.boltroute.ai A` => `boltroute.ai.` then `135.181.160.203`; `curl -I https://boltroute.ai` => `HTTP/2 200`; `curl -I https://www.boltroute.ai` => `HTTP/2 200`; `curl -I https://boltroute.ai/pricing` => `HTTP/2 200`; `curl -I https://boltroute.ai/integrations` => `HTTP/2 200`; `curl -I https://app.boltroute.ai/overview` => `HTTP/2 200`; `systemctl status boltroute-website --no-pager | grep -m1 'Active:'` => `active (running)`.
- **Where:** Public endpoints (`boltroute.ai`, `www.boltroute.ai`, `app.boltroute.ai`) and target host service (`boltroute-website`).
- **Status:** Complete (`2026-02-08 18:10:59 UTC`).

### Step 110.3 - Reconcile pending-task list (completed)
- **What:** Reconciled `ui-progress.md` unchecked checklist items against progress-log completion history.
- **Why:** Step `110.3` is the anti-confusion gate to ensure next product-task selection is based on true pending work.
- **How:** Audited all unchecked tasks and matched them against `Task X - Completed` entries; corrected stale checklist drift by marking Tasks `3` through `8` as completed, and confirmed all remaining unchecked tasks are truly pending.
- **Where:** `ui-progress.md` (Tasks list + Progress log).
- **Status:** Complete (`2026-02-08 18:13:45 UTC`).

### Step 110.4 - Select next true product task (completed)
- **What:** Selected and executed one user-confirmed pending product task: create deployment-structure documentation.
- **Why:** Step `110.4` enforces single-task scope after tracker reconciliation so progress remains traceable and newcomer-safe.
- **How:** Used the reconciled pending list to confirm next work with the user, then completed Task `111` by adding root `structure.md` covering production deploy paths, workflow triggers, secret inputs, and push-to-production sequence for dashboard + website.
- **Where:** `ui-progress.md` (Task `110` + Task `111`), `structure.md`.
- **Status:** Complete (`2026-02-08 18:21:39 UTC`).

### Post-Step-110.4 Task 112 - Terms privacy link fix (completed)
- **What:** Replaced broken Terms-page privacy URL with the valid policy URL.
- **Why:** `https://boltroute.ai/privacy` is broken in production Terms content; legal links must resolve correctly.
- **How:** Updated `apps/website/content/pages/terms.mdx` from `https://boltroute.ai/privacy` to `https://boltroute.ai/privacy-policy`, verified replacement by search, and validated with `source .venv/bin/activate && npm --prefix apps/website run build` (build passed; existing non-blocking lint warnings remained).
- **Where:** `apps/website/content/pages/terms.mdx`.
- **Status:** Complete (`2026-02-08 18:21:40 UTC`).

### Post-Step-110.4 Task 113 - Integrations Catalog Make.com card (completed)
- **What:** Added a `Make.com` integration entry so the dashboard Integrations Catalog now includes a fourth card.
- **Why:** Production Integrations Catalog needed to include `make.com` alongside Zapier, n8n, and Google Sheets.
- **How:** Added dashboard asset `apps/dashboard/public/integrations/make.png`, updated `apps/dashboard/app/lib/integrations-catalog.ts` to append managed `Make.com` option when base trio is present and Make is missing, and added unit coverage in `apps/dashboard/tests/integrations-catalog.test.ts`. Validation passed with env-loaded runs: `npx tsx tests/integrations-catalog.test.ts`, `npm run test:dashboard`, and `npm run build:dashboard`.
- **Where:** `apps/dashboard/app/lib/integrations-catalog.ts`, `apps/dashboard/public/integrations/make.png`, `apps/dashboard/tests/integrations-catalog.test.ts`.
- **Status:** Complete (`2026-02-08 18:34:59 UTC`).

## Open items (required before execution)
- Confirm the current web server (Nginx/Apache/Caddy/other) and how TLS is managed today.
- Confirm downtime tolerance and rollback expectations for the cutover.
- Provide firewall status or confirm any host-level firewall policies (requires root to inspect).
