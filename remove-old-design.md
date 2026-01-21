# Remove Old Design Plan

## Goal
- Remove legacy dashboard routes, pages, and sidebar code now that the redesigned UI has been swapped into the canonical URLs.
- Keep routing stable and avoid any visual or behavioral changes to the new design.

## Scope
- Frontend routes under `app/*`, including `*-v2` route folders and legacy page wrappers.
- Legacy sidebar component(s) that are no longer referenced.
- Links/tests/docs that still point at `/-v2` routes.

## Non-goals
- No visual/UX changes to the new design.
- No backend rewrites or API contract changes.

## MVP Definition
Only remove routes/components that are confirmed unused, while preserving the new design at the original URLs.

## Step-by-step plan

### Step 1 — Inventory all old vs new routes and references
- What: List all `*-v2` routes, wrappers, and any remaining legacy components.
- Where: `app/*`, `app/components/*`, tests/docs.
- Why: Prevent deleting any route/component still used in production or QA.
- How:
  - `rg -n "-v2" app tests`
  - `rg -n "dashboard-shell2|DashboardShell2" app`
  - Confirm wrappers in `app/*/page.tsx` that import from `*-v2`.
- Status: Completed.
- Done:
  - Identified `*-v2` route folders: `overview-v2`, `verify-v2`, `history-v2`, `integrations-v2`, `api-v2`, `account-v2`, `signin-v2`, `signup-v2`, `pricing-v2`.
  - Confirmed canonical wrappers that import v2 UI:
    - `app/overview/page.tsx`, `app/verify/page.tsx`, `app/history/page.tsx`, `app/integrations/page.tsx`, `app/api/page.tsx`, `app/account/page.tsx`, `app/signin/page.tsx`, `app/signup/page.tsx`.
    - `app/pricing/page.tsx` still gates v2 via `PRICING_V2`.
  - Found legacy sidebar component `app/components/dashboard-shell2.tsx` (unused; references old routes `/dashboard`, `/api-keys`).
  - Found `/-v2` asset references still in use:
    - `app/reset-password/page.tsx`, `app/signin-v2/page.tsx`, `app/signup-v2/page.tsx`, `app/lib/oauth-providers.ts`, `tests/oauth-providers.test.ts`.
  - Found `pricing-v2` test references: `tests/pricing-v2-utils.test.ts`.

### Step 2 — Confirm canonical routes and removal targets
- What: Decide which `/-v2` routes are safe to delete after the swap.
- Where: `app/*-v2`, `app/*/page.tsx`, `app/pricing/page.tsx`.
- Why: Some routes (e.g., pricing) may still be gated by env flags or used for rollback.
- How:
  - Confirm that each canonical route (`/overview`, `/verify`, `/history`, `/integrations`, `/api`, `/account`, `/signin`, `/signup`) already renders the new UI.
  - Decide whether `PRICING_V2` gating should be removed or retained.
- Status: Completed.
- Done:
  - Confirmed canonical routes already point to v2 UI (see Step 1 wrappers).
  - Decision recorded: remove all `/-v2` routes (no fallback/QA routes).
  - Decision recorded: remove `PRICING_V2` gating so `/pricing` always renders the new UI.
- Needs confirmation:
  - Whether any `/-v2` route should remain for QA/rollback.
  - Whether `PRICING_V2` should be removed so `/pricing` is always the new design.

### Step 3 — Consolidate new UI into canonical directories
- What: Move new UI code out of `*-v2` folders so canonical routes own their UI code.
- Where: `app/*-v2/*` → `app/*/*`.
- Why: Eliminates duplicate routes and keeps the codebase consistent with canonical URLs.
- How:
  - Relocate `*-v2` client/components/CSS into the matching canonical folder.
  - Update imports in `app/*/page.tsx` to point to local modules.
  - Keep shared utilities (e.g., `utils.ts`) in place.
- Status: Pending.

### Step 4 — Remove old routes and legacy components
- What: Delete unused `*-v2` routes, legacy sidebar components, and unused wrappers.
- Where: `app/*-v2`, `app/components/dashboard-shell2.tsx`, any unused CSS modules.
- Why: Removes dead code and avoids confusion/duplication.
- How:
  - Remove `app/*-v2/page.tsx` and related route folders after consolidation.
  - Delete `dashboard-shell2.tsx` once confirmed unused.
  - Prune unused CSS/token files only after confirming no imports.
- Status: Pending.

### Step 5 — Update links, tests, and docs
- What: Remove `/-v2` links and update any documentation that references old routes.
- Where: `app/*`, `tests/*`, `new-design.md`, other root docs.
- Why: Ensures no broken navigation or stale docs.
- How:
  - `rg -n "/[a-z-]+-v2" app tests`
  - Update route references to canonical URLs.
  - Document removals and rationale in `new-design.md`.
- Status: Pending.

### Step 6 — Validate and finalize
- What: Confirm canonical routes render the new UI and no dead code remains.
- Why: Avoid regressions after deletion.
- How:
  - Run existing tests for affected pages (unit + integration where available).
  - Manual QA for key routes (overview, verify, history, api, account, pricing, auth).
- Status: Pending.

## Open questions
- None. Decisions provided:
  - Remove all `/-v2` routes (no fallback/QA).
  - Remove `PRICING_V2` gating so `/pricing` always uses the new UI.
  - No external links point to `/-v2` routes.

## Progress updates
- Created this removal plan to safely consolidate the new UI into canonical routes without disrupting the new design or existing behavior.
