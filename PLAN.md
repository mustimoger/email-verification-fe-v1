# Plan (carry forward)

- [x] Baseline setup — Next.js 14 (app router) with TypeScript, Tailwind, ESLint, npm, and alias `@/*`; React Compiler disabled. Clean base to layer dashboard features.
- [x] Layout shell + theming — Built shared sidebar/topbar shell per Figma: responsive drawer, notifications/profile, Nunito Sans, gradient surface. Sidebar uses `public/logo.png` (BoltRoute) image logo (matches `Screenshot_1.png`), not text. Avatar uses `public/profile-image.png` with fallback initials. Purpose: consistent chrome to reuse across pages.
- [x] Overview content — Implemented Overview screen per Figma with typed mock data: stat summary cards, validation donut (Recharts Pie), credit usage line chart, current plan card, verification tasks table with status pills and month selector, profile dropdown. Responsive grid, lucide icons. This is the only built page; other nav items are marked unavailable.
- [x] Shadcn variant removal — Removed previous shadcn/ui variant to keep a single Tailwind implementation at `/overview` (root `/` redirects). Ensures one canonical path.
- [ ] Remaining pages — Verify, History, Integrations, API, Pricing, Account need to be built using the shared shell once Figma node details are provided. Use first-principles MVPs, no placeholders.
- [ ] API integration — Wire UI to FastAPI email verification backend once endpoint schemas/contracts are known. Replace mock data with typed fetch layer + error handling/logging; avoid hardcoded fallbacks.
- [ ] Testing and staging — Add unit/integration coverage and deploy to staging after MVP pages and API wiring are in place; verify flows end-to-end.
- [ ] Enhancements — Only after MVP + tests + staging verification.

Notes for continuity: Python venv `.venv` exists (ignored). `node_modules` present locally (uncommitted). Root `/` redirects to `/overview`; main page at `app/overview/page.tsx`. A dev server may still be running on port 3001 (see handover if needed).

## Current sprint: Initial Verify page (first state only)
- [x] Pull Figma specs for the initial Verify page (layout, spacing, colors, interaction notes) via Figma MCP to drive implementation.  
  Explanation: fetched design context for node `51:306` (Verify initial page) and captured screenshot via Figma MCP (`get_screenshot`, see local session). Confirms layout: shared sidebar/topbar identical to Overview plus footer links (“Privacy Policy & Terms”, “Cookie Pereferences”), manual email input card with textarea + VERIFY button, results panel, file upload section with drag/drop and Browse button, light gray background.
- [x] Implement `/verify` using the shared sidebar/topbar shell: manual entry form + results display + file upload dropzone UI per design; enable nav entry (Overview shell reuse). Include footer per design.  
  Explanation: Refactored shared dashboard shell (sidebar/topbar/footer) and reused it for Overview + new `/verify`. Nav now links to `/verify` (others disabled). Verify page matches Figma: manual email textarea with VERIFY CTA, results panel (shows parsed emails as pending), file upload dropzone with drag/drop + Browse, and footer links. Added front-end limits (max 5 files, 5 MB each) and log events for manual and upload flows; no backend calls yet.
- [ ] Add basic client-side behavior/logging and minimal tests covering form state/validation wiring; leave clear integration hook for FastAPI when contracts arrive. (Logging and parsing in place; automated tests still needed.)
- [ ] Summarize changes and outcomes for newcomers; pause for confirmation before proceeding to popup flow/second Verify state.
