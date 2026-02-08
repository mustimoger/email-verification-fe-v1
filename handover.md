# Handover: Dashboard + Website Integration (Cutover Stage)

## 0) Snapshot (Updated 2026-02-08 17:10:11 UTC)

### What
- Monorepo apps are in place:
  - Dashboard: `apps/dashboard` (production: `https://app.boltroute.ai`)
  - Website: `apps/website` (target production: `https://boltroute.ai`, `https://www.boltroute.ai`)
- Task sequence is at `ui-progress.md` Task `99.6` (cutover pending approval).

### Why
- Previous blockers (filesystem, systemd service, secret, deploy rerun, smoke checks) are resolved.
- Remaining work is DNS + reverse proxy cutover only.

### How
- Continue strictly from Task `99.6` and do not re-run completed setup tasks unless rollback/recovery requires it.

### Where
- Primary tracker: `ui-progress.md`
- Deploy contract and status: `deployment.md`
- This continuation runbook: `handover.md`

---

## 1) Locked Decisions (Do Not Re-Decide)

### What
- Deployment contract is locked to reuse dashboard host/user (Option A).
- Website service contract is locked.

### Why
- Workflows/scripts and host provisioning were built against these values.

### How
- Locked values:
  - Deploy host/user: `DEPLOY_HOST` + `DEPLOY_USER`
  - Website root: `/var/www/boltroute-website`
  - Website env file: `/var/www/boltroute-website/shared/.env.local`
  - Website service: `boltroute-website`
  - Website upstream: `127.0.0.1:3002`
  - Deploy workflow: `.github/workflows/website-deploy.yml` (manual pre-cutover)

### Where
- Contract details are also reflected in `deployment.md`.

---

## 2) Verified Current State (Evidence)

## A) Workflow evidence

### What
- Historical failing run exists, and remediation rerun succeeded.

### Why
- Confirms deploy pipeline now works end-to-end after prerequisite fixes.

### How
- Failed run:
  - Run ID: `21801362879`
  - URL: `https://github.com/mustimoger/email-verification-fe-v1/actions/runs/21801362879`
  - Failure: `Create release directory` (`Permission denied`)
- Successful rerun:
  - Run ID: `21801917773`
  - URL: `https://github.com/mustimoger/email-verification-fe-v1/actions/runs/21801917773`
  - Status: `completed` / `success`
  - Jobs: `website-checks` = success, `deploy` = success
  - Critical deploy steps succeeded: `Create release directory`, `Upload env file`, `Sync release`, `Deploy release`

### Where
- GitHub Actions workflow: `.github/workflows/website-deploy.yml`

## B) Host/runtime evidence

### What
- Website runtime is active on the target upstream and serving pages.

### Why
- Confirms cutover target is healthy before DNS switch.

### How
- Service: `systemctl status boltroute-website` => `active (running)`
- Listener: `ss -ltn` includes `127.0.0.1:3002`
- Local route checks:
  - `curl -I http://127.0.0.1:3002/` => `200`
  - `curl -I http://127.0.0.1:3002/pricing` => `200`
  - `curl -I http://127.0.0.1:3002/integrations` => `200`
- Dashboard unaffected:
  - `curl -I https://app.boltroute.ai/` => `307` to `/overview`
  - `curl -I https://app.boltroute.ai/overview` => `200`
  - `curl -I https://app.boltroute.ai/pricing/embed` => `200`

### Where
- Target host runtime (`boltroute-website` service)
- Public dashboard domain (`app.boltroute.ai`)

## C) DNS/public status evidence (pre-cutover)

### What
- `boltroute.ai` is still on WordPress host (expected before cutover).

### Why
- Confirms public cutover has not started yet.

### How
- DNS snapshot:
  - `dig +short boltroute.ai A` => `192.248.184.194`
  - `dig +short www.boltroute.ai A` => `192.248.184.194`
  - `dig +short app.boltroute.ai A` => `135.181.160.203`
- Public response snapshot:
  - `https://boltroute.ai` returns WordPress/nginx response (`wp-json` link present)
  - `https://www.boltroute.ai` currently has certificate hostname mismatch

### Where
- DNS provider zone records
- Public endpoints: `https://boltroute.ai`, `https://www.boltroute.ai`

---

## 3) Completion Matrix (Task 99)

### What
- Completed sub-steps:
  - `99.1` filesystem permissions
  - `99.2` systemd service provisioning
  - `99.3` secret configuration
  - `99.4` deploy rerun success
  - `99.5` pre-cutover smoke checks
- Pending:
  - `99.6` DNS + proxy cutover

### Why
- Next session must not repeat completed steps.

### How
- Treat `99.6` as the only active step unless rollback/recovery is triggered.

### Where
- Status source of truth: `ui-progress.md`

---

## 4) Next Actions (Strict Order)

## Step 99.6.1 - Pre-cutover baseline capture

### What
- Capture immediate pre-change state for rollback confidence.

### Why
- Provides concrete rollback target values and post-change comparison.

### How
1. Record DNS:
   - `dig +short boltroute.ai A`
   - `dig +short www.boltroute.ai A`
2. Record current public headers:
   - `curl -I https://boltroute.ai`
   - `curl -I https://www.boltroute.ai`
3. Record target host health:
   - `systemctl status boltroute-website --no-pager`
   - `curl -I http://127.0.0.1:3002/`

### Where
- DNS provider + target host terminal

## Step 99.6.2 - Configure/verify proxy vhosts for website domains

### What
- Ensure target host reverse proxy routes both domains to `127.0.0.1:3002`.

### Why
- DNS cutover without correct vhost routing will break the site.

### How
1. On target host, update proxy config for:
   - `boltroute.ai`
   - `www.boltroute.ai`
2. Route both to `127.0.0.1:3002`.
3. Reload proxy and verify config syntax.
4. Verify TLS issuance/renewal status for both hostnames.

### Where
- Target host reverse proxy configuration (`/etc/caddy/Caddyfile` if Caddy is used)
- Target host certificate storage/logs

## Step 99.6.3 - Execute DNS cutover

### What
- Point `boltroute.ai` and `www.boltroute.ai` to the website host.

### Why
- This switches public traffic from WordPress to the deployed Next.js website.

### How
1. Update DNS A (and AAAA if used) for:
   - `boltroute.ai`
   - `www.boltroute.ai`
2. Set to website target host IP (`135.181.160.203` unless infrastructure owner specifies otherwise at cutover time).
3. Save/confirm change in DNS provider UI.

### Where
- DNS provider control panel

## Step 99.6.4 - Post-cutover validation

### What
- Validate website public routing + TLS + unaffected dashboard.

### Why
- Cutover is only complete when end-user routes are healthy.

### How
1. Check DNS propagation:
   - `dig +short boltroute.ai A`
   - `dig +short www.boltroute.ai A`
2. Check public response codes:
   - `curl -I https://boltroute.ai`
   - `curl -I https://www.boltroute.ai`
   - `curl -I https://boltroute.ai/pricing`
   - `curl -I https://boltroute.ai/integrations`
3. Verify dashboard remains healthy:
   - `curl -I https://app.boltroute.ai/overview`
4. Verify local service still healthy:
   - `systemctl status boltroute-website --no-pager`

### Where
- Any terminal with internet access + target host terminal

## Step 99.6.5 - Rollback (only if validation fails)

### What
- Restore WordPress DNS target and previous proxy behavior.

### Why
- Minimize outage if cutover health criteria fail.

### How
1. Revert DNS A records for `boltroute.ai` and `www.boltroute.ai` back to pre-cutover target (`192.248.184.194`).
2. Revert proxy changes if they introduced routing/TLS errors.
3. Re-validate public site behavior and dashboard health.
4. Document exact failed check and stop further changes.

### Where
- DNS provider + target host proxy config

---

## 5) Mandatory Documentation After Each Step

### What
- Update root documentation after every completed sub-step.

### Why
- Prevent state loss between Codex sessions.

### How
1. Update `ui-progress.md`:
   - status checkbox
   - progress log with `What / Why / How / Not implemented yet` (if any)
2. Update `deployment.md` with current deployment/cutover state.
3. Update `handover.md` with next strict step and latest evidence.
4. Commit and push `main`.
5. Ask user confirmation before starting next step.

### Where
- Root markdown files:
  - `ui-progress.md`
  - `deployment.md`
  - `handover.md`

---

## 6) Immediate Resume Point For Next Codex Session

### What
- Resume from Task `99.6` only.

### Why
- All prerequisites and pre-cutover checks are complete.

### How
1. `git push origin main` at session start.
2. Re-read `AGENTS.md`, this `handover.md`, and `ui-progress.md`.
3. Execute Step `99.6.1` through `99.6.4` in order.
4. If any validation fails, execute `99.6.5` rollback.
5. Update root trackers + push after each completion.

### Where
- Repo: `/home/codex/email-verification-fe-v1`
- Active task: `ui-progress.md` Task `99.6`
