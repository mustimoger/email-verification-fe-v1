# BoltRoute Monorepo Operator Guide

## What This Repo Contains
- Dashboard app: `apps/dashboard`
- Public website app: `apps/website`
- Root planning/progress docs: `ui-progress.md`, `handover.md`, `deployment.md`, `AGENTS.md`

## Monorepo Layout
- `apps/dashboard`: authenticated product app + backend API + dashboard deploy script
- `apps/website`: marketing website + content pipeline + website deploy script
- `.github/workflows/deploy.yml`: dashboard CI + deploy workflow
- `.github/workflows/website-ci.yml`: website CI workflow
- `.github/workflows/website-deploy.yml`: website deploy workflow (manual pre-cutover)

## Local Development
- Dashboard dev:
  - `npm run dev:dashboard`
- Website dev:
  - `npm run dev:website`
- Website content watch/build:
  - `npm --prefix apps/website run content:dev`
  - `npm run content:website`

## Test And Build Commands
- Dashboard:
  - Tests: `npm run test:dashboard`
  - Build: `npm run build:dashboard`
  - Backend tests directly: `source .venv/bin/activate && cd apps/dashboard && pytest backend/tests`
- Website:
  - Lint: `npm run lint:website`
  - Build: `npm run build:website`
  - CI-equivalent local check:
    - `source .venv/bin/activate && cd apps/website && npm ci --include=dev && npm run lint && npm run build`

## CI Workflows
- Dashboard deploy (`.github/workflows/deploy.yml`)
  - Trigger: `push` to `main` when `apps/dashboard/**` or workflow file changes
  - Stages: dashboard tests (frontend + backend), then deploy to `/var/www/boltroute-app`
- Website CI (`.github/workflows/website-ci.yml`)
  - Trigger: `push` and `pull_request` when `apps/website/**` or workflow file changes
  - Stages: `npm ci`, `npm run lint`, `npm run build` in `apps/website`
- Website deploy (`.github/workflows/website-deploy.yml`)
  - Trigger: `push` to `main` for `apps/website/**` and manual `workflow_dispatch`
  - Stages: website checks, then deploy to `/var/www/boltroute-website`

## Deployment Ownership And Current State
- Dashboard deployment:
  - Status: active production path
  - Host/domain: `app.boltroute.ai`
  - Workflow: `.github/workflows/deploy.yml`
- Website deployment:
  - Status: deploy automation active with automatic deploy on `main` website changes + manual trigger
  - Release root: `/var/www/boltroute-website`
  - Service target: `boltroute-website`
  - Workflow: `.github/workflows/website-deploy.yml`
  - Domain cutover (`boltroute.ai`, `www.boltroute.ai`) is pending; WordPress remains live until cutover execution.

## Required Secrets (GitHub Actions)
- Shared deploy access:
  - `DEPLOY_HOST`
  - `DEPLOY_USER`
  - `DEPLOY_SSH_KEY`
- Dashboard deploy:
  - `APP_ENV_LOCAL`
  - `BACKEND_ENV`
- Website deploy:
  - `WEBSITE_APP_ENV_LOCAL`

## Operator Notes
- Activate Python venv before running Python tests/scripts:
  - `source .venv/bin/activate`
- Keep tracking docs updated before and after each task:
  - `ui-progress.md`
  - `deployment.md`
  - `handover.md`
