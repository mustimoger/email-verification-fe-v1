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
