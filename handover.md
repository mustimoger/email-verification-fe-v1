# Handover: Dashboard + Website Integration (Cutover Readiness)

## 0) Scope (Updated February 8, 2026)

### What
- This repo now contains both applications:
  - Dashboard: `apps/dashboard` (live at `app.boltroute.ai`)
  - Public website: `apps/website` (to replace current WordPress site at `boltroute.ai`)
- Website deploy automation exists but cutover is not finished.

### Why
- Next session must continue from the exact cutover-readiness state without repeating completed migration work.

### How
- Use this file as the primary continuation runbook.
- Use `ui-progress.md` for task status and `deployment.md` for deploy contract details.

### Where
- Task tracker: `ui-progress.md`
- Deploy contract/status: `deployment.md`
- Operator commands: `README.md`

---

## 1) Current Confirmed State

### What
- Monorepo migration is complete:
  - Step 1 import complete: website source is under `apps/website`.
  - Step 2 move complete: dashboard moved to `apps/dashboard`.
- Dashboard deploy pipeline is active and healthy.
- Website deploy pipeline is implemented and manually triggerable.
- Marketing mock-data docs/consistency tasks (65, 66) are complete.

### Why
- There is no need to re-run migration steps; effort should focus on pre-cutover provisioning and deploy success.

### How
- Completed artifacts/workflows:
  - Dashboard deploy workflow: `.github/workflows/deploy.yml`
  - Website CI workflow: `.github/workflows/website-ci.yml`
  - Website deploy workflow: `.github/workflows/website-deploy.yml`
  - Website remote deploy script: `apps/website/deploy/remote-deploy.sh`
  - Root monorepo runbook: `README.md`

### Where
- Apps: `apps/dashboard`, `apps/website`
- Workflows: `.github/workflows/`
- Deploy scripts: `apps/dashboard/deploy/`, `apps/website/deploy/`

---

## 2) Locked Decisions (Do Not Re-decide Unless User Changes Them)

### What
- Website deployment contract is locked to **Option A** (reuse dashboard deploy host/user).
- Website deploy is **manual pre-cutover**.

### Why
- These were explicitly confirmed and used to build the workflow/script already in `main`.

### How
- Locked values:
  - Deploy host/user: `DEPLOY_HOST` + `DEPLOY_USER`
  - Website app root: `/var/www/boltroute-website`
  - Website env file path: `/var/www/boltroute-website/shared/.env.local`
  - Website service name: `boltroute-website`
  - Website upstream target: `127.0.0.1:3002`
  - Trigger policy (pre-cutover): `workflow_dispatch`

### Where
- Contract source: `deployment.md` section `Step 2 (Monorepo) - Website deployment contract status`

---

## 3) Verified Evidence (Latest)

### What
- Latest website deploy workflow run exists and failed in deploy stage.
- Failure is infrastructure permissions on target host, not lint/build.

### Why
- Next session should continue on the remaining blockers only (secret + deploy rerun + smoke checks + cutover), since CI checks pass and host prerequisites are now provisioned.

### How
- Run inspected:
  - Workflow run: `21801362879`
  - URL: `https://github.com/mustimoger/email-verification-fe-v1/actions/runs/21801362879`
  - `website-checks` job: success
  - `deploy` job: failure at step `Create release directory`
  - Error: `mkdir: cannot create directory '/var/www/boltroute-website': Permission denied`
- Remediation evidence (`2026-02-08`):
  - Operator created `/var/www/boltroute-website/{releases,shared}` with root privileges.
  - Validation now shows:
    - `/var/www/boltroute-website` -> `drwxr-xr-x boltroute boltroute`
    - `/var/www/boltroute-website/releases` -> `drwxr-xr-x boltroute boltroute`
    - `/var/www/boltroute-website/shared` -> `drwxr-xr-x boltroute boltroute`
  - Deploy-user write test succeeded (`touch` + `rm` in `shared/`).
  - Operator provisioned `boltroute-website.service` and sudoers restart permission for `boltroute`.
  - Validation now shows:
    - `systemctl status boltroute-website` -> `active (running)`
    - `ss -ltn` -> `LISTEN ... 127.0.0.1:3002`
    - `curl -I http://127.0.0.1:3002` -> `HTTP/1.1 200 OK`
  - Operator configured `WEBSITE_APP_ENV_LOCAL`; verification shows `WEBSITE_APP_ENV_LOCAL 2026-02-08T16:58:17Z` in repo secrets.

### Where
- Workflow file: `.github/workflows/website-deploy.yml`
- Failure context recorded in:
  - `ui-progress.md` (Task 98 completed, Task 99 pending)
  - `deployment.md` (website deploy blockers)

---

## 4) Known Open Blockers

### What
- Website deploy workflow has not yet been rerun after host prerequisites were fixed.
- DNS cutover from WordPress host (`boltroute.ai`) to website host is not executed.

### Why
- These prevent successful pre-cutover deployment and production cutover readiness.

### How
- Resolve blockers in strict order under Section 5.

### Where
- Pending task: `ui-progress.md` Task 99
- Operational notes: `deployment.md`

---

## 5) Next Actions (Strict Order, Step-by-Step)

## Step 1: Prepare target host filesystem and permissions (Task 99.1)

### What
- Ensure website release root exists and is writable by deploy user.

### Why
- Current workflow fails before upload because deploy user cannot create `/var/www/boltroute-website`.

### How
1. SSH to target host from `DEPLOY_HOST`.
2. Create required paths:
   - `/var/www/boltroute-website/releases`
   - `/var/www/boltroute-website/shared`
3. Set ownership/permissions so `DEPLOY_USER` can write under `/var/www/boltroute-website`.
4. Verify with a write test as `DEPLOY_USER`.
5. Current status (`2026-02-08`): completed; paths exist and are writable by `DEPLOY_USER` (`boltroute`).

### Where
- Target host filesystem
- Contract path: `/var/www/boltroute-website`

## Step 2: Provision/verify website systemd service (Task 99.2)

### What
- Ensure `boltroute-website` service exists and is configured to run the website from `current` on `127.0.0.1:3002`.

### Why
- Deploy script ends with `sudo systemctl restart boltroute-website`; service must exist and be valid.

### How
1. Create or verify `/etc/systemd/system/boltroute-website.service`.
2. Configure startup from `/var/www/boltroute-website/current`.
3. Bind website runtime to `127.0.0.1:3002`.
4. Reload daemon and test service restart.
5. Confirm service status is `active`.
6. Current status (`2026-02-08`): completed; service is enabled and active on `127.0.0.1:3002`.

### Where
- Target host systemd configuration
- Service name: `boltroute-website`

## Step 3: Add/verify website env secret (Task 99.3)

### What
- Add `WEBSITE_APP_ENV_LOCAL` in GitHub Actions secrets.

### Why
- Workflow step `Upload env file` requires this secret.

### How
1. Add secret in repo settings:
   - Key: `WEBSITE_APP_ENV_LOCAL`
   - Value: website `.env.local` content
2. Include at minimum:
   - `NEXT_PUBLIC_SITE_URL=https://boltroute.ai`
   - or `SITE_URL=https://boltroute.ai`
3. Keep final value aligned with cutover target domain.
4. Current status (`2026-02-08`): completed; `gh secret list` shows `WEBSITE_APP_ENV_LOCAL 2026-02-08T16:58:17Z`.

### Where
- GitHub repo secrets: `mustimoger/email-verification-fe-v1`
- Workflow consumer: `.github/workflows/website-deploy.yml`

## Step 4: Rerun manual website deploy workflow (Task 99.4)

### What
- Re-run `Website Deploy` manually after Steps 1-3.

### Why
- Must confirm deployment works end-to-end before DNS cutover.

### How
1. Trigger workflow:
   - `gh workflow run website-deploy.yml --repo mustimoger/email-verification-fe-v1 --ref main`
2. Monitor run to completion.
3. Record run ID, status, and any failed step.

### Where
- Workflow: `.github/workflows/website-deploy.yml`

## Step 5: Pre-cutover runtime smoke checks (Task 99.5)

### What
- Validate deployed website is serving correctly on target host without public DNS switch.

### Why
- Need confidence in runtime health before replacing WordPress routing.

### How
1. Verify service:
   - `systemctl status boltroute-website`
2. Verify local upstream:
   - `curl -I http://127.0.0.1:3002`
3. Verify essential routes return successful responses (for example `/`, `/pricing`, `/integrations`).
4. Confirm dashboard (`app.boltroute.ai`) remains unaffected.

### Where
- Target host runtime
- Dashboard domain: `https://app.boltroute.ai`

## Step 6: DNS + proxy cutover plan and execution (Task 99.6, when approved)

### What
- Replace WordPress routing for `boltroute.ai` / `www.boltroute.ai` with the new website.

### Why
- Final objective is website live on `boltroute.ai` while dashboard stays on `app.boltroute.ai`.

### How
1. Update DNS records for `boltroute.ai` and `www.boltroute.ai` to target host.
2. Configure reverse proxy vhosts for both domains -> `127.0.0.1:3002`.
3. Verify TLS issuance/renewal for both domains.
4. Run post-cutover smoke checks.
5. Keep rollback plan ready (restore prior DNS target if needed).

### Where
- DNS provider
- Target host reverse proxy config
- Public endpoints: `https://boltroute.ai`, `https://www.boltroute.ai`

---

## 6) Immediate Resume Point For Next Codex Session

### What
- Start at `ui-progress.md` Task 99.

### Why
- All migration/workflow implementation and prerequisite provisioning steps are done; deploy rerun, smoke checks, and cutover remain.

### How
1. Push `main` at session start.
2. Re-read `AGENTS.md`, `handover.md`, `ui-progress.md`.
3. Execute Section 5 Step 4 onward in order (Steps 1-3 are completed).
4. After each completed sub-step:
   - update `ui-progress.md` with What/Why/How
   - update `deployment.md`/`handover.md` if state changed
   - ask for user confirmation before next task step

### Where
- Process rules source: `AGENTS.md`
- Active task: `ui-progress.md` Task 99
