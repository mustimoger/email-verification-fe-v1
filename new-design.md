# Dashboard Visual Alignment Plan (Non-Disruptive)

## Goal
Bring the rest of the dashboard up to the same visual standard as `/pricing-v2` without changing page layouts or interaction patterns.

## Reference
- Visual benchmark: `/pricing-v2` (layout polish, layered backgrounds, card surfaces, accents, and motion).
- Scope target: all dashboard pages under `app/*` that use `DashboardShell`.

## Principles
- Keep existing information architecture and component structure.
- Prefer shared tokens and reusable components over page-specific styling.
- Apply a minimal MVP first, verify, then expand.
- Preserve current behavior and accessibility.

## Constraints / Non-goals
- Do not change existing pages while iterating (new work goes into `/overview-v2` first).
- No backend rewrites for new pages; reuse existing data logic and APIs.
- No URL changes until the new design is approved (swap happens after validation).

## MVP Definition
One dashboard page (Overview) matches the `/pricing-v2` visual polish using shared tokens and surface treatments, without layout changes.

## Success Criteria
- Visual consistency across dashboard pages (cards, surfaces, typography, accents).
- No regressions in layout, content, or navigation.
- Mobile and dark theme still look correct.

## Plan (Revised per /overview-v2 approach)
### D0: Visual audit and delta checklist
- What: Document differences between `/pricing-v2` and the existing dashboard pages.
- How: Capture differences in background treatment, card surfaces, borders, shadows, typography scale, accents, spacing, and motion.
- Why: Ensures changes are targeted and non-disruptive.
Status: Completed — reviewed `/pricing-v2` versus current dashboard pages and documented the deltas so the redesign can match the higher polish without changing layouts.
Key deltas found:
- `/pricing-v2` uses page-scoped CSS variables (`pricing-v2.module.css`) for a warm accent palette, card glassmorphism, and stronger shadows; other pages rely on global tokens only.
- `/pricing-v2` adds layered radial backgrounds and hero framing inside the page; other pages only use the global `body` background.
- `/pricing-v2` uses consistent large radii (24–28px), soft borders, and gradient accents; other pages use basic `bg-white` + `ring` + smaller radii.
- `/pricing-v2` has intentional typography treatments (uppercase chips, gradient headline, tighter vertical rhythm); other pages use standard text styles.
- `/pricing-v2` includes motion/transition polish (section fade-in, hover glow) that is mostly absent elsewhere.

### D1: Create `/overview-v2` (UI-only)
- What: Build a new `/overview-v2` page that matches the `/pricing-v2` visual polish.
- How: Create a new route and UI structure without changing any existing pages; keep layout functional, but focus on surfaces, typography, spacing, and motion. Use the existing Overview data logic where possible (no new backend work).
- Why: Allows visual iteration without disrupting current `/overview`.
Status: Completed — added a new `/overview-v2` route with a redesigned UI and page-scoped styling tokens. The new UI reuses the existing Overview data logic (same API calls and utilities) and leaves the current `/overview` page untouched so we can iterate safely before swapping.
What was done and why:
- Created `app/overview-v2/page.tsx` and `app/overview-v2/overview-v2-client.tsx` to mirror the existing data flow without backend changes.
- Added `app/overview-v2/overview-v2.module.css` to deliver `/pricing-v2`-level polish (card surfaces, borders, shadows, accent treatments) without impacting other pages.
- Built `app/overview-v2/overview-v2-sections.tsx` to keep the new layout readable and maintainable while preserving the same information structure.
- Fixed a runtime crash by defaulting `verification_totals.disposable` to `0` so validation pills never render an undefined value.

### D2: Visual QA and iteration on `/overview-v2`
- What: Review `/overview-v2` and refine until it meets the desired standard.
- How: Iterate on spacing, surfaces, and contrast; check desktop + mobile + dark theme.
- Why: Ensures the new design is ready before replacing `/overview`.
Status: Completed (with follow-up note) — ran a visual QA pass on `/overview-v2`, adjusted empty-state presentation, and delayed chart rendering until containers are measurable. The remaining Recharts warnings were later resolved in D2c, so the page is now visually aligned and console-clean.
What was done and why:
- Added helper text handling so “ext api data is not available” no longer occupies the primary metric slot.
- Guarded chart rendering until the container has positive dimensions to reduce layout thrash.
- Marked the chart sections as client-rendered to safely use `ResizeObserver`.
Not yet resolved:
- None; Recharts warnings were resolved in D2c.

### D2b: Mobile responsiveness pass on `/overview-v2`
- What: Ensure `/overview-v2` renders cleanly on small screens without overflow or cramped layouts.
- How: Review the mobile viewport and adjust grids, spacing, and table overflow to keep the UI readable and touch-friendly.
- Why: The redesign must remain mobile-friendly before we consider swapping `/overview-v2` into `/overview`.
Status: Completed — verified mobile viewport rendering, removed horizontal overflow, and added a mobile-friendly task list layout.
What was done and why:
- Replaced the desktop table with a stacked card list on mobile (keeps the same data, improves readability).
- Kept the full table for desktop (`md+`) with horizontal scrolling when needed.
Remaining notes:
- Removed the temporary `overflow-x-hidden` after visual QA showed it clipped card shadows (tracked in D2d); the mobile card layout still prevents horizontal scrolling.

### D2c: Recharts initial size warning fix
- What: Remove the `width/height -1` warnings from Recharts on `/overview-v2`.
- How: Adjust chart rendering so Recharts receives explicit, measured dimensions before render.
- Why: Clean console output and more reliable chart rendering, especially on first paint.
Status: Completed — replaced `ResponsiveContainer` with explicit chart widths/heights sourced from a `ResizeObserver`, and only render charts once dimensions are known. Console warnings about negative chart sizes are no longer emitted on initial render.

### D2d: Shadow clipping + card overflow cleanup
- What: Remove sharp edge artifacts around card shadows and ensure card icons never overflow their containers.
- How: Identify clipping sources (overflow behavior, container padding, or shadows) and adjust `/overview-v2` layout/surface styles without changing layout structure.
- Why: Keeps the new visual system polished and consistent with `/pricing-v2` while preserving the existing layout.
Status: Completed — increased horizontal breathing room for shadows and hardened the stats card layout so icons no longer escape their containers.
What was done and why:
- Added `lg:px-5` to the `/overview-v2` section so card shadows stay inside the scroll container bounds at desktop widths.
- Reduced `--overview-shadow-strong` to the same blur radius as the standard card shadow to prevent hero shadow clipping at the edges.
- Made the stats text block `flex-1 min-w-0` and the icon container `flex-shrink-0` to keep icons inside cards even when helper text wraps.

### D2e: Match `/pricing-v2` hero card surface on `/overview-v2`
- What: Make the `/overview-v2` hero card surface visually match the main `/pricing-v2` card, while preserving its typography and layout.
- How: Reuse the pricing card’s background and shadow tokens and only adjust the “DASHBOARD OVERVIEW” pill color.
- Why: Aligns the most prominent card on `/overview-v2` with the established `/pricing-v2` visual standard.
Status: Completed — aligned the hero card surface to the `/pricing-v2` card spec and adjusted the pill colors without touching typography or layout.
What was done and why:
- Updated `--overview-card-strong` and `--overview-shadow-strong` to mirror the `/pricing-v2` main card surface in both light and dark themes.
- Swapped the “DASHBOARD OVERVIEW” pill background and text color to match the lighter pill treatment while keeping its size, font, and placement intact.

### D2f: Close `/overview-v2` hero card gaps against `/pricing-v2`
- What: Align the `/overview-v2` hero card accents and glow treatment to the exact `/pricing-v2` spec.
- How: Swap hero accent colors, CTA shadow, and glow treatments to the pricing palette while preserving typography and layout.
- Why: Ensures the hero card matches the design blueprint without ambiguity.
Status: Completed — matched hero accents, pill colors, CTA shadow, and background glows to the `/pricing-v2` palette without changing typography or layout.
What was done and why:
- Updated the overview accent tokens to the pricing amber so the hero gradient, pill, and CTA match the spec exactly.
- Removed inner-card glows and switched the page-level glow positions/colors to match `/pricing-v2`.
- Adjusted the CTA shadow color to the pricing value for consistency.

### D2g: Hero shadow clipping fix
- What: Remove the sharp vertical edge on the hero card shadow.
- How: Increase the `/overview-v2` section horizontal padding so the hero shadow blur does not get clipped by the main container.
- Why: Keeps the hero card shadow smooth and consistent with `/pricing-v2` without altering typography or layout.
Status: Completed — increased section horizontal padding so the hero shadow blur fully renders without clipping.
What was done and why:
- Updated the `/overview-v2` section padding to `lg:px-8` so the 60px blur radius has space to fade before the main container edge.

### D2h: `/overview-v2` functional parity audit
- What: Verify `/overview-v2` preserves all backend wiring from `/overview`.
- How: Compare data-loading, API calls, task pagination, and status breakdown logic between `app/overview/page.tsx` and the `/overview-v2` client/sections.
- Why: Ensures the redesigned page remains fully functional before any route swap.
Status: Completed — confirmed `/overview-v2` mirrors `/overview` backend wiring end-to-end.
What was done and why:
- Verified `/overview-v2` still calls `getOverview`, `listIntegrations`, and `listTasks`, including paging/refresh behavior and error handling.
- Confirmed task mapping, integration label resolution, and status popover breakdown reuse the same helpers from `app/overview/utils.ts`.
- Checked charts, totals, and plan details use the same data sources; no backend gaps found (differences are UI-only copy adjustments).

### D2i: Cross-check Overview endpoints against updated external API docs
- What: Validate the `/overview` backend wiring against the latest `/ext-api-docs` before any route swap.
- How: Review `backend/app/api/overview.py` + `backend/app/clients/external.py` and compare with `/ext-api-docs/endpoints/metrics_controller.md`, `/ext-api-docs/endpoints/task_controller.md`, and `/ext-api-docs/endpoints/credit_transaction_controller.md`.
- Why: External API capabilities changed; ensure the overview pipeline still matches the documented contracts.
Status: Completed — current wiring aligns with metrics + tasks docs, with noted data gaps.
What was done and why:
- Confirmed `ExternalAPIClient.get_verification_metrics()` targets `GET /api/v1/metrics/verifications` (docs match) and the response fields used in `OverviewResponse` are present.
- Confirmed `ExternalAPIClient.list_tasks()` aligns with `GET /api/v1/tasks` (limit/offset pagination) and `Task.metrics.verification_status` is used to build counts when per-task totals are missing.
- Noted that `verification_status` now includes `role_based` and `disposable_domain_emails`; current `counts_from_metrics` logs these as unknown and folds them into `invalid` totals, so overview rollups may skew unless we map them explicitly.
- Noted docs for `GET /api/v1/metrics/verifications` only include `series` when `from` and `to` are provided; overview currently calls without dates, so usage series can be empty by design.
- Noted `GET /api/v1/credits/balance` exists but `overview.credits_remaining` is intentionally left `null` (credit wiring not yet hooked to the external endpoint).

### D2j: Wire `credits_remaining` from external `/credits/balance`
- What: Populate overview credit balance using the external credits endpoint.
- How: Add a `get_credit_balance` call to the external client and use it in `backend/app/api/overview.py` with safe error handling.
- Why: Aligns overview credits with the updated external API contract.
Status: Completed — overview now pulls credits from the external balance endpoint with graceful fallback.
What was done and why:
- Added `CreditBalanceResponse` + `ExternalAPIClient.get_credit_balance()` to call `GET /api/v1/credits/balance`.
- Wired `/api/overview` to fetch the balance and log/report errors without breaking the rest of the payload.
- Updated `backend/tests/test_overview.py` to cover credit success and error cases.
Tests:
- `source .venv/bin/activate && pytest backend/tests/test_overview.py`

### D2k: Map `role_based` + `disposable_domain_emails` separately
- What: Avoid counting `role_based` and `disposable_domain_emails` under invalid totals.
- How: Extend task + overview metric mapping to expose these fields separately while keeping existing valid/invalid/catchall totals intact.
- Why: External API now returns these statuses; rolling them into invalid skews the overview.
Status: Completed — overview metrics now isolate `role_based` and `disposable` instead of folding them into invalid totals.
What was done and why:
- Updated `counts_from_metrics` to track `role_based` and `disposable_domain_emails` separately, excluding them from invalid sums.
- Extended `VerificationTotals` and task mapping to surface `role_based`/`disposable` counts and include them when calculating totals.
- Updated overview fallback aggregation to include the new counts when metrics are unavailable.
Tests:
- `source .venv/bin/activate && pytest backend/tests/test_tasks_metrics_mapping.py backend/tests/test_overview.py`

### D3: Replace `/overview` with `/overview-v2`
- What: Swap the new design into the `/overview` route and connect existing data logic.
- How: Move or copy the UI into `/overview`, reusing the current data logic without new backend work. `/overview-v2` can be removed once `/overview` is updated.
- Why: Delivers the upgraded design without altering backend behavior.
Status: Completed — `/overview` now renders the v2 dashboard UI.
What was done and why:
- Replaced `app/overview/page.tsx` with a wrapper that renders `OverviewV2Client`, keeping all existing data wiring intact.
- Left `/overview-v2` route in place for rollback/QA; can be removed later once fully validated.

### D4: Rollout to remaining pages
- What: Align the rest of the dashboard pages to the new shared visual standard.
- How: Apply the same surface tokens and components to each page, without layout changes.
- Why: Achieves consistency while preserving existing UX patterns.
Status: In progress — starting with `/verify` as `/verify-v2` to validate the design system on a complex workflow page.
Pages to update:
- Verify (in progress via `/verify-v2`)
- History
- Integrations
- API
- Pricing (v1)
- Account

### D4a: `/verify-v2` visual audit + delta checklist
- What: Compare `/verify` vs `/pricing-v2` and document deltas before redesign.
- How: Use Playwright to capture the current `/verify` UI and note gaps in surfaces, typography, spacing, accents, and motion against the design-principles blueprint.
- Why: Ensures the redesign is targeted and traceable instead of guesswork.
Status: Completed — attempted Playwright session seeding, but the stored refresh token is invalid; completed the audit by code inspection against `design-principles.md` so work can proceed.
What was done and why:
- Attempted to load `/pricing-v2` and `/verify` in Playwright using `.auth-session.json`; Supabase rejected the refresh token, so authenticated pages redirected to `/signin`.
- Performed a source-level audit of `app/verify/page.tsx` against the pricing-v2 blueprint to document precise surface/typography deltas.
Key deltas found:
- `/verify` uses direct slate/white utility colors (`bg-white`, `text-slate-*`, `ring-slate-*`) instead of page-scoped tokens from `/pricing-v2`.
- No hero card or page-level accent glows; `/verify` begins with utility cards, missing the pricing-style top narrative.
- Card surfaces use `rounded-2xl` + `shadow-md` + `ring` rather than the 28/24/16/12px radius system and `--pricing-shadow`.
- Sections lack the layered card hierarchy (`pricing-card`, `pricing-card-muted`, `pricing-card-strong`) and consistent border token (`--pricing-border`).
- CTA and action buttons use flat `--cta` fills instead of the pricing gradient + glow spec.
- Alerts and helper badges rely on ad-hoc amber/rose/sky colors instead of the standardized status tokens.
- Typography is heavier (`font-extrabold`, `text-lg`) and not aligned with pricing’s `text-3xl/5xl`, uppercase label chips, and muted body rhythm.
- Motion polish (fade-in transitions, hover glows) is largely absent.

### D4a1: Playwright-authenticated capture (verify vs pricing-v2)
- What: Re-run Playwright visual capture now that auth tokens have been refreshed in `key-value-pair.txt`.
- How: Seed localStorage with the provided key/value, then capture `/verify` and `/pricing-v2` for a visual reference pass.
- Why: Confirms the deltas in a live render instead of relying solely on code inspection.
Status: Completed — Playwright captured `/verify` and `/pricing-v2` with authenticated localStorage seeded.
What was done and why:
- Seeded `sb-zobtogrjplslxicgpfxc-auth-token` from `key-value-pair.txt`, then captured `/verify` and `/pricing-v2`.
- Stored screenshots in `artifacts/verify-auth.png` and `artifacts/pricing-v2-auth.png` for visual reference.
Notes:
- Backend API (`localhost:8001`) was not running, so data-driven sections show missing-data states; layout/surface styling is still usable for visual comparison.

### D4b: `/verify-v2` UI-only redesign
- What: Create a new `/verify-v2` route that matches `/pricing-v2` visual polish without touching `/verify`.
- How: Build the page layout with pricing-v2 surface tokens, hero card, and section cards; do not change backend logic yet.
- Why: Allows visual iteration on the verification workflow before functional migration.
Status: Completed — delivered a UI-only `/verify-v2` page using the pricing-v2 visual system.
What was done and why:
- Added `app/verify-v2/page.tsx`, `app/verify-v2/verify-v2-client.tsx`, and `app/verify-v2/verify-v2-sections.tsx` to keep `/verify` untouched while the new design is reviewed.
- Introduced `app/verify-v2/verify-v2.module.css` with page-scoped tokens matching the pricing-v2 palette, borders, and shadows.
- Built a pricing-style hero card with verification-specific messaging and highlight chips.
- Restyled manual entry, live results, bulk upload, and workflow guidance sections using pricing-v2 card specs and typography.
- Kept all actions UI-only (no backend wiring) per instructions; functional migration remains explicitly deferred to D4d.

### D4b1: `/verify-v2` refresh controls alignment
- What: Add refresh actions for manual and upload result updates without disrupting the new visual system.
- How: Integrate refresh buttons into the results header and upload summary state, matching pricing-v2 button styling.
- Why: Maintains parity with the existing `/verify` workflow while keeping the new design cohesive.
Status: Completed — added pricing-style refresh/export controls to the live results header.
What was done and why:
- Moved “Refresh status” and “Export results” into the results header to mirror the old `/verify` workflow while keeping the pricing-v2 visual language.
- Kept the controls as UI-only buttons (no wiring) to respect the current design-only phase.

### D4b2: `/verify-v2` bulk upload summary swap
- What: Show the upload summary chart inside the pre-flight checklist card after a successful file upload.
- How: Convert the right-hand pre-flight card into a two-state panel (pre-flight vs summary) so the chart occupies the same surface once results exist.
- Why: Keeps the user’s context focused on one area and mirrors the current `/verify` flow without cluttering the page.
Status: Completed — added a two-state panel for pre-flight vs upload summary while keeping summary hidden until wiring.
What was done and why:
- Converted the right-hand card in the bulk upload section into a two-state panel with a future-ready summary layout.
- Included a refresh action inside the summary state to match the existing `/verify` upload workflow.
- Kept the summary state disabled by default (UI-only) per instruction; it will render once wiring supplies real upload results.

### D4c: `/verify-v2` responsive QA
- What: Ensure the new `/verify-v2` layout is readable and touch-friendly on mobile.
- How: Review small breakpoints and adjust grids, spacing, and overflows; confirm no clipped shadows.
- Why: The redesign must remain mobile-friendly before any functional migration.
Status: Completed — captured mobile and desktop renders and confirmed layout integrity.
What was done and why:
- Captured `/verify-v2` at 375px and 1280px widths (see `artifacts/verify-v2-mobile.png` and `artifacts/verify-v2-desktop.png`).
- Verified cards stack cleanly on mobile, button groups wrap without overflow, and shadows remain intact.
Notes:
- Backend API is not running locally, so data sections show missing-data states; layout and responsive behavior are still validated.

### D4c1: `/verify-v2` results controls placement
- What: Move the Live results actions to the bottom of the card.
- How: Relocate the “Refresh status” and “Export results” buttons to the card footer using pricing-style button treatments.
- Why: Mirrors the existing `/verify` interaction flow without breaking the new visual system.
Status: Completed — moved the Live results actions into the card footer as requested.
What was done and why:
- Removed the header actions and added a footer action row aligned to the bottom right of the Live results card.
- Preserved the pricing-v2 button treatments to keep the visual system consistent.

### D4d: `/verify-v2` functional migration (after design approval)
- What: Copy `/verify` functionality into `/verify-v2` once the design is signed off.
- How: Reuse existing logic and APIs from `/verify` without introducing new backend code.
- Why: Keeps the new UI production-ready while avoiding premature backend changes.
Status: Pending — blocked on final UI approval.

#### D4d1: Wire manual verification flow in `/verify-v2`
- What: Connect manual email entry, limits validation, task creation, refresh/export actions, and state persistence.
- How: Reuse `app/verify/utils.ts`, `app/verify/file-columns.ts`, and `app/lib/api-client.ts` with new `/verify-v2` state wiring; keep the `/verify-v2` UI intact while swapping placeholders for live data.
- Why: Enables manual verification for paid users while preserving the `/verify-v2` design.
Status: Completed — manual verification wiring is live in `/verify-v2` without altering the new layout.
What was done and why:
- Added manual verification state management in `app/verify-v2/verify-v2-client.tsx` (limits load, task creation, refresh/export, persistence) to match existing `/verify` behavior while keeping `/verify-v2` UI intact.
- Updated `app/verify-v2/verify-v2-sections.tsx` to render live status counts, results list, and action controls so the design stays consistent but functional.
- Added status-mapping guardrails that log unexpected result statuses for debugging without blocking the user flow.

#### D4d2: Wire bulk upload flow in `/verify-v2`
- What: Connect file selection, column mapping, upload submission, summary metrics, and refresh actions.
- How: Reuse existing upload helpers from `/verify` utilities; render mapping/summary panels inside the existing `/verify-v2` layout without changing its structure, including a bar chart in the inline right-hand panel.
- Why: Enables bulk verification while keeping the design consistent with the pricing-v2 visual system.
Status: Completed — bulk upload wiring is now functional in `/verify-v2` and the right-hand summary panel renders live charts.
What was done and why:
- Wired selection, mapping, upload submission, and summary refresh in `/verify-v2` using the same helpers and API calls as `/verify`.
- Rendered the mapping panel inline and the bar chart summary inside the right-hand panel so the flow stays within the existing layout and visual system.
- Preserved pricing-v2 styling tokens while adding only the functional UI needed for the bulk upload MVP.

#### D4d2a: Audit existing `/verify` bulk upload logic for reuse
- What: Identify the exact helpers, API calls, and state shape used in `/verify` bulk upload so we can mirror them in `/verify-v2`.
- How: Review `app/verify` bulk upload code paths and the shared utilities (`app/verify/utils.ts`, `app/verify/file-columns.ts`, `app/lib/api-client.ts`).
- Why: Ensures we reuse proven logic and keep the MVP wiring minimal and consistent.
Status: Completed — reviewed `/verify` bulk upload flow and confirmed the helper + API surface to reuse in `/verify-v2`.
What was done and why:
- Identified the core upload state used by `/verify`: `files`, `fileColumns`, `uploadSummary`, `columnMapping`, `firstRowHasLabels`, `fileError`, `fileNotice`, `latestUploadError`, `latestUploadRefreshing`, plus a drag/drop handler and file input ref.
- Confirmed upload helper usage: `readFileColumnInfo` + `buildColumnOptions` from `app/verify/file-columns.ts`, and `buildUploadSummary`, `createUploadLinks`, `mapUploadResultsToLinks`, `buildTaskUploadsSummary` from `app/verify/utils.ts`.
- Confirmed API calls and sequence: `apiClient.uploadTaskFiles` for submission, `apiClient.getTask` for per-file details, and `apiClient.listTasks` for refresh; these align with the existing external API contract.
- Noted the existing bar chart data shape in `/verify` (`summaryBars` with `var(--chart-*)` colors) to reuse in the inline right-hand summary panel for `/verify-v2`.

#### D4d2b: Wire bulk upload state + actions in `/verify-v2`
- What: Add upload state handling (file selection, column mapping, submit upload, polling/refresh) to the `/verify-v2` client.
- How: Reuse `/verify` helpers and API client methods without altering the `/verify-v2` layout.
- Why: Provides the core bulk upload workflow for paid users with minimal surface changes.
Status: Completed — added the bulk upload state machine and API wiring to `/verify-v2` without touching the UI.
What was done and why:
- Added upload state (file selection, mapping, summary, error/notice, refresh) to `app/verify-v2/verify-v2-client.tsx` so the MVP logic mirrors the proven `/verify` workflow.
- Reused existing helpers (`readFileColumnInfo`, `buildUploadSummary`, `mapUploadResultsToLinks`, `buildTaskUploadsSummary`) and API calls (`uploadTaskFiles`, `getTask`, `listTasks`) to avoid reimplementing logic.
- Implemented validation, logging, and retry handling for uploads, keeping the behavior consistent with `/verify` while leaving the `/verify-v2` layout untouched.

#### D4d2c: Render bulk upload mapping + summary UI (with chart)
- What: Connect the Upload section UI to the new upload state, including mapping panel and summary chart.
- How: Render the inline mapping panel and summary counts/chart using the same charting library as `/verify`.
- Why: Surfaces results for uploaded files while staying visually aligned with the pricing-v2 system.
Status: Completed — `/verify-v2` now renders the inline mapping flow and the right-hand summary chart using live upload data.
What was done and why:
- Updated `app/verify-v2/verify-v2-sections.tsx` to render the file list, column mapping panel, and summary chart panel in the existing right-hand slot.
- Hooked the upload UI to live state (errors, notices, refresh, and chart totals) so the bulk upload flow mirrors `/verify` without changing layout.

#### D4d3: Functional QA + targeted tests for `/verify-v2`
- What: Validate manual and bulk flows with targeted tests and a lightweight QA pass.
- How: Re-run existing verification utility tests and spot-check `/verify-v2` manual + upload flows in the browser.
- Why: Confirms the wiring works before any route swap or wider rollout.
Status: Completed — tests re-run and browser QA performed with refreshed auth token.
What was done and why:
- Re-ran `tests/verify-mapping.test.ts` to confirm status mapping and upload summary helpers remain correct after wiring changes.
- Performed Playwright spot-check of manual and bulk upload flows; verified that manual results list populates, file selection shows the inline panel, mapping step opens, and the summary chart renders.
Issues found:
- Manual submit returned `500` from `/tasks` (UI shows “Internal Server Error”). Requires backend/external API health check.
- Recharts emitted `width(-1)/height(-1)` warnings for the summary chart in the right-hand panel; addressed in D4d4.

#### D4d4: Fix `/verify-v2` summary chart size warnings
- What: Eliminate Recharts width/height -1 warnings in the inline right-hand summary panel.
- How: Use the same explicit sizing/ResizeObserver approach used in `/overview-v2` before rendering the chart.
- Why: Keeps console clean and avoids rendering issues on first paint.
Status: Completed — added a ResizeObserver sizing guard before rendering the summary bar charts.
What was done and why:
- Replaced `ResponsiveContainer` with explicit chart dimensions computed from a ResizeObserver so Recharts only renders after the container has measurable size.
- Ensured the inline summary panel keeps the same layout while removing the width/height -1 warnings.

#### D4d5: Investigate `/tasks` 500 during manual submit
- What: Identify why manual verification `/tasks` requests return 500 in local QA.
- How: Check backend logs and external API health; confirm request payload matches updated `/ext-api-docs`.
- Why: Manual verification should fail gracefully only on true upstream errors.
Status: Completed — confirmed the external API is returning a 500 because the task publish queue is down.
What was done and why:
- Reviewed `backend/logs/uvicorn.log` and confirmed the backend forwarded the request to `POST /api/v1/tasks`, which returned `500 Internal Server Error` from the external API.
- Reproduced the failure by calling the external API directly (same payload format as `/api/tasks`), which returned `{"error":"Failed to publish message to RabbitMQ"}`.
- Verified other task endpoints (`GET /tasks`, `POST /tasks/batch/upload`) succeed with the same auth context, so the issue is isolated to task creation in the external service.
Notes:
- This is an upstream availability issue; no frontend payload mismatch was detected relative to `/ext-api-docs`.
- Manual submit will continue to surface 500s until the external API task publisher is healthy.

### D4e: `/verify-v2` parity audit + external API cross-check
- What: Confirm `/verify-v2` preserves the `/verify` backend wiring and matches updated external API contracts.
- How: Compare `/verify` and `/verify-v2` client logic, and cross-check `/ext-api-docs/endpoints/task_controller.md` + `batch_file_controller.md`.
- Why: Ensures the redesign is production-ready before swapping routes.
Status: Completed — `/verify-v2` matches `/verify` functionality and current external API docs.
What was done and why:
- Verified `/verify-v2` reuses the same helpers (`app/verify/utils.ts`, `app/verify/file-columns.ts`) and API calls (`createTask`, `getTaskJobs`, `uploadTaskFiles`, `listTasks`, `getTask`) as `/verify`.
- Confirmed upload metadata mapping uses column letters which the backend normalizes to 1-based indices, aligning with `email_column` requirements in the batch upload docs.
- Cross-checked manual task creation and job polling against the updated task endpoints; no payload or response mismatches found.

### D4f: Swap `/verify` to `/verify-v2`
- What: Replace the `/verify` route with the redesigned `/verify-v2` client.
- How: Point `app/verify/page.tsx` to `VerifyV2Client` and keep `/verify-v2` for rollback/QA.
- Why: Delivers the updated UI while preserving the existing backend wiring.
Status: Completed — `/verify` now renders the `/verify-v2` client.
What was done and why:
- Replaced `app/verify/page.tsx` with a lightweight wrapper that renders `VerifyV2Client` to preserve existing functionality while swapping in the new UI.
- Left `/verify-v2` route intact for rollback/QA after the swap.

### D4g: Swap dashboard left sidebar to the new design
- What: Update the shared dashboard sidebar to the new left nav design.
- How: Apply the new visual system to the sidebar in `DashboardShell` without changing route structure or navigation behavior.
- Why: Aligns all dashboard pages to the approved sidebar design since they reuse the shared shell.
Status: Pending — design spec/source for the new sidebar is needed before implementation.
Not yet implemented:
- Awaiting the new left sidebar design reference (Figma/node or file source) to translate the layout, colors, and spacing.

#### D4g1: Review `dashboard-shell2.tsx` and map deltas
- What: Compare the new sidebar implementation with the current `DashboardShell`.
- How: Identify structural/layout changes, required state (collapse/expand), and asset dependencies.
- Why: Ensures we reuse existing nav items and behaviors while swapping only the design.
Status: Completed — reviewed the uploaded sidebar component and captured the deltas to implement.
What was done and why:
- Reviewed `app/components/dashboard-shell2.tsx` to capture the new layout, collapsed behavior, and asset usage before editing the shared shell.
- Noted it expects `bolt.png` for the collapsed logo and a collapse toggle in the header.
- Identified differences to reconcile: new file hardcodes `/dashboard` and `/api-keys` routes and inline SVG icons; we must retain existing nav items/links and lucide icons from `DashboardShell`.
- Noted styling is light-theme specific (white/gray + orange); we need to map these to theme tokens so dark mode remains correct.

#### D4g2: Apply the new sidebar design in `DashboardShell`
- What: Replace the existing sidebar markup/styles with the new design.
- How: Integrate the new layout into `app/components/dashboard-shell.tsx` while keeping nav items, routes, and auth behavior unchanged; add collapsed state support and use `public/bolt.png` for the collapsed logo.
- Why: Delivers the new sidebar design across all dashboard pages without functional regressions.
Status: Completed — swapped the sidebar layout to the new design while preserving nav behavior.
What was done and why:
- Reworked `app/components/dashboard-shell.tsx` to use the new sidebar structure (header logo swap, collapse toggle, nav styling, and bottom user section) while keeping all existing routes and auth behaviors intact.
- Added a persistent collapse state (localStorage-backed) and wired the collapsed logo to `public/bolt.png` for the compact view.
- Mapped sidebar colors to new theme tokens in `app/globals.css` so light/dark modes remain consistent with the new layout.
- Kept credits banner optional and backed by the existing `/account/credits` endpoint to avoid hardcoded values.

#### D4g3: Sidebar QA (desktop/mobile + collapse states)
- What: Validate the new sidebar layout and interactions.
- How: Spot-check desktop and mobile, verify collapse/expand behavior and active link styling in light/dark themes.
- Why: Prevents regressions in navigation and responsive layout after the swap.
Status: Completed — captured desktop/mobile + light/dark with collapsed and expanded states.
What was done and why:
- Seeded the refreshed auth session and captured the sidebar in desktop expanded/collapsed states for light and dark themes.
- Captured mobile sidebar overlay for light and dark themes to confirm responsive navigation layout.
Artifacts:
- `artifacts/qa-sidebar-desktop-light-expanded.png`
- `artifacts/qa-sidebar-desktop-light-collapsed.png`
- `artifacts/qa-sidebar-desktop-dark-expanded.png`
- `artifacts/qa-sidebar-desktop-dark-collapsed.png`
- `artifacts/qa-sidebar-mobile-light-open.png`
- `artifacts/qa-sidebar-mobile-dark-open.png`
Console notes:
- `409 Conflict` from `/api/credits/signup-bonus` with `auth.signup_bonus.failed` warning (“Signup bonus eligibility window elapsed”).
- `auth.trial_bonus.result` logged as duplicate (credits already granted).
- `qa.init_failed` warnings surfaced during QA when setting `data-theme` before `documentElement` was ready (QA script only).

### D4h: `/history-v2` visual audit + delta checklist
- What: Compare `/history` against `/pricing-v2` and document the deltas before redesign.
- How: Use Playwright to capture `/history` and `/pricing-v2`, then log differences in surfaces, typography, spacing, accents, and motion.
- Why: Ensures the redesign is targeted and traceable instead of guesswork.
Status: Completed — Playwright captures collected and deltas documented for `/history` versus `/pricing-v2`.
What was done and why:
- Seeded auth localStorage and captured `/history` and `/pricing-v2` to compare the live UI against the pricing-v2 visual blueprint.
- Logged surface, typography, spacing, accent, and motion deltas so the redesign can be applied without changing the underlying UX.
Artifacts:
- `artifacts/history-auth.png`
- `artifacts/pricing-v2-auth.png`
Key deltas found:
- `/history` uses `bg-white` + `ring-slate-200` + `shadow-md` with `rounded-2xl`/`rounded-xl` cards; `/pricing-v2` uses the pricing card hierarchy (`--pricing-card`, `--pricing-card-muted`, `--pricing-card-strong`) with `--pricing-border` and 28/24/16/12px radius system.
- `/history` lacks a hero card and page-level glow layers; `/pricing-v2` opens with a gradient hero, accent chip, and layered radial backgrounds.
- `/history` relies on direct slate utility colors and basic button styles; `/pricing-v2` uses accent gradients, tokenized border colors, and CTA shadows.
- `/history` table header/body use flat borders and no card layering; `/pricing-v2` uses muted card surfaces and consistent border tokens across sections.
- `/history` has minimal motion polish; `/pricing-v2` uses entry transitions and hover emphasis for interactive elements.

### D4i: `/history-v2` UI-only redesign
- What: Create a new `/history-v2` route that matches the `/pricing-v2` visual system without touching `/history`.
- How: Apply pricing-v2 tokens, add a history-specific hero card, and restyle the table/cards to the new surface hierarchy while keeping the current UX flow.
- Why: Allows us to review the new design without disrupting the current history page.
Status: Completed — shipped a UI-only `/history-v2` page with pricing-v2 surfaces and a history-specific hero layout.
What was done and why:
- Added `app/history-v2/page.tsx`, `app/history-v2/history-v2-client.tsx`, and `app/history-v2/history-v2-sections.tsx` to introduce the new route without touching `/history`.
- Implemented pricing-v2 surface tokens via `app/history-v2/history-v2.module.css`, matching the shared accent palette and card hierarchy.
- Built a hero card with history-focused messaging and CTAs, plus supporting highlight cards to match the `/pricing-v2` polish without altering UX flows.
- Restyled the history table area with pricing-v2 card treatments and empty-state messaging (no data wiring yet per the UI-only requirement).
Not yet implemented:
- No backend wiring in `/history-v2` (tracked in D4k).

### D4j: `/history-v2` responsive QA
- What: Verify `/history-v2` across mobile and desktop breakpoints in light/dark themes.
- How: Capture small and large viewport renders and adjust grids/overflow as needed.
- Why: Ensures the redesign remains touch-friendly and consistent with the pricing-v2 system.
Status: Completed — captured `/history-v2` in light/dark for desktop and mobile.
What was done and why:
- Seeded auth localStorage and captured `/history-v2` at 1280×800 and 375×812 in both light and dark themes to confirm responsive behavior and surface treatments.
- Verified cards stack cleanly on mobile, CTAs wrap without overflow, and shadows/glows remain intact.
Artifacts:
- `artifacts/history-v2-desktop-light.png`
- `artifacts/history-v2-desktop-dark.png`
- `artifacts/history-v2-mobile-light.png`
- `artifacts/history-v2-mobile-dark.png`
Console notes:
- `409 Conflict` from `/api/credits/signup-bonus` with `auth.signup_bonus.failed` warning (“Signup bonus eligibility window elapsed”).
- `auth.trial_bonus.result` logged as duplicate (credits already granted).

### D4k: `/history-v2` functional migration (after design approval)
- What: Copy `/history` data wiring into `/history-v2` once the UI is approved.
- How: Reuse `app/history/utils.ts` and `app/lib/api-client.ts` calls, then cross-check against the updated external API docs.
- Why: Keeps the new UI production-ready while avoiding premature backend changes.
Status: Completed — `/history-v2` now mirrors `/history` data wiring with updated UI surfaces.
What was done and why:
- Reused `apiClient.listTasks`, `apiClient.getTask`, and `apiClient.downloadTaskResults` in `app/history-v2/history-v2-client.tsx` so the new page preserves the existing backend flow without changing endpoints.
- Kept the same history cache behavior (`HistoryCacheEntry`) and mapping helpers (`mapTaskToHistoryRow`, `mapDetailToHistoryRow`) for parity with `/history`.
- Wired refresh, pagination, and download actions into the redesigned table and mobile card layouts to remove UI-only placeholders.
- Added a lightweight client-side status filter (All/Completed/Processing/Failed) that filters loaded rows only; it does not alter backend queries.
- Updated the snapshot/exports cards to render live counts when available and fall back to the empty-state message when no history is loaded.
- Cross-checked external task docs (`ext-api-docs/endpoints/task_controller.md`) to confirm list/detail payloads still align with the mapping logic.
Tests:
- `npm run test:history`

### D4l: `/integrations-v2` visual audit + delta checklist
- What: Compare `/integrations` against `/pricing-v2` and document the deltas before redesign.
- How: Use Playwright to capture `/integrations` and `/pricing-v2`, then log differences in surfaces, typography, spacing, accents, and motion.
- Why: Ensures the redesign is targeted and traceable instead of guesswork.
Status: Completed — Playwright captures collected and deltas documented for `/integrations` versus `/pricing-v2`.
What was done and why:
- Seeded auth localStorage and captured `/integrations` and `/pricing-v2` to compare the live UI against the pricing-v2 visual blueprint.
- Logged surface, typography, spacing, accent, and motion deltas so the redesign can be applied without changing the underlying UX.
Artifacts:
- `artifacts/integrations-auth.png`
- `artifacts/pricing-v2-auth.png`
Console notes:
- `409 Conflict` from `/api/credits/signup-bonus` with `auth.signup_bonus.failed` warning (“Signup bonus eligibility window elapsed”).
- `auth.trial_bonus.result` logged as duplicate (credits already granted).
Key deltas found:
- `/integrations` uses plain `bg-white` + `border-slate-200` + `shadow-sm` with `rounded-2xl` cards; `/pricing-v2` uses the pricing surface hierarchy (`--pricing-card`, `--pricing-card-muted`, `--pricing-card-strong`) with `--pricing-border` and the 28/24/16/12px radius map.
- `/integrations` has no hero card, accent chip, or page-level glow layers; `/pricing-v2` opens with a gradient hero, accent label, and layered radial backgrounds.
- `/integrations` CTA uses the global `--accent` solid fill; `/pricing-v2` uses the pricing gradient CTA with the matching shadow spec.
- Typography in `/integrations` sticks to small body copy and lacks the uppercase micro-labels, gradient heading accents, and structured headline scale used in `/pricing-v2`.
- No motion polish in `/integrations`; `/pricing-v2` includes staggered entrance transitions and hover emphasis.

### D4m: `/integrations-v2` UI-only redesign
- What: Create a new `/integrations-v2` route that matches the `/pricing-v2` visual system without touching `/integrations`.
- How: Apply pricing-v2 tokens, add an integrations-specific hero card, and restyle integration cards and CTA surfaces while keeping the existing UX flow.
- Why: Allows us to review the new design without disrupting the current integrations page.
Status: Completed — shipped a UI-only `/integrations-v2` page using the pricing-v2 visual system.
What was done and why:
- Added `app/integrations-v2/page.tsx`, `app/integrations-v2/integrations-v2-client.tsx`, and `app/integrations-v2/integrations-v2-sections.tsx` to introduce the new route without touching `/integrations`.
- Introduced `app/integrations-v2/integrations-v2.module.css` to apply pricing-v2 surface tokens, borders, and shadows scoped to the new page.
- Built a hero card (matching `/overview-v2`) with integrations-specific messaging, CTA links, and highlight chips.
- Restyled the integration cards and usage notes with the pricing-v2 card hierarchy while preserving the existing integration options and API-link behavior.
Not yet implemented:
- No backend wiring changes in `/integrations-v2` (design review first).

### D4n: `/integrations-v2` responsive QA
- What: Verify `/integrations-v2` across mobile and desktop breakpoints in light/dark themes.
- How: Capture small and large viewport renders and adjust grids/overflow as needed.
- Why: Ensures the redesign remains touch-friendly and consistent with the pricing-v2 system.
Status: Completed — captured `/integrations-v2` in light/dark for desktop and mobile.
What was done and why:
- Seeded auth localStorage and captured `/integrations-v2` at 1280×800 and 375×812 in both light and dark themes to validate responsive layout and theme styling.
- Verified cards stack cleanly on mobile, CTAs wrap without overflow, and glow/shadow treatments remain intact.
Artifacts:
- `artifacts/qa-integrations-v2-desktop-light.png`
- `artifacts/qa-integrations-v2-desktop-dark.png`
- `artifacts/qa-integrations-v2-mobile-light.png`
- `artifacts/qa-integrations-v2-mobile-dark.png`
Console notes:
- `409 Conflict` from `/api/credits/signup-bonus` with `auth.signup_bonus.failed` warning (“Signup bonus eligibility window elapsed”).
- `auth.trial_bonus.result` logged as duplicate (credits already granted).

### D4o: `/integrations-v2` functional migration (after design approval)
- What: Copy `/integrations` data wiring into `/integrations-v2` once the UI is approved.
- How: Reuse existing integration data/helpers and cross-check against updated external API docs.
- Why: Keeps the new UI production-ready while avoiding premature backend changes.
Status: Completed — `/integrations-v2` now pulls integration data from the backend config endpoint.
What was done and why:
- Wired `app/integrations-v2/integrations-v2-client.tsx` to call `apiClient.listIntegrations()` so the integrations list is no longer hardcoded in the UI.
- Added loading, empty, and error states with clear logs for missing icons/descriptions to avoid silent failures.
- Kept CTA links intact while switching the integration identifier to the backend-provided `id` for future-proofing.
External API cross-check:
- No external API endpoints for integrations in `ext-api-docs`; `/integrations` is served by the backend config (`backend/config/integrations.json`).

### D4p: Swap `/integrations` to `/integrations-v2`
- What: Replace the existing `/integrations` route with the new `/integrations-v2` UI.
- How: Point `app/integrations/page.tsx` to the v2 client while keeping `/integrations-v2` available for rollback.
- Why: Delivers the new integrations design across the dashboard without changing backend behavior.
Status: Completed — `/integrations` now renders the `/integrations-v2` client.
What was done and why:
- Replaced `app/integrations/page.tsx` with a wrapper that renders `IntegrationsV2Client` to swap the new UI in without altering backend logic.
- Kept `/integrations-v2` intact for rollback/QA.

### D4q: Swap `/history` to `/history-v2`
- What: Replace the existing `/history` route with the new `/history-v2` UI.
- How: Point `app/history/page.tsx` to the v2 client while keeping `/history-v2` available for rollback.
- Why: Delivers the new history design across the dashboard without changing backend behavior.
Status: Completed — `/history` now renders the `/history-v2` client.
What was done and why:
- Replaced `app/history/page.tsx` with a wrapper that renders `HistoryV2Client` to swap the new UI in without altering backend logic.
- Kept `/history-v2` intact for rollback/QA.

### D5: Responsive and theme QA
- What: Validate responsiveness and dark theme after styling updates.
- How: Spot check key breakpoints and dark mode for each updated page.
- Why: Prevents regressions in mobile and theme support.
Status: Completed — QA run for `/overview` and `/verify-v2` in light/dark + desktop/mobile.
What was done and why:
- Captured desktop (1280×800) and mobile (375×812) renders in light and dark modes for `/overview` and `/verify-v2`.
- Verified layouts remain readable and responsive across breakpoints; no clipping or overflow observed in screenshots.
- Recorded console warnings/errors to flag backend/data issues surfaced during QA.
Artifacts:
- `artifacts/qa-overview-desktop-light.png`
- `artifacts/qa-overview-mobile-light.png`
- `artifacts/qa-overview-desktop-dark.png`
- `artifacts/qa-overview-mobile-dark.png`
- `artifacts/qa-verify-v2-desktop-light.png`
- `artifacts/qa-verify-v2-mobile-light.png`
- `artifacts/qa-verify-v2-desktop-dark.png`
- `artifacts/qa-verify-v2-mobile-dark.png`
Console notes:
- `409 Conflict` from `/api/credits/signup-bonus` (duplicate/eligibility window) during page load.
- `auth.signup_bonus.failed` warning logged with message “Signup bonus eligibility window elapsed”.
Data notes:
- Credits Remaining card still shows “Unavailable” with ext API unavailable helper text for this session.

### D5a: Investigate signup bonus 409 warning
- What: Confirm whether the `409 Conflict` from `/api/credits/signup-bonus` is expected on repeat sessions or needs suppression.
- How: Review backend signup bonus logic and decide if the conflict should be downgraded to info or suppressed after first grant.
- Why: Prevents noisy console errors during normal dashboard use.
Status: Pending.

### D5b: Confirm credits balance availability
- What: Validate why `credits_remaining` renders as unavailable for the QA account.
- How: Check `/api/overview` payload and external `/credits/balance` response for this user.
- Why: Ensures overview displays credits once the external endpoint returns data.
Status: Pending.

### D5c: `/verify` QA after route swap
- What: Capture light/dark + desktop/mobile renders for `/verify` after swapping to `/verify-v2`.
- How: Use Playwright with localStorage auth to capture screenshots and check console logs.
- Why: Confirms the new `/verify` route remains responsive and theme-correct after the swap.
Status: Completed — `/verify` QA captures collected in light/dark and desktop/mobile.
What was done and why:
- Seeded auth localStorage and forced theme preferences to capture `/verify` across light/dark + desktop/mobile after the route swap.
- Captured screenshots to validate responsive layout and theme styling remain intact.
Artifacts:
- `artifacts/qa-verify-desktop-light.png`
- `artifacts/qa-verify-mobile-light.png`
- `artifacts/qa-verify-desktop-dark.png`
- `artifacts/qa-verify-mobile-dark.png`
Console notes:
- `409 Conflict` from `/api/credits/signup-bonus` with `auth.signup_bonus.failed` warning (“Signup bonus eligibility window elapsed”).

### D6: Documentation and handoff
- What: Document the changes and any new tokens/components.
- How: Update this plan with completed steps and rationale for newcomers.
- Why: Keeps future work aligned and reduces rework.
Status: Completed — added a refreshed handover with sidebar/QA details.
What was done and why:
- Created `handover.md` to capture the sidebar redesign, QA artifacts, console notes, and the remaining pending tasks so the next session can resume without gaps.

### D6a: Pricing-v2 visual spec checklist
- What: Write a single source-of-truth design blueprint for `/pricing-v2` (cards, colors, typography, gradients, shadows, spacing).
- How: Consolidate the exact tokens, class patterns, and sizes from `/pricing-v2` and global theme files into `design-principles.md`.
- Why: Removes ambiguity for future sessions when applying the `/pricing-v2` standard across the app.
Status: Completed — added a single source-of-truth `design-principles.md` with the full `/pricing-v2` card spec, colors, typography, shadows, gradients, and global theme tokens.
What was done and why:
- Captured every relevant token and class pattern from `/pricing-v2` plus the global theme palette so future work can replicate the visual system exactly without guesswork.

### D7: Repo hygiene for QA auth artifacts
- What: Remove tracked QA auth artifacts that contain session tokens.
- How: Decide whether to delete `.auth-session.json` and `.playwright-visual-check.js`, and add ignore rules if needed.
- Why: Prevents committing sensitive session credentials to the repo.
Status: Pending — decision needed on removing tracked auth files.

#### D7a: Ignore local QA artifacts
- What: Update `.gitignore` to exclude local QA outputs and auth token files.
- How: Add `key-value-pair.txt`, `.qa/`, and `artifacts/` to `.gitignore`.
- Why: Keeps sensitive session data and local QA output out of git history.
Status: Completed — `.gitignore` now excludes local QA outputs and auth token files.
What was done and why:
- Added `key-value-pair.txt`, `.qa/`, and `artifacts/` to `.gitignore` so sensitive tokens and QA artifacts do not get committed.

#### D7b: Commit and push sidebar + QA updates
- What: Commit current sidebar changes and plan updates, then push to GitHub.
- How: Stage tracked changes and create a single commit message for the sidebar redesign + QA notes; push to `origin/main`.
- Why: Keeps repo state synced with completed work as required.
Status: Completed — committed sidebar redesign and QA notes and pushed to `origin/main`.
What was done and why:
- Committed the sidebar layout swap, theme token additions, `.gitignore` updates, and plan updates in a single commit.
- Pushed commit `69912ac` to `origin/main` to keep GitHub up to date.

## Progress Notes
- Created this plan to guide a non-disruptive visual alignment effort, with a minimal MVP and staged rollout to avoid layout changes.
- Added explicit reference, constraints, and scope so future sessions understand the benchmark (`/pricing-v2`) and the staging approach (`/overview-v2` first, swap later).
