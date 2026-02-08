# Monorepo Deployment Structure (Beginner-Friendly)

This repo has two apps:

- `apps/dashboard` -> product dashboard (`https://app.boltroute.ai`)
- `apps/website` -> public marketing site (`https://boltroute.ai`, `https://www.boltroute.ai`)

This file explains only deployment and release flow.

## 1) Production setup in simple terms

Both apps are deployed from GitHub Actions to the server over SSH.

- Dashboard release path: `/var/www/boltroute-app`
- Website release path: `/var/www/boltroute-website`

Each deployment creates a timestamped release folder:

- Example: `/var/www/boltroute-app/releases/20260208183000`

After build succeeds, the `current` symlink is moved to that new release, then the related systemd service is restarted.

Services:

- Dashboard frontend service: `boltroute-frontend`
- Dashboard backend service: `boltroute-backend`
- Website service: `boltroute-website`

## 2) Which GitHub workflow deploys what

### Dashboard deploy

- Workflow: `.github/workflows/deploy.yml`
- Triggers:
  - push to `main` when files change in `apps/dashboard/**`
  - push to `main` when `.github/workflows/deploy.yml` changes
- Pipeline:
  - run dashboard frontend tests
  - run dashboard backend tests
  - deploy only if tests pass

### Website deploy

- Workflow: `.github/workflows/website-deploy.yml`
- Triggers:
  - push to `main` when files change in `apps/website/**`
  - push to `main` when `.github/workflows/website-deploy.yml` changes
  - manual run with `workflow_dispatch`
- Pipeline:
  - run website checks (lint + build)
  - deploy only if checks pass

### Website CI (quality check only, no deploy)

- Workflow: `.github/workflows/website-ci.yml`
- Trigger: push/PR for `apps/website/**`
- Purpose: quick validation (install, lint, build)

## 3) How a code change reaches production

1. You commit and push to `main`.
2. Path filters decide which workflow starts:
   - changed `apps/dashboard/**` -> dashboard deploy workflow runs
   - changed `apps/website/**` -> website deploy workflow runs
3. CI checks/tests run first.
4. If checks pass, deploy job connects to server via SSH.
5. Deploy job uploads env file(s) from GitHub Secrets.
6. Deploy job syncs code into a new release folder.
7. Remote deploy script builds app, updates `current` symlink, restarts service(s).
8. Traffic serves the new release.

If both app folders change in one push, both deploy workflows can run independently.

## 4) Where environment values come from

GitHub Actions secrets (not committed in repo):

- Shared deploy access:
  - `DEPLOY_HOST`
  - `DEPLOY_USER`
  - `DEPLOY_SSH_KEY`
- Dashboard env:
  - `APP_ENV_LOCAL`
  - `BACKEND_ENV`
- Website env:
  - `WEBSITE_APP_ENV_LOCAL`

These are written on the server to `shared` env files during deploy.

## 5) Important files to know

- Dashboard deploy workflow: `.github/workflows/deploy.yml`
- Website deploy workflow: `.github/workflows/website-deploy.yml`
- Website CI workflow: `.github/workflows/website-ci.yml`
- Dashboard remote deploy script: `apps/dashboard/deploy/remote-deploy.sh`
- Website remote deploy script: `apps/website/deploy/remote-deploy.sh`
- Operational state tracking: `deployment.md`, `handover.md`, `ui-progress.md`

## 6) Quick rule of thumb

- Change dashboard code -> push to `main` -> dashboard workflow deploys.
- Change website code -> push to `main` -> website workflow deploys.
- Need a website redeploy without new commit -> run `Website Deploy` manually (`workflow_dispatch`).
