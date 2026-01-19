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
Status: Completed (with follow-up note) — ran a visual QA pass on `/overview-v2`, adjusted empty-state presentation, and attempted to remove Recharts size warnings by delaying chart render until container sizes are known. The page is now visually closer to `/pricing-v2`, but Recharts still logs `width/height -1` warnings on initial render; this needs deeper investigation before final swap.
What was done and why:
- Added helper text handling so “ext api data is not available” no longer occupies the primary metric slot.
- Guarded chart rendering until the container has positive dimensions to reduce layout thrash.
- Marked the chart sections as client-rendered to safely use `ResizeObserver`.
Not yet resolved:
- Recharts still emits initial size warnings despite size guards; we should decide whether to accept, suppress, or rework the chart rendering.

### D2b: Mobile responsiveness pass on `/overview-v2`
- What: Ensure `/overview-v2` renders cleanly on small screens without overflow or cramped layouts.
- How: Review the mobile viewport and adjust grids, spacing, and table overflow to keep the UI readable and touch-friendly.
- Why: The redesign must remain mobile-friendly before we consider swapping `/overview-v2` into `/overview`.
Status: Completed — verified mobile viewport rendering, removed horizontal overflow, and added a mobile-friendly task list layout.
What was done and why:
- Added `overflow-x-hidden` to the `/overview-v2` root to prevent page-level horizontal scroll on small screens.
- Replaced the desktop table with a stacked card list on mobile (keeps the same data, improves readability).
- Kept the full table for desktop (`md+`) with horizontal scrolling when needed.
Remaining notes:
- Recharts still logs initial size warnings on first paint (tracked in D2).

### D2c: Recharts initial size warning fix
- What: Remove the `width/height -1` warnings from Recharts on `/overview-v2`.
- How: Adjust chart rendering so Recharts receives explicit, measured dimensions before render.
- Why: Clean console output and more reliable chart rendering, especially on first paint.
Status: Completed — replaced `ResponsiveContainer` with explicit chart widths/heights sourced from a `ResizeObserver`, and only render charts once dimensions are known. Console warnings about negative chart sizes are no longer emitted on initial render.

### D3: Replace `/overview` with `/overview-v2`
- What: Swap the new design into the `/overview` route and connect existing data logic.
- How: Move or copy the UI into `/overview`, reusing the current data logic without new backend work. `/overview-v2` can be removed once `/overview` is updated.
- Why: Delivers the upgraded design without altering backend behavior.
Status: Pending.

### D4: Rollout to remaining pages
- What: Align the rest of the dashboard pages to the new shared visual standard.
- How: Apply the same surface tokens and components to each page, without layout changes.
- Why: Achieves consistency while preserving existing UX patterns.
Status: Pending.
Pages to update:
- Verify
- History
- Integrations
- API
- Pricing (v1)
- Account

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

## Progress Notes
- Created this plan to guide a non-disruptive visual alignment effort, with a minimal MVP and staged rollout to avoid layout changes.
- Added explicit reference, constraints, and scope so future sessions understand the benchmark (`/pricing-v2`) and the staging approach (`/overview-v2` first, swap later).
