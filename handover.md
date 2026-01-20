# Handover: `/history-v2` Redesign + Wiring

Last updated: 2026-01-19

## Context
- Dashboard pages share `DashboardShell` (`app/components/dashboard-shell.tsx`).
- Visual benchmark and token spec: `/pricing-v2` (`design-principles.md`).
- Latest plan progress: `new-design.md`; `PLAN.md` is a pointer.
- `/history-v2` was introduced as a non-disruptive redesign target (keep `/history` intact).

## What changed in this session
### 1) `/history-v2` UI redesign (pricing-v2 visual system)
- Added a new route with pricing-v2 surfaces and tokens:
  - `app/history-v2/page.tsx`
  - `app/history-v2/history-v2-client.tsx`
  - `app/history-v2/history-v2-sections.tsx`
  - `app/history-v2/history-v2.module.css`
- Hero card includes history-specific messaging and CTAs (Start verification + View API).
- Section cards match the pricing-v2 surface hierarchy and radius map.

### 2) `/history-v2` functional migration
- Reused the existing history data pipeline from `/history`:
  - `apiClient.listTasks`, `apiClient.getTask`, `apiClient.downloadTaskResults`
  - `mapTaskToHistoryRow`, `mapDetailToHistoryRow`, and `HistoryCacheEntry` from `app/history/utils.ts`
- Added client-side filter tabs (All/Completed/Processing/Failed) that filter loaded rows only; no API query changes.
- Wired refresh, pagination, and download actions into the redesigned table and mobile cards.
- Snapshot/exports card now renders live counts when history exists, otherwise shows the empty-state message.

### 3) Visual audit + QA artifacts
- Visual audit (history vs pricing-v2) captured:
  - `artifacts/history-auth.png`
  - `artifacts/pricing-v2-auth.png`
- Responsive QA for `/history-v2` captured:
  - `artifacts/history-v2-desktop-light.png`
  - `artifacts/history-v2-desktop-dark.png`
  - `artifacts/history-v2-mobile-light.png`
  - `artifacts/history-v2-mobile-dark.png`
- Console notes during QA:
  - `409 Conflict` from `/api/credits/signup-bonus` with `auth.signup_bonus.failed` warning (“Signup bonus eligibility window elapsed”).
  - `auth.trial_bonus.result` logged as duplicate (credits already granted).

### 4) Plan updates
- `new-design.md` updated with D4h/D4i/D4j/D4k completion notes and artifacts.

### 5) Tests
- `npm run test:history`

## Current state / pending items
### D5a: Investigate signup bonus 409 warning
- Pending. Backend may need to downgrade/suppress duplicate signup bonus warnings.

### D5b: Confirm credits balance availability
- Pending. Credits Remaining card can be unavailable; check `/api/overview` and `/credits/balance` for the QA account.

### D7: Repo hygiene for QA auth artifacts
- Decision still needed on whether to delete tracked `.auth-session.json` and `.playwright-visual-check.js`.
- Both files are currently tracked and contain session tokens; remove from git if not needed.

## Local-only or uncommitted items (do not commit unless asked)
- `key-value-pair.txt` (refreshed auth token) — now ignored.
- `artifacts/` and `.qa/` — now ignored.
- `app/components/dashboard-shell2.tsx` — untracked reference implementation.
- `app/history-v2/` — untracked new files (needs staging once approved).
- `new-design.md` and `PLAN.md` were updated after the last commit (check `git status`).
Note:
- `key-value-pair.txt` is still tracked in git; `.gitignore` will only take effect after untracking (e.g., `git rm --cached key-value-pair.txt`).

## QA / auth seeding notes
- For QA, create a localStorage seed from `key-value-pair.txt` (use the new token values).
- `DashboardShell` collapse state stored under `dashboard.sidebar.collapsed`.
- Theme state controlled by `theme-preference` localStorage plus `data-theme`/`data-theme-preference` attributes.

## Known issues
- External API signup bonus endpoint returns 409 for repeated attempts; logs appear in console.
- External API task creation can return 500 upstream (RabbitMQ publish failure) — noted in previous handover.

## Next steps for the next session
1) Decide whether to remove tracked auth artifacts (`.auth-session.json`, `.playwright-visual-check.js`) from git.
2) Commit `/history-v2` files plus `new-design.md`/`PLAN.md` updates once approved.
3) Address D5a and D5b (signup bonus warning + credits availability).
4) Continue the dashboard redesign rollout (next page: Integrations).
