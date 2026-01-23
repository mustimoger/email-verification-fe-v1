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
- [ ] Step 9 - Deploy to main (cutover)
- [ ] Step 10 - Post-deploy validation

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

### Step 9 - Deploy to main (in progress)
- **What:** Triggered the GitHub Actions deployment on `main`.
- **Why:** Cutover is now handled by the CI/CD workflow.
- **How:** Pushed commit `9152659` to `main` which triggers the deploy workflow.
- **Status:** In progress (awaiting workflow completion).

## Open items (required before execution)
- Confirm the current web server (Nginx/Apache/Caddy/other) and how TLS is managed today.
- Confirm downtime tolerance and rollback expectations for the cutover.
- Provide firewall status or confirm any host-level firewall policies (requires root to inspect).
