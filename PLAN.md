# Plan (updated after scaffold)

- [x] Baseline setup: created Next.js 14 app (app router) with TypeScript, Tailwind, ESLint, npm, and import alias `@/*`; React Compiler disabled for stability. Removed the generated `.next` cache. Purpose: establish a clean dashboard foundation to layer designs/features on.
- [ ] UI components/layout: pending shadcn/ui install and dashboard layout build once Figma page links are provided.
- [ ] API integration: pending wiring to the FastAPI email verification backend (needs endpoints/contracts).
- [ ] Testing and staging: unit/integration coverage plus staging deploy to verify flows after MVP pages are in place.
- [ ] Enhancements: to follow only after MVP is fully verified.

Notes: Python venv `.venv` created for tooling; it is ignored via `.gitignore`. `node_modules` exists locally from the scaffold but stays uncommitted; run `npm install` after fresh checkout.
