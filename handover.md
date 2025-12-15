# Handover (current session wrap-up)

## State of codebase
- Shared shell (`app/components/dashboard-shell.tsx`) with active links for Overview, Verify, History, Integrations, API, Pricing, Account; profile menu stub; footer links. Sidebar logo uses `public/logo.png`; avatar uses `public/profile-image.png` with fallback initials.
- Overview page (`app/overview/page.tsx`) built per Figma with stat cards, donut/line charts, plan card, tasks table.
- Verify page (`app/verify/page.tsx`): initial state (manual input/results + upload dropzone), post-upload state (summary table + validation donut), and two popups (file confirmation + column mapping) controlled by `flowStage`. Front-end limits for files, logs for actions; no backend calls yet.
- History page (`app/history/page.tsx`): table per Figma (Date, Filename/Total, Valid, Invalid, Catch-all, Action pills).
- Integrations page (`app/integrations/page.tsx`): three logo cards (Zapier, n8n, Google Sheets) + “More coming soon...”; assets in `public/integrations/*.png`.
- API page (`app/api/page.tsx`): two cards—API keys table (mock data) and usage card (API key dropdown, date range, See Usage/Download buttons, line chart placeholder with mock data). Logs actions for backend wiring.
- Pricing page (`app/pricing/page.tsx`): four tier cards per Figma with features and CTA, typed data.
- Account page (`app/account/page.tsx`): profile card (avatar, edit link, fields, Update button), purchase history table with Download pills, total credits summary. Typed data; logs on update.
- Routing: `/` redirects to `/overview`. All new pages under `/verify`, `/history`, `/integrations`, `/api`, `/pricing`, `/account`.
- Assets: integrations logos in `public/integrations/`; existing `profile-image.png`, `logo.png`.
- PLAN.md updated through Account/Integrations/API/Pricing completion; outstanding items are tests/backend wiring and a summary task for Verify still marked pending in plan steps (see below).
- Untracked: `Screenshot_1.png` still local only.

## Pending tasks / next steps
- Add tests (unit/integration) for the new pages and behaviors (Verify flow state machine, forms, table rendering).
- Wire frontend to FastAPI backend: replace mock data/logs in Verify (manual/file flows), History, API (keys/usage), Account (profile update, purchases, credits), Integrations links. Need endpoint contracts.
- Clean up PLAN.md pending steps: still marked pending for “Add basic client-side behavior/logging and minimal tests...” and “Summarize changes...” under Verify sprint. (Logging exists; tests missing.)
- Optional: handle logo if a finalized asset is needed; `Screenshot_1.png` is untracked reference.

## Running/Tooling
- Next.js app with Tailwind; lint via `npm run lint`. Python venv `.venv` exists (ignored). Node modules present locally.

## Notes/Decisions
- No backend calls yet; all data typed in-page. Console logs added where backend wiring is expected.
- File upload flow in Verify enforces 5 files max, 5 MB each; derives mock summary from size/name; mapping/flags captured for handoff.
- Sidebar links all enabled; nav highlighting handled via pathname prefix match.
