# Handover: Dashboard + Website Integration (Post-Cutover Runbook)

## 0) Snapshot (Updated 2026-02-08 18:34:59 UTC)

### What
- Production domains are live and stable:
  - Dashboard: `https://app.boltroute.ai` (app stack)
  - Website: `https://boltroute.ai` and `https://www.boltroute.ai` (website stack)
- Infrastructure/cutover stream is completed through Step `100.4`.
- Website deploy policy is implemented and validated:
  - Automatic deploy on `push` to `main` for `apps/website/**`
  - Manual deploy retained via `workflow_dispatch`

### Why
- Next session must continue from operational steady-state, not re-run cutover tasks.
- Remaining work is now normal product backlog execution plus ongoing rollback readiness.

### How
- Treat Tasks `99.1` to `99.6.4`, `100.1`, `100.2`, and `100.4` as completed.
- Keep `99.6.5` rollback as standby-only.
- Use `ui-progress.md` for task execution and `deployment.md` for deployment state evidence.

### Where
- Primary task tracker: `ui-progress.md`
- Deployment/ops evidence: `deployment.md`
- Session continuation runbook: `handover.md`

---

## 1) Locked Contract (Do Not Re-Decide)

### What
- Deployment contract values are locked.

### Why
- Workflows, deploy scripts, and host provisioning depend on these exact values.

### How
- Keep these values unchanged unless explicitly requested by the user:
  - Deploy host/user: `DEPLOY_HOST`, `DEPLOY_USER`
  - Website app root: `/var/www/boltroute-website`
  - Website env file: `/var/www/boltroute-website/shared/.env.local`
  - Website service: `boltroute-website`
  - Website upstream: `127.0.0.1:3002`
  - Website deploy workflow: `.github/workflows/website-deploy.yml`
  - Website deploy triggers:
    - `push` on `main` with paths `apps/website/**` and `.github/workflows/website-deploy.yml`
    - manual `workflow_dispatch`

### Where
- `.github/workflows/website-deploy.yml`
- `deployment.md` (contract section)

---

## 2) Verified Evidence Anchors

### What
- Deploy automation and runtime health are validated with concrete evidence.

### Why
- Next session should trust current state and avoid repeating completed infrastructure actions.

### How
- Website deploy workflow evidence:
  - Historical failure: run `21801362879` (`Create release directory` permission denied)
  - Remediated success: run `21801917773`
  - Post-policy auto-trigger success: run `21802721793`
- Runtime and routing evidence:
  - Persisted Caddy host block exists: `/etc/caddy/Caddyfile` line `30` (`boltroute.ai, www.boltroute.ai {`)
  - Website service: `Active: active (running)`
  - Public checks (latest operator verification): all `HTTP/2 200`
    - `https://boltroute.ai`
    - `https://www.boltroute.ai`
    - `https://boltroute.ai/pricing`
    - `https://boltroute.ai/integrations`
    - `https://app.boltroute.ai/overview`
  - DNS checks:
    - `boltroute.ai` -> `135.181.160.203`
    - `www.boltroute.ai` -> `boltroute.ai` -> `135.181.160.203`
  - Caddy formatting hardening completed: `caddy fmt --overwrite /etc/caddy/Caddyfile` then validate/reload.

### Where
- GitHub Actions run URLs
- Target host: `/etc/caddy/Caddyfile`, `systemctl status boltroute-website`
- Public endpoints above

---

## 3) Active Open Items (Only)

## Item A - Rollback readiness (`99.6.5`)

### What
- Keep rollback procedure available but unexecuted.

### Why
- Rollback is only for regressions; running it now would revert a healthy production state.

### How
- If regression appears:
  1. Revert DNS for `boltroute.ai` and `www.boltroute.ai` to `192.248.184.194`.
  2. Revert proxy changes only if they are causally linked.
  3. Re-run website/dashboard smoke checks.
  4. Document exact failure + timestamp in root docs.

### Where
- DNS provider panel
- Target host proxy/service checks
- `ui-progress.md`, `deployment.md`, `handover.md`

## Item B - Backlog execution discipline

### What
- Continue product backlog work one task at a time with explicit user confirmation.

### Why
- Keeps scope controlled and avoids hidden multi-task drift in long-running sessions.

### How
1. List true pending tasks from `ui-progress.md`.
2. Select exactly one task with user confirmation before implementation.
3. Apply MVP-first changes.
4. Update `ui-progress.md`, `deployment.md`, and `handover.md` after completion.
5. Commit and push `main`.

### Where
- `ui-progress.md`, `deployment.md`, `handover.md`

---

## 4) Strict Next Actions (Next Session, In Order)

## Step 110.1 - Session preflight and state sync

### What
- Start with repository and context synchronization.

### Why
- Prevent drift before taking any new action.

### How
1. Run `git push origin main`.
2. Re-read `AGENTS.md`, `handover.md`, `ui-progress.md`, and `deployment.md`.
3. Confirm no unexpected uncommitted changes.

### Where
- Repo root: `/home/codex/email-verification-fe-v1`

## Step 110.2 - Production health check gate

### What
- Validate public routes and service health before starting new product changes.

### Why
- Catch regressions early and preserve rollback optionality.

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
- Internet terminal + target host terminal

## Step 110.3 - Reconcile pending-task list (anti-confusion gate)

### What
- Normalize `ui-progress.md` pending checklist against actual completion history.

### Why
- Next product task selection must be based on true pending work only.

### How
1. Identify all unchecked items in Tasks list.
2. Cross-check each item against progress-log completion entries.
3. Correct checklist states and add newcomer-safe notes (`What/Why/How`).
4. Commit and push corrections.

### Where
- `ui-progress.md`

## Step 110.4 - Select next true product task

### What
- Choose one real pending product task after Step `110.3` reconciliation.

### Why
- Enforces single-task execution with clear boundaries and traceability.

### How
1. Pick one pending task with user confirmation.
2. Add/adjust task status to `In Progress` before coding.
3. Execute MVP-first implementation.
4. Validate with required tests/checks.
5. Update root docs and push.

### Where
- `ui-progress.md` (task selection and logging)
- Affected code paths in repo

## Step 110.5 - Continue steady-state ops posture

### What
- Keep rollback guard active while product work continues.

### Why
- Website/domain integration is production-critical and must remain observable during feature work.

### How
- Re-run Step `110.2` checks after any major deploy or infra-adjacent change.
- Trigger rollback only on validated regression criteria.

### Where
- Public endpoints + target host
- Root docs for evidence capture

---

## 5) Mandatory Documentation Discipline (Do Not Skip)

### What
- Update root docs after each completed step/task.

### Why
- Required for context-window handoff continuity and newcomer clarity.

### How
1. Update `ui-progress.md`:
   - checklist status
   - progress log using `What / Why / How / Not implemented yet`
2. Update `deployment.md` for deployment/runtime state changes.
3. Update `handover.md` strict next step + latest evidence.
4. Commit and push `main`.
5. Ask user confirmation before starting the next task.

### Where
- `ui-progress.md`
- `deployment.md`
- `handover.md`

---

## 6) Immediate Resume Point (One Line)

### What
- Keep Step `110.5` steady-state ops posture, then continue single-task backlog execution.

### Why
- This guarantees state sync, production safety, and backlog clarity.

### How
- Follow Section `4` in exact order.

### Where
- Repo: `/home/codex/email-verification-fe-v1`

---

## 7) Session Execution Log (Latest)

### Step 110.1 - Completed (`2026-02-08 18:07:42 UTC`)

### What
- Completed session preflight and state synchronization.

### Why
- Step `110.1` is mandatory before runtime health checks and stale-task reconciliation.

### How
1. Ran `git push origin main` (result: `Everything up-to-date`).
2. Re-read `AGENTS.md`, `handover.md`, `ui-progress.md`, and `deployment.md`.
3. Confirmed clean repository state with `git status --short --branch` (`## main...origin/main`).

### Where
- Repo root: `/home/codex/email-verification-fe-v1`
- Source-of-truth docs: `AGENTS.md`, `handover.md`, `ui-progress.md`, `deployment.md`

### Next strict step
- Execute Step `110.2` production health check gate, then pause for user confirmation before starting Step `110.3`.

### Step 110.2 - Completed (`2026-02-08 18:10:59 UTC`)

### What
- Completed production health checks for website routes, dashboard route, DNS, and website service state.

### Why
- Step `110.2` is the runtime safety gate before any tracker reconciliation or product-task execution.

### How
1. Ran `dig +short boltroute.ai A` and `dig +short www.boltroute.ai A` (both resolved to `135.181.160.203`, with `www` via `boltroute.ai.`).
2. Ran `curl -I` checks for `https://boltroute.ai`, `https://www.boltroute.ai`, `https://boltroute.ai/pricing`, `https://boltroute.ai/integrations`, and `https://app.boltroute.ai/overview` (all returned `HTTP/2 200`).
3. Ran `systemctl status boltroute-website --no-pager | grep -m1 'Active:'` (reported `active (running)`).

### Where
- Public endpoints: `boltroute.ai`, `www.boltroute.ai`, `app.boltroute.ai`
- Target host service check: `boltroute-website`

### Next strict step
- Execute Step `110.3` stale unchecked-task reconciliation gate, then pause for user confirmation before starting Step `110.4`.

### Step 110.3 - Completed (`2026-02-08 18:13:45 UTC`)

### What
- Reconciled stale unchecked items in `ui-progress.md` against recorded completion history.

### Why
- Step `110.3` is required to ensure Step `110.4` task selection uses a true pending backlog instead of stale checklist drift.

### How
1. Enumerated all unchecked tasks in the checklist and compared them against `Task X - Completed` progress-log entries.
2. Corrected stale mismatches by marking Tasks `3`, `4`, `5`, `6`, `7`, and `8` as checked (they were already completed in logged history).
3. Verified remaining unchecked tasks have no completion entries and are therefore true pending work.

### Where
- Tracker file: `ui-progress.md` (Tasks list + Progress log)

### Next strict step
- Execute Step `110.4` by selecting one true pending product task with user confirmation.

### Step 110.4 - Completed (`2026-02-08 18:21:39 UTC`)

### What
- Selected and completed one true pending product task with user confirmation.

### Why
- This preserves runbook ordering and keeps implementation scope auditable.

### How
1. Listed current pending tasks after Step `110.3` reconciliation.
2. Received user-confirmed selection to create beginner-friendly deployment structure documentation.
3. Added `structure.md` at repo root describing: production targets, workflow triggers, release mechanics, secret flow, and push-to-production path.
4. Updated root trackers to mark Step `110.4` and the selected task complete.

### Where
- `ui-progress.md`, `deployment.md`, `handover.md`, `structure.md`

### Next strict step
- Follow Step `110.5` steady-state ops posture and continue backlog work one confirmed task at a time.

### Post-Step-110.4 Task 112 - Completed (`2026-02-08 18:25:26 UTC`)

### What
- Fixed the broken privacy URL in the Terms page content on the website app.

### Why
- Legal-page links must resolve correctly; `https://boltroute.ai/privacy` was broken and needed to point to the existing Privacy Policy route.

### How
1. Updated `apps/website/content/pages/terms.mdx` to use `https://boltroute.ai/privacy-policy`.
2. Verified the replacement by search.
3. Ran `source .venv/bin/activate && npm --prefix apps/website run build` to confirm site build health.

### Where
- `apps/website/content/pages/terms.mdx`
- `ui-progress.md`, `deployment.md`, `handover.md`

### Next strict step
- Continue single-task backlog execution with user confirmation per Item B and Step `110.5`.

### Post-Step-110.4 Task 113 - Completed (`2026-02-08 18:34:59 UTC`)

### What
- Added `Make.com` as a fourth integration card in the dashboard Integrations Catalog.

### Why
- The integrations catalog in production needed to include `make.com` in addition to Zapier, n8n, and Google Sheets.

### How
1. Added the dashboard public asset `apps/dashboard/public/integrations/make.png`.
2. Updated `apps/dashboard/app/lib/integrations-catalog.ts` to append a managed `Make.com` option when the base trio exists and Make is not already present.
3. Added unit coverage in `apps/dashboard/tests/integrations-catalog.test.ts` for managed Make.com append behavior.
4. Ran validation with env loaded: `npx tsx tests/integrations-catalog.test.ts`, `npm run test:dashboard`, and `npm run build:dashboard`.

### Where
- `apps/dashboard/public/integrations/make.png`
- `apps/dashboard/app/lib/integrations-catalog.ts`
- `apps/dashboard/tests/integrations-catalog.test.ts`
- `ui-progress.md`, `deployment.md`, `handover.md`

### Next strict step
- Continue single-task backlog execution with user confirmation per Item B and Step `110.5`.
