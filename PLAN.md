# Plan (updated after scaffold)

- [x] Baseline setup: created Next.js 14 app (app router) with TypeScript, Tailwind, ESLint, npm, and import alias `@/*`; React Compiler disabled for stability. Removed the generated `.next` cache. Purpose: establish a clean dashboard foundation to layer designs/features on.
- [x] Layout shell + theming (Overview page): replaced default page with dashboard shell matching Figma structure—sidebar nav (responsive, mobile drawer), top bar with notifications/profile, Nunito Sans typography, gradient surface, and section header. Added default avatar asset and lucide icons. Content sections remain to be built next.
- [ ] UI components/layout details: install shadcn/ui and build Overview content (stat cards, validation chart, credit usage chart, current plan card, verification tasks table) using Figma specs. Add responsive behavior and data typing.
- [ ] API integration: pending wiring to the FastAPI email verification backend (needs endpoints/contracts).
- [ ] Testing and staging: unit/integration coverage plus staging deploy to verify flows after MVP pages are in place.
- [ ] Enhancements: to follow only after MVP is fully verified.

Notes: Python venv `.venv` created for tooling; it is ignored via `.gitignore`. `node_modules` exists locally from the scaffold but stays uncommitted; run `npm install` after fresh checkout.
