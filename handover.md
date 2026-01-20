# Handover: `/api-v2` Redesign + Wiring

Last updated: 2026-01-20

## Context
- Dashboard visual system benchmark is `/pricing-v2`; alignment plan tracked in `new-design.md`.
- `/api-v2` introduced as a non-disruptive redesign target (keep `/api` intact until approved).
- Auth for QA uses localStorage `sb-zobtogrjplslxicgpfxc-auth-token` from `key-value-pair.txt`; tokens can become invalid if reused in other sessions.

## What changed in this session
### 1) `/api-v2` UI-only redesign (pricing-v2 visual system)
- Added a new route with pricing-v2 surfaces and tokens:
  - `app/api-v2/page.tsx`
  - `app/api-v2/api-v2-client.tsx`
  - `app/api-v2/api-v2-sections.tsx`
  - `app/api-v2/api-v2.module.css`
- Built a hero card with API-focused messaging and CTA anchors to Keys/Usage sections.
- Restyled API Keys and API Usage blocks to the pricing-v2 hierarchy while keeping the existing UX flow (table + filters + chart).

### 2) `/api-v2` functional migration
- Reused the existing `/api` data pipeline:
  - `apiClient.listApiKeys`, `apiClient.createApiKey`, `apiClient.revokeApiKey`
  - `apiClient.getUsageSummary`, `apiClient.getUsagePurpose`
  - `resolveDateRange`, `summarizeKeyUsage`, `summarizePurposeUsage`, `mapPurposeSeries`
- Preserved key reveal/copy behavior and dashboard key filtering (same as `/api`).
- Usage chart states now mirror `/api` (unavailable when selecting a specific key via `/api/usage/summary` behavior).

### 3) External API cross-check
- `ext-api-docs/endpoints/api_key_controller.md` matches the backend proxy in `backend/app/api/api_keys.py`:
  - Frontend passes integration IDs; backend maps to external `purpose` values before calling `/api/v1/api-keys`.
- Usage endpoints align with `backend/app/api/usage.py` (`/api/usage/summary` + `/api/usage/purpose`).
  - Selecting an API key yields `source=unavailable` by design, so the UI surfaces `EXTERNAL_DATA_UNAVAILABLE`.

### 4) Responsive QA artifacts
- Captured `/api-v2` in light/dark and desktop/mobile:
  - `artifacts/qa-api-v2-desktop-light.png`
  - `artifacts/qa-api-v2-desktop-dark.png`
  - `artifacts/qa-api-v2-mobile-light.png`
  - `artifacts/qa-api-v2-mobile-dark.png`

### 5) Plan updates
- `new-design.md` updated with D4r–D4u completion notes and QA artifacts.
- `PLAN.md` pointer updated to include `/api-v2` rollout progress.

## Tests
- `source .venv/bin/activate && npm run lint` failed due to pre-existing lint errors unrelated to `/api-v2`.
  - See console output in the last run; errors include `.playwright-visual-check.js`, `app/components/theme-provider.tsx`, `app/lib/paddle.ts`, etc.
- No new `/api`-specific tests exist; none added.

## Console notes during QA
- `409 Conflict` from `/api/credits/signup-bonus` with `auth.signup_bonus.failed` warning (“Signup bonus eligibility window elapsed”).
- `auth.trial_bonus.result` logged as duplicate (credits already granted).
- Playwright init script warning: `Cannot read properties of null (reading 'setAttribute')` (QA script only).

## Worktree notes
- `key-value-pair.txt` modified locally (auth refresh), left uncommitted.
- Warning: `app/api/page.tsx` exceeds 600 lines (768). `app/verify-v2/verify-v2-client.tsx` also exceeds 600 lines.

## Pending items / next steps
1) D4v: swap `/api` to `/api-v2` after design approval (update `app/api/page.tsx` to render `ApiV2Client`).
2) Re-run QA after swap (`/api` light/dark + desktop/mobile) and capture artifacts.
3) D5a/D5b: investigate signup bonus 409 noise and credits availability (still pending).
4) D7: decide whether to remove tracked auth artifacts (`.auth-session.json`, `.playwright-visual-check.js`).

## QA auth reminders
- Use a fresh localStorage token from `key-value-pair.txt` for Playwright; tokens can fail with “Invalid Refresh Token: Already Used” if already consumed elsewhere.
