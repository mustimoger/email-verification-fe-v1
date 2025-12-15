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

## Next: Second Verify state (post-upload)
- [x] Pull Figma specs for second Verify state via Figma MCP; captured screenshot (node `64:75`) showing results table + validation donut. Footer and shell unchanged.
- [x] Implement second Verify state UI: render verification summary (total emails, upload date), results table with per-file stats + download/pending badges, validation donut chart, keeping existing shell/footer. Reuse existing Verify route with conditional state.  
  Explanation: `/verify` now conditionally renders the post-upload state when files are selected: summary header, per-file stats table with download/pending pills, validation donut chart using aggregated counts, plus upload/reset actions. Data is derived deterministically from selected files (size/name) with console logs; clearly marked for backend replacement. Dropzone remains for pre-upload state; shell/footer unchanged.
- [ ] Update PLAN.md notes and await confirmation before moving to further pages or backend wiring.

## Upcoming: Verify flow popups
- [x] Pull Figma specs for Popup 1 (file verify popup stage 1) via Figma MCP (node `60:54`) and captured screenshot. Design: modal with pill chips for selected files, total email count notice, primary CTA “VERIFY EMAILS”, link to go back to upload.
- [x] Pull Figma specs for Popup 2 (file verify popup stage 2) via Figma MCP (node `60:86`) and captured screenshot. Design: modal for column mapping (per-file dropdowns for email column), two yes/no radio questions, CTA “PROCEED”, back link.
- [x] Implement both popups in Verify flow: trigger after file selection and before showing post-upload state; allow going back to upload; collect mapping + flags and feed into summary state. Follow shared shell/modal styling; no hardcoded fallbacks.  
  Explanation: `/verify` now stages file upload -> Popup 1 (file chips + total count + verify CTA) -> Popup 2 (column mapping per file, two yes/no radios) -> summary table/donut. State machine `flowStage` controls views; reset returns to upload. Mapping/flags stored and logged for backend handoff. Dropzone and manual input remain intact.

## History page
- [x] Pull Figma specs via MCP and capture screenshot (node `65:5`). Design: shared shell/footer, table listing history rows with columns DATE, FILENAME/TOTAL, VALID, INVALID, CATCH-ALL, ACTION (Download/Pending pills), pagination note “Showing 1-09 of 78”.
- [x] Implement History page UI per Figma using shared shell; align nav highlight, spacing, and pills per design. Use typed sample data; wire to backend later.  
  Explanation: Added `/history` with table layout (Date, Filename/Total, Valid, Invalid, Catch-all, Action) using shared shell/footer. Status pills for Download/Pending mirror design. Uses typed sample rows and formatting helpers; ready for backend data swap.

## Integrations page
- [x] Pull Figma specs via MCP and capture screenshot (node `65:339`). Design: shared shell/footer, three integration cards (Zapier, n8n, Google Sheets), text “More coming soon...”.
- [x] Implement Integrations page UI per Figma using shared shell; render logo cards and supporting text; keep layout responsive. Wire real integration links later.  
  Explanation: Added `/integrations` with three logo cards (Zapier, n8n, Google Sheets) and “More coming soon...” text, matching spacing/background from Figma. Assets saved under `public/integrations/*.png`. Shared shell/footer reused; ready to link to real integration flows later.

## API page
- [x] Implement simplified API page: card 1 with API keys table (name, masked key, status pill, edit action); card 2 with usage controls (API key dropdown, date range, actions) and line chart placeholder with mock data/empty state. Shared shell/footer reused; console logs for future backend wiring.

## Pricing page
- [x] Implemented Pricing page per Figma: four tier cards in a grid, each with title, “Credits Never Expire” note, price (last card “Contact Us”), feature list, and “Start Verification” CTA. Shared shell/footer reused; typed feature data for now.

## Account page
- [x] Implemented Account page per Figma: profile card with avatar, edit link, username/email/password fields, and Update button; purchase history table with invoice download pills; total credits summary card. Uses typed data and shared shell/footer; backend wiring TBD.
