# UI Progress: Auth Marketing Card

## Tasks
- [x] Task 1 - Increase marketing card scale/typography and reduce background opacity on `/signin` and `/signup` (MVP).
- [x] Task 2 - Verify responsiveness and run unit + integration tests.
- [ ] Task 3 - Allow local frontend origins in backend CORS for local auth flows.
- [ ] Task 4 - Restart local backend and validate auth confirmation check requests succeed from `http://localhost:3001`.
- [ ] Task 5 - Improve dark-mode text contrast on `/signin` and `/signup` without changing layout.
- [ ] Task 6 - Validate dark-mode readability and run unit + integration tests after color updates.
- [ ] Task 7 - Keep the left sidebar visible while scrolling dashboard pages on desktop.
- [ ] Task 8 - Validate sidebar behavior and run unit + integration tests after layout adjustments.
- [x] Task 9 - Add static limit notes to `/verify` manual (Max 25 emails) and bulk upload (100MB file size) cards (MVP).
- [x] Task 10 - Validate `/verify` UI and run unit + integration tests after limit note updates.
- [x] Task 11 - Adjust `/verify` manual limit note copy to match exact requested punctuation and add a bulk upload 100MB limit note using the same visual style as the manual note (MVP).
- [x] Task 12 - Validate `/verify` UI and run unit + integration tests after the manual/bulk note updates.
- [x] Task 13 - Update dashboard footer to show Privacy Policy, Terms of Service, and GDPR Compliance links (new tab) without changing styling; remove Cookie Preferences (MVP).
- [x] Task 14 - Validate dashboard footer behavior and run unit + integration tests after footer link updates.
- [x] Task 15 - Review pricing iframe auth error and identify which auth guard/token check triggers the "Missing auth token" message (MVP).
- [x] Task 16 - Allow unauthenticated access to the embedded `/pricing` view without changing UI styling (MVP).
- [x] Task 17 - Validate pricing embed behavior for logged-out users and run unit + integration tests.
- [ ] Task 18 - Confirm bulk upload completion email notification requirements (trigger, payload, template, success/failure rules).
- [ ] Task 19 - Add SMTP config + mailer service for bulk upload completion notifications (MVP).
- [ ] Task 20 - Implement completion-triggered notification flow with idempotency tracking (MVP).
- [ ] Task 21 - Validate notification flow and run unit + integration tests.
- [x] Task 22 - Confirm consent banner requirements (scope, categories, gated scripts, legal link configuration).
- [x] Task 23 - Implement MVP consent banner + consent storage and gate non-essential scripts (Crisp chat, checkout).
- [x] Task 24 - Validate consent flow and run unit + integration tests.
- [x] Task 25 - Fix dark-mode auth input styling after data entry on `/signin` and `/signup` (MVP).
- [x] Task 26 - Validate dark-mode auth input updates and run unit + integration tests.
- [x] Task 27 - Update API hero buttons to integrations + external API docs links (MVP).
- [x] Task 28 - Validate API hero CTA updates and run unit + integration tests.

## Progress log
### Task 1 - Completed
- What: Scaled the auth marketing card and typography using CSS variables, and reduced the background opacity by 50%.
- Why: Meet the requested 2x sizing while keeping the layout responsive and configurable across auth pages.
- How: Added global auth-benefits tokens, updated `AuthBenefitsCard` to use scale-aware spacing/typography, and expanded the card max width on `/signin` and `/signup` using the scale token.

### Task 2 - Completed
- What: Ran the full test suite and checked responsive impact for the auth marketing card.
- Why: MVP changes require unit + integration coverage and confirmation that layout behavior remains stable.
- How: Activated the Python venv, loaded `.env.local`, executed all `tests/*.test.ts` with `tsx`, and confirmed the card remains hidden below `lg` so mobile layout is unaffected; console warnings from tests are expected debug logs.

### Task 3 - Completed
- What: Added local frontend origins (`http://localhost:3001`, `http://127.0.0.1:3001`) to backend CORS settings.
- Why: Local auth and email confirmation checks need to call the local FastAPI backend without browser CORS blocking.
- How: Updated `BACKEND_CORS_ORIGINS` in `backend/.env` to include local origins alongside existing production domains.

### Task 4 - Completed
- What: Confirmed local backend restart and auth confirmation checks working with the updated CORS settings.
- Why: Ensure local sign-in flows can call the backend without CORS errors.
- How: User restarted the backend manually; login/confirmation flows now succeed in local dev.

### Task 5 - Completed
- What: Updated `/signin` and `/signup` typography colors to use theme tokens for dark-mode readability.
- Why: Hard-coded dark text colors were nearly invisible in dark mode.
- How: Replaced fixed hex text colors with `var(--text-primary)`, `var(--text-secondary)`, and `var(--text-muted)` for headings, labels, input text, and helper copy.

### Task 6 - Completed
- What: Ran unit + integration tests after the dark-mode color updates.
- Why: Ensure UI-only changes did not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, ran all `tests/*.test.ts` via `tsx`; initial run failed due to missing Supabase env vars, then succeeded once environment variables were loaded. Logged warnings are expected debug output from tests.

### Task 7 - Completed
- What: Adjusted the dashboard sidebar to remain visible while scrolling.
- Why: The sidebar was leaving the viewport on long pages, making navigation inaccessible.
- How: Switched the desktop sidebar from `lg:static` to `lg:sticky` with `lg:top-0` and `lg:self-start`.

### Task 8 - Completed
- What: Re-ran unit + integration tests after the sidebar layout tweak.
- Why: Confirm layout change did not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and ran all `tests/*.test.ts` via `tsx`; warnings are expected debug output.

### Task 9 - Completed
- What: Added static limit notes to `/verify` for manual (max 25 emails) and bulk upload (max 100MB file size).
- Why: Communicate ext API constraints in the UI without changing layout or flow.
- How: Updated the manual verification note copy to include the email cap and added a small pill badge to the bulk upload card indicating the file size limit.

### Task 10 - Completed
- What: Re-ran unit + integration tests after the `/verify` limit note updates.
- Why: Ensure UI-only copy changes do not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and ran all `tests/*.test.ts` via `tsx`.

### Task 11 - Completed
- What: Updated `/verify` manual note copy to the exact requested punctuation and replaced the bulk upload limit pill with a matching warning-style note.
- Why: Match requested wording and keep both manual/bulk limit notes visually consistent.
- How: Edited the manual note string verbatim and inserted the bulk limit note using the same border, background, and typography style as the manual note.

### Task 12 - Completed
- What: Re-ran unit + integration tests after the manual/bulk note updates.
- Why: Confirm UI copy/layout adjustments did not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and ran all `tests/*.test.ts` via `tsx`.

### Task 13 - Completed
- What: Replaced dashboard footer buttons with Privacy Policy, Terms of Service, and GDPR Compliance links, and removed the Cookie Preferences item.
- Why: Provide correct legal links that open in new tabs without altering visual styling.
- How: Swapped footer `button` elements for anchor tags with the same classes, added external URLs, and set `target="_blank"` with `rel="noreferrer noopener"`.

### Task 14 - Completed
- What: Re-ran unit + integration tests after footer link updates.
- Why: Confirm UI-only changes do not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and ran all `tests/*.test.ts` via `tsx`.

### Task 15 - Completed
- What: Identified the source of the "Missing auth token" error in the pricing iframe flow.
- Why: We need the exact auth guard blocking unauthenticated pricing data before changing behavior.
- How: Traced the pricing page to `billingApi.getPricingConfigV2()` and confirmed `/api/billing/v2/config` is protected by `get_current_user`, which throws `Missing auth token` when no session is present.

### Task 16 - Completed
- What: Made `/api/billing/v2/config` accessible without authentication to unblock the pricing embed.
- Why: The pricing iframe needs pricing config/quotes for logged-out users without triggering `Missing auth token`.
- How: Added an optional auth dependency in `backend/app/core/auth.py`, updated the config endpoint to accept optional users safely, and added a test to confirm unauthenticated access.

### Task 17 - Completed
- What: Ran pricing backend tests after enabling unauthenticated pricing config.
- Why: Ensure the new optional-auth path is covered and does not break pricing flow.
- How: Activated the Python venv and ran `pytest backend/tests/test_pricing_v2.py`; warnings are from dependencies.

### Task 18 - Pending
- What: Confirm bulk upload completion email notification requirements (trigger, payload, template, success/failure rules).
- Why: We need precise notification behavior and message content before implementing SMTP or webhook handling.
- How: Waiting on clarification for webhook payloads, notification timing, and email copy; no code changes yet.

### Task 19 - Pending
- What: Add SMTP config + mailer service for bulk upload completion notifications (MVP).
- Why: A dedicated SMTP integration is required to send completion emails via Acumbamail.
- How: Blocked until SMTP details and template requirements are confirmed.

### Task 20 - Pending
- What: Implement completion-triggered notification flow with idempotency tracking (MVP).
- Why: Ensure each bulk upload completion sends one email and avoids duplicate notifications.
- How: Blocked pending decision on trigger source (webhook vs polling) and idempotency storage.

### Task 21 - Pending
- What: Validate notification flow and run unit + integration tests.
- Why: MVP changes must be verified with tests to avoid regressions.
- How: Will run backend tests once implementation is complete.

### Task 22 - Pending
### Task 22 - Completed
- What: Confirmed consent banner requirements (scope, UX, gated scripts, storage, legal link sources).
- Why: Clear decisions are needed to implement a compliant MVP without guessing.
- How: Scoped the banner to first visit on any page, set Accept/Reject-only UX, chose to gate Crisp chat and the checkout script until accept, and kept logging local-only using stored consent; legal URLs will be read from optional env vars.

### Task 23 - Completed
- What: Implemented the MVP consent banner, consent storage helper, and gated non-essential scripts (Crisp chat + checkout script).
- Why: Ensure non-essential scripts only load after explicit opt-in while keeping the UI subtle and consistent with the dashboard design.
- How: Added a consent storage module + hook, rendered a fixed bottom banner with Accept/Reject controls, gated Crisp initialization + checkout script loading on consent, and centralized legal link retrieval via env-driven config (with warnings when missing).

### Task 24 - Completed
- What: Validated the consent flow changes and ran unit + integration tests.
- Why: Confirm consent gating and UI updates did not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and executed all `tests/*.test.ts` via `./node_modules/.bin/tsx`.

### Task 25 - Completed
- What: Fixed dark-mode auth input styling after data entry on `/signin` and `/signup`.
- Why: Inputs were using hard-coded light backgrounds that looked wrong in dark mode.
- How: Replaced hard-coded border/background colors with theme tokens and added a dedicated `auth-input` class for targeted autofill styling.

### Task 26 - Completed
- What: Validated dark-mode auth input updates and ran unit + integration tests.
- Why: Ensure the auth input styling updates do not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and executed all `tests/*.test.ts` via `./node_modules/.bin/tsx`.

### Task 27 - Completed
- What: Updated API hero buttons to "Check integrations" and "API docs" with the correct destinations.
- Why: The prior CTA buttons were redundant within the API page.
- How: Swapped the primary CTA to `/integrations` and the secondary CTA to the external API docs link.

### Task 28 - Completed
- What: Validated API hero CTA updates and ran unit + integration tests.
- Why: Ensure CTA changes do not introduce regressions.
- How: Activated the Python venv, loaded `.env.local`, and executed all `tests/*.test.ts` via `./node_modules/.bin/tsx`.
