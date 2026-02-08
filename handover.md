# Handover: Dashboard + Website Integration (Cutover Stage)

## 0) Snapshot (Updated 2026-02-08 17:33:29 UTC)

### What
- Monorepo apps are in place:
  - Dashboard: `apps/dashboard` (production: `https://app.boltroute.ai`)
  - Website: `apps/website` (target production: `https://boltroute.ai`, `https://www.boltroute.ai`)
- Task sequence is at `ui-progress.md` Task `99.6`; sub-steps `99.6.1` through `99.6.4` are completed successfully.

### Why
- Previous blockers (filesystem, systemd service, secret, deploy rerun, smoke checks) are resolved.
- DNS + reverse proxy cutover is completed and validated.

### How
- Keep Task `99.6` state as completed; rollback remains available only for future regression handling.

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

## C) DNS/public status evidence (post-cutover)

### What
- `boltroute.ai` and `www.boltroute.ai` are cut over to the website host.

### Why
- Confirms public cutover is active and serving from the new host.

### How
- DNS snapshot (`2026-02-08 17:33:29 UTC`):
  - `dig +short boltroute.ai A` => `135.181.160.203`
  - `dig +short www.boltroute.ai A` => `boltroute.ai.` then `135.181.160.203`
  - authoritative check: `dig @saanvi.ns.cloudflare.com +short boltroute.ai A` => `135.181.160.203`
  - authoritative check: `dig @alaric.ns.cloudflare.com +short boltroute.ai A` => `135.181.160.203`
  - authoritative check: `dig @saanvi.ns.cloudflare.com +short www.boltroute.ai CNAME` => `boltroute.ai.`
  - `dig +short app.boltroute.ai A` => `135.181.160.203`
- Public response snapshot (`2026-02-08 17:33:29 UTC`):
  - `curl -I https://boltroute.ai` => `HTTP/2 200`
  - `curl -I https://www.boltroute.ai` => `HTTP/2 200`
  - `curl -I https://boltroute.ai/pricing` => `HTTP/2 200`
  - `curl -I https://boltroute.ai/integrations` => `HTTP/2 200`

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
  - `99.6.1` pre-cutover baseline capture
  - `99.6.2` proxy vhost configuration/verification
  - `99.6.3` DNS cutover
  - `99.6.4` post-cutover validation
- Conditional not triggered:
  - `99.6.5` rollback (not required, validation passed)

### Why
- Next session must not repeat completed steps.

### How
- Treat Task `99.6` as completed; execute rollback instructions only if a new regression appears.

### Where
- Status source of truth: `ui-progress.md`

---

## 4) Next Actions (Strict Order, Post-Cutover)

## Step 100.1 - Persist website vhost config on disk

### What
- Persist the active website reverse-proxy block into `/etc/caddy/Caddyfile`.

### Why
- Current routing is known healthy, but persistence currently depends on runtime-loaded config.

### How
1. Back up `/etc/caddy/Caddyfile`.
2. Add a persistent host block for `boltroute.ai, www.boltroute.ai` to `reverse_proxy 127.0.0.1:3002`.
3. Run `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`.
4. Run `caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile`.

### Where
- Target host (`/etc/caddy/Caddyfile`)

### Status
- Completed (`2026-02-08 17:52:06 UTC`) via root-assisted execution.
- Earlier blocked attempt (`2026-02-08 17:47:49 UTC`):
  - Backup created: `/tmp/Caddyfile.backup.20260208T174749Z`
  - Candidate created: `/tmp/Caddyfile.step1001.20260208T174749Z` with `boltroute.ai, www.boltroute.ai` -> `reverse_proxy 127.0.0.1:3002`
  - `caddy validate --config /tmp/Caddyfile.step1001.20260208T174749Z --adapter caddyfile` => `Valid configuration`
  - `caddy reload --config /tmp/Caddyfile.step1001.20260208T174749Z --adapter caddyfile` => success
  - Final persist attempt: `cp /tmp/Caddyfile.step1001.20260208T174749Z /etc/caddy/Caddyfile` => `Permission denied`
- Final completion evidence (`2026-02-08 17:52:06 UTC`):
  - Operator executed root write to `/etc/caddy/Caddyfile` and reloaded Caddy.
  - `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` => `Valid configuration`
  - `caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile` => success
  - Formatting hardening (`2026-02-08 17:54:22 UTC`): `caddy fmt --overwrite /etc/caddy/Caddyfile` + validate + reload completed successfully.

## Step 100.2 - Re-run post-persistence smoke checks

### What
- Re-validate public website routes, dashboard non-regression, and local service health after Step `100.1`.

### Why
- Confirms persisted config behaves exactly like the validated runtime state.

### How
1. `dig +short boltroute.ai A`
2. `dig +short www.boltroute.ai A`
3. `curl -I https://boltroute.ai`
4. `curl -I https://www.boltroute.ai`
5. `curl -I https://boltroute.ai/pricing`
6. `curl -I https://boltroute.ai/integrations`
7. `curl -I https://app.boltroute.ai/overview`
8. `systemctl status boltroute-website --no-pager | grep -m1 'Active:'`

### Where
- Any internet-connected terminal + target host shell

### Status
- Completed (`2026-02-08 17:52:35 UTC`) after persisted on-disk config:
  - Persist check: `grep -n '^boltroute.ai, www.boltroute.ai {' /etc/caddy/Caddyfile` => line `30`
  - `dig +short boltroute.ai A` => `135.181.160.203`
  - `dig +short www.boltroute.ai A` => `boltroute.ai.` then `135.181.160.203`
  - `curl -I https://boltroute.ai` => `HTTP/2 200`
  - `curl -I https://www.boltroute.ai` => `HTTP/2 200`
  - `curl -I https://boltroute.ai/pricing` => `HTTP/2 200`
  - `curl -I https://boltroute.ai/integrations` => `HTTP/2 200`
  - `curl -I https://app.boltroute.ai/overview` => `HTTP/2 200`
  - `systemctl status boltroute-website --no-pager` => `active (running)`
- Operator rerun (`2026-02-08 17:53:35 UTC`) confirmed the same healthy route + DNS outputs and the same persisted host-block line `30`.
- Command portability note:
  - Target host does not have `rg`; use `grep -m1 'Active:'` for service-status extraction.

## Step 100.3 - Keep rollback readiness active

### What
- Keep rollback playbook available for production regressions.

### Why
- Post-cutover risk moves from migration execution to ongoing production stability.

### How
1. If regression is detected, revert `boltroute.ai` and `www.boltroute.ai` DNS back to `192.248.184.194`.
2. Revert proxy changes only if they are part of the regression.
3. Re-run website + dashboard smoke checks.
4. Record the exact failing check and timestamp.

### Where
- DNS provider + target host

### Status
- Standby (execute only on failure).

## Step 100.4 - Decide website deploy trigger policy after cutover

### What
- Lock and implement the post-cutover website deploy trigger policy.

### Why
- Post-cutover operations must avoid ambiguous release behavior.

### How
1. Keep manual deploy support (`workflow_dispatch`) for controlled releases.
2. Add automatic deploy on `push` to `main` for `apps/website/**`.
3. Include `.github/workflows/website-deploy.yml` in path filters so trigger-policy updates self-validate through deploy pipeline.
4. Update root docs to reflect the locked policy.

### Where
- GitHub Actions workflow and root markdown docs

### Status
- Completed (`2026-02-08`):
  - Decision: enable auto deploy on `push` to `main` for website changes while retaining manual `workflow_dispatch`.
  - Implementation: `.github/workflows/website-deploy.yml` now includes:
    - `push.branches: [main]`
    - `push.paths: ["apps/website/**", ".github/workflows/website-deploy.yml"]`

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
- Resume from post-cutover state; Task `99.6` is completed.

### Why
- DNS + proxy cutover and post-cutover validations are complete.

### How
1. `git push origin main` at session start.
2. Re-read `AGENTS.md`, this `handover.md`, and `ui-progress.md`.
3. Monitor production routes (`boltroute.ai`, `www`, and `app`) and keep Step `100.3` rollback guard active.
4. Continue with the next prioritized product task from `ui-progress.md`.

### Where
- Repo: `/home/codex/email-verification-fe-v1`
- Active state: Task `99.6` completed (rollback playbook remains available)
