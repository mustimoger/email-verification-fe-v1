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

### D3: Replace `/overview` with `/overview-v2`
- What: Swap the new design into the `/overview` route and connect existing data logic.
- How: Move or copy the UI into `/overview`, reusing the current data logic without new backend work. `/overview-v2` can be removed once `/overview` is updated.
- Why: Delivers the upgraded design without altering backend behavior.
Status: Pending.

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

### D5: Responsive and theme QA
- What: Validate responsiveness and dark theme after styling updates.
- How: Spot check key breakpoints and dark mode for each updated page.
- Why: Prevents regressions in mobile and theme support.
Status: Pending.

### D6: Documentation and handoff
- What: Document the changes and any new tokens/components.
- How: Update this plan with completed steps and rationale for newcomers.
- Why: Keeps future work aligned and reduces rework.
Status: Pending.

### D6a: Pricing-v2 visual spec checklist
- What: Write a single source-of-truth design blueprint for `/pricing-v2` (cards, colors, typography, gradients, shadows, spacing).
- How: Consolidate the exact tokens, class patterns, and sizes from `/pricing-v2` and global theme files into `design-principles.md`.
- Why: Removes ambiguity for future sessions when applying the `/pricing-v2` standard across the app.
Status: Completed — added a single source-of-truth `design-principles.md` with the full `/pricing-v2` card spec, colors, typography, shadows, gradients, and global theme tokens.
What was done and why:
- Captured every relevant token and class pattern from `/pricing-v2` plus the global theme palette so future work can replicate the visual system exactly without guesswork.

## Progress Notes
- Created this plan to guide a non-disruptive visual alignment effort, with a minimal MVP and staged rollout to avoid layout changes.
- Added explicit reference, constraints, and scope so future sessions understand the benchmark (`/pricing-v2`) and the staging approach (`/overview-v2` first, swap later).
