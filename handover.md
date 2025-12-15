# Handover (current session wrap-up)

## State of codebase
- App runs at `/overview` (root `/` redirects). Sidebar/topbar layout intact; sidebar logo is reverted to the original text logo (no `public/logo.png` in use).
- Profile avatar now uses `public/profile-image.png`; fallback initials only show if the image fails.
- Overview page (`app/overview/page.tsx`) matches Figma: stat cards, validation donut, credit-usage line chart, current plan card, verification tasks table, profile dropdown, unified sidebar text color, Settings removed, Logout sits under main nav items.
- Shadcn/ui variant removed; stack is Next.js + Tailwind + Recharts + lucide + Nunito.

## Running dev server
- A dev server is currently running on port 3001 (PID `452893`) via `npm run dev -- --port 3001 --hostname 0.0.0.0`. Stop with `kill 452893` if needed.
- If you see port/lock errors, delete `.next/dev/lock` and restart `npm run dev`.

## Untracked files
- `Screenshot_2.png`, `Screenshot_3.png`, `Screenshot_4.png` (reference images). Not committed.

## Pending tasks / next steps
- Implement remaining dashboard pages from Figma (Verify, History, Integrations, API, Pricing, Account) reusing the shared sidebar/header shell.
- Wire UI to FastAPI backend (need endpoints/contracts). Replace typed mock data with real calls; add typed fetch layer and error handling.
- Add tests (unit/integration) and staging deploy once MVP pages are built.
- Branding: if a finalized logo asset is needed, reintroduce `public/logo.png` and swap the sidebar header image accordingly.

## Notes
- Caching: Next.js dev keeps artifacts in `.next/`; remove it for a clean build if necessary. Browsers may cache static assets—hard refresh if you don’t see updates.
