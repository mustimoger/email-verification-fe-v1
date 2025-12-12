# Plan (updated after scaffold)

- [x] Baseline setup: created Next.js 14 app (app router) with TypeScript, Tailwind, ESLint, npm, and import alias `@/*`; React Compiler disabled for stability. Removed the generated `.next` cache. Purpose: establish a clean dashboard foundation to layer designs/features on.
- [x] Layout shell + theming (Overview page): replaced default page with dashboard shell matching Figma structure—sidebar nav (responsive, mobile drawer), top bar with notifications/profile, Nunito Sans typography, gradient surface, and section header. Added default avatar asset and lucide icons. Content sections remain to be built next.
- [x] Overview content: built Figma-based cards, charts, and table using typed sample data—stat summary grid, validation donut chart, credit usage line chart, current plan card, verification tasks table with status pills and month selector, and profile dropdown menu per Figma. Responsive grid layout; icons via lucide; charts via Recharts.
- [ ] UI components/layout details: integrate shadcn/ui primitives if required for consistency across pages; extend layouts to remaining dashboard pages once their Figma links are provided.
- [ ] API integration: pending wiring to the FastAPI email verification backend (needs endpoints/contracts).
- [ ] Testing and staging: unit/integration coverage plus staging deploy to verify flows after MVP pages are in place.
- [ ] Enhancements: to follow only after MVP is fully verified.

Notes: Python venv `.venv` created for tooling; it is ignored via `.gitignore`. `node_modules` exists locally from the scaffold but stays uncommitted; run `npm install` after fresh checkout.
