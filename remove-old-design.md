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
- Status: Completed.
- Done:
  - Moved `overview-v2`, `verify-v2`, `history-v2`, `integrations-v2`, `api-v2`, `account-v2` client/sections/CSS into their canonical folders and updated imports so canonical routes render the new UI directly.
  - Replaced `app/signin/page.tsx` and `app/signup/page.tsx` with the v2 page implementations; updated `signin-v2`/`signup-v2` pages to import from canonical so they stay in sync until deletion.
  - Moved `pricing-v2` client/sections/CSS into `app/pricing` and removed the `PRICING_V2` gate so `/pricing` always renders the new UI.
  - Relocated pricing quote helpers to `app/pricing/pricing-quote-utils.ts` and updated imports/tests accordingly.
  - Updated `*-v2` route pages to import canonical clients to avoid divergence before the routes are removed.

### Step 4 — Remove old routes and legacy components
- What: Delete unused `*-v2` routes, legacy sidebar components, and unused wrappers.
- Where: `app/*-v2`, `app/components/dashboard-shell2.tsx`, any unused CSS modules.
- Why: Removes dead code and avoids confusion/duplication.
- How:
  - Remove `app/*-v2/page.tsx` and related route folders after consolidation.
  - Delete `dashboard-shell2.tsx` once confirmed unused.
  - Prune unused CSS/token files only after confirming no imports.
- Status: Completed.
- Done:
  - Removed all `app/*-v2` route directories now that canonical routes own the UI.
  - Deleted `app/components/dashboard-shell2.tsx` (unused legacy sidebar implementation).
  - Removed the legacy pricing mapping helpers (`app/pricing/utils.ts`) and its tests after the new pricing UI became canonical.

### Step 5 — Update links, tests, and docs
- What: Remove `/-v2` links and update any documentation that references old routes.
- Where: `app/*`, `tests/*`, `new-design.md`, other root docs.
- Why: Ensures no broken navigation or stale docs.
- How:
  - `rg -n "/[a-z-]+-v2" app tests`
  - Update route references to canonical URLs.
  - Document removals and rationale in `new-design.md`.
- Status: Completed.
- Done:
  - Moved `public/signin-v2` assets into `public/signin` and updated all `/signin-v2/*` references in auth/reset flows.
  - Updated OAuth provider icon paths/tests to use `/signin/google.svg`.
  - Added a note in `new-design.md` that `/-v2` routes are removed and canonical routes now own the UI.

### Step 6 — Validate and finalize
- What: Confirm canonical routes render the new UI and no dead code remains.
- Why: Avoid regressions after deletion.
- How:
  - Run existing tests for affected pages (unit + integration where available).
  - Manual QA for key routes (overview, verify, history, api, account, pricing, auth).
- Status: Completed.
- Done:
  - Ran tests:
    - `npm run test:history`
    - `npm run test:auth-guard`
    - `npm run test:overview`
    - `npm run test:account-purchases`
    - `npx tsx tests/oauth-providers.test.ts`
    - `npx tsx tests/pricing-quote-utils.test.ts`
  - Manual QA (Playwright) with localStorage session injection:
    - Visited `/signin`, `/signup`, `/pricing`, `/overview`, `/verify`, `/history`, `/integrations`, `/api`, `/account`, `/reset-password`.
    - Observed expected auth-session console warnings (`signup_bonus` 409 conflicts, profile sync fetch failures) consistent with prior runs; no route failures after v2 removal.
  - Made OAuth provider filtering type-safe so `formatV2Label` only receives a `string`.
  - Guarded history cache access to avoid undefined reads during initial load.
  - Installed `@types/papaparse` and aligned the upload section prop type to accept `RefObject<HTMLInputElement | null>`.
  - `npm run build` now completes successfully.

## Open questions
- None. Decisions provided:
  - Remove all `/-v2` routes (no fallback/QA).
  - Remove `PRICING_V2` gating so `/pricing` always uses the new UI.
  - No external links point to `/-v2` routes.

## Progress updates
- Created this removal plan to safely consolidate the new UI into canonical routes without disrupting the new design or existing behavior.
