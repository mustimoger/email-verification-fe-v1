# Handover: Monorepo State And Next Actions

## 0) Execution Status (Updated February 8, 2026)

### What
- Step 1 completed: production dashboard deploy after monorepo move was verified green and endpoints were healthy.
- Step 2 completed: website deploy contract is locked in `deployment.md` (Option A host/user reuse, release root, service, env path, trigger policy).
- Step 3 completed: website deploy automation is implemented.
  - Workflow: `.github/workflows/website-deploy.yml` (manual `workflow_dispatch` pre-cutover)
  - Script: `apps/website/deploy/remote-deploy.sh`
- Step 4 completed: root monorepo runbook added as `README.md`.
- Step 5 started: pending product-task work resumed.
  - Task 65 completed: `artifacts/marketing/README.md` added.
  - Task 66 completed: marketing mock artifacts validated for internal consistency.

### Why
- The original Step 1–4 migration/deploy plan is now executed; continuation should focus on remaining pending product tasks and operational cutover work.

### How
- Follow `ui-progress.md` for active/pending product tasks (single-task execution, validate, update tracker, ask confirmation).
- Use `deployment.md` for website deploy/cutover operational details.

### Where
- Tracker: `ui-progress.md`
- Deploy contract/status: `deployment.md`
- Operator runbook: `README.md`

## 1) Current State (What Exists Now)

### What
- Repo is now a monorepo with two apps:
  - Dashboard app: `apps/dashboard`
  - Public website app: `apps/website`
- Root docs/progress files remain at repo root (`ui-progress.md`, `deployment.md`, `design-principles.md`, `email-notification.md`, `AGENTS.md`).
- Root helper scripts now proxy app commands through npm prefix.

### Why
- This completed the agreed phased migration:
  - Step 1: import website app
  - Step 2: move dashboard app

### How (already done)
- Dashboard moved with history-preserving file moves into `apps/dashboard`.
- Website imported as source/config/assets into `apps/website`.
- Dashboard deploy workflow updated to target `apps/dashboard`.
- Website CI workflow added for lint/build checks.

### Where
- Dashboard deploy workflow: `.github/workflows/deploy.yml`
- Website CI workflow: `.github/workflows/website-ci.yml`
- Dashboard deploy script: `apps/dashboard/deploy/remote-deploy.sh`
- Root npm scripts: `package.json`
- Progress tracker: `ui-progress.md`

## 2) Last Confirmed Commits

### What
- `fb7a33d` - Step 1 baseline import (`apps/website`)
- `018aca6` - Step 2 move (`apps/dashboard`) + CI split

### Why
- These are the migration anchor points for rollback/debug.

### Where
- `git log --oneline -n 10`

## 3) Validation Already Run

### What
- Dashboard tests/build passed from new location.
- Dashboard backend smoke test passed from new location.
- Website CI-equivalent install/lint/build passed locally (with pre-existing warnings).
- Marketing mock artifact totals were validated for cross-file consistency (`overview`, `history`, `api_usage`).

### Why
- Confirms migration is functionally stable before further changes.

### How
- Dashboard:
  - `source .venv/bin/activate`
  - `npm run test:dashboard`
  - `npm run build:dashboard`
  - `cd apps/dashboard && pytest backend/tests/test_settings.py`
- Website:
  - `source .venv/bin/activate`
  - `npm --prefix apps/website ci`
  - `npm --prefix apps/website run lint`
  - `npm --prefix apps/website run build`
- Marketing artifacts:
  - `node` consistency checks across:
    - `artifacts/marketing/mock_overview.json`
    - `artifacts/marketing/mock_history.json`
    - `artifacts/marketing/mock_api_usage.json`
  - Verified:
    - Completed history totals match overview totals (`17700`, `13400`, `3000`, `1300`)
    - API totals match per-series and per-purpose sums (`9480`)

### Where
- Root scripts: `package.json`
- Dashboard tests: `apps/dashboard/tests/`
- Backend tests: `apps/dashboard/backend/tests/`

## 4) Known Gaps (Not Implemented Yet)

### What
- Website deploy automation exists, but no manual website production deploy run has been executed yet.
- Website server-side service/proxy provisioning and domain cutover are not executed yet (`boltroute.ai` / `www.boltroute.ai` still on WordPress host).
- Several historical UI/data tasks remain pending in `ui-progress.md` (including 68/69/71/73/75/77 and older pending items).

### Why
- Migration/deploy enablement scope focused on structure + automation first; operational cutover and older product backlog tasks remain.

### Where
- Pending task list: `ui-progress.md` under `## Tasks`

## 5) Next Actions (Strict Order, Step-by-Step)

## Step 1: Confirm production dashboard deploy status after monorepo move

### What
- Verify the `Deploy` workflow for commit `018aca6` succeeded and dashboard is healthy.

### Why
- Migration changed deploy source paths; production confirmation is mandatory.

### How
1. Check latest runs for `.github/workflows/deploy.yml`.
2. Verify deploy run for/after `018aca6` is green.
3. Run smoke checks against production endpoints:
   - `https://app.boltroute.ai/`
   - `https://app.boltroute.ai/overview`
   - `https://app.boltroute.ai/pricing/embed`

### Where
- Workflow file: `.github/workflows/deploy.yml`
- Dashboard runtime code: `apps/dashboard/`

## Step 2: Define website deployment contract (required inputs)

### What
- Lock exact website deploy target settings before writing deploy automation.

### Why
- Cannot implement reliable deploy without destination/runtime contract.

### How
- Collect and document:
1. Destination host + user (reuse dashboard host or different host).
2. Website release root path on server (example pattern: `/var/www/boltroute-website`).
3. Systemd service name for website process.
4. Reverse proxy/vhost mapping (`boltroute.ai`, `www.boltroute.ai`) and upstream port.
5. Required env file location and required env keys for website.
6. Whether website should auto-deploy on `main` push or manual dispatch.

### Where
- Add this contract to: `deployment.md` (or a new root deployment runbook section).

## Step 3: Implement website production deploy workflow (after Step 2 inputs are locked)

### What
- Add website deploy workflow separate from dashboard workflow.

### Why
- Website and dashboard must deploy independently.

### How
1. Create `apps/website/deploy/remote-deploy.sh` (website-specific build/release/restart logic).
2. Create `.github/workflows/website-deploy.yml`:
   - Trigger: `push` to `main` with path filter `apps/website/**`
   - CI stage: `npm ci`, `npm run lint`, `npm run build` in `apps/website`
   - Deploy stage: rsync only `apps/website/` to website release dir, run remote script, restart website service.
3. Add secret names for website env/deploy host in workflow.

### Where
- New script path: `apps/website/deploy/remote-deploy.sh`
- New workflow path: `.github/workflows/website-deploy.yml`

## Step 4: Add monorepo operator README (required for next sessions)

### What
- Add root runbook explaining day-to-day commands and path ownership.

### Why
- Prevent confusion in future sessions and reduce wrong-path edits.

### How
- Create root `README.md` with:
1. Monorepo layout (`apps/dashboard`, `apps/website`).
2. Local dev commands.
3. Test/build commands per app.
4. CI workflows and what triggers each.
5. Deploy ownership (dashboard deploy active; website deploy pending until implemented).

### Where
- New file: `README.md` (repo root)

## Step 5: Resume previously pending product tasks (only after deploy stability)

### What
- Continue existing pending UI/data tasks from `ui-progress.md`.

### Why
- These were paused while monorepo migration was completed.

### How
- Pick one pending task at a time, following AGENTS rules:
1. Add task/update in `ui-progress.md` before code changes.
2. Implement MVP.
3. Validate with unit/integration tests.
4. Update `ui-progress.md` completion log.
5. Ask user confirmation before next task.

### Where
- Tracker: `ui-progress.md`

## 6) Non-Negotiable Process Rules For Next Session

### What
- Rules from `AGENTS.md` that must be followed each turn.

### Why
- Prevent process drift and lost context.

### How
1. Push `main` at conversation start and before major changes.
2. Add/update tasks in root progress markdown before implementation.
3. Update progress markdown after each completed step with what/why/how.
4. Activate python venv before tests/scripts: `source .venv/bin/activate`.
5. Ask for confirmation before starting the next task step (except markdown updates do not require pre-confirmation).

### Where
- Source of truth: `AGENTS.md`
