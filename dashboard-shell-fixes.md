# Dashboard shell fixes

## Task 1 — Investigate sidebar “Available Credits” flicker on navigation
- Status: Completed.
- Why: The credits card disappears and reappears when switching sidebar routes, causing a layout jump.
- Plan:
  - Trace where the credits value is initialized and reset in `DashboardShell`.
  - Confirm whether route changes remount the shell and clear credits state.
  - Identify the smallest MVP fix that preserves accurate data without hardcoded fallbacks.
 - Done:
   - Verified `DashboardShell` is instantiated inside each page client component, so navigation remounts the shell.
   - Confirmed `creditsRemaining` initializes as `undefined` on each mount and is only set after `apiClient.getCredits()` resolves.
   - Found the credits card is gated by `hasCredits`, so it disappears until the async fetch completes, then reappears (causing the visible jump).

## Task 2 — Stabilize credits card rendering across navigation
- Status: Completed.
- Why: Prevent UI shifts by keeping the credits card visible once a valid balance is known.
- Plan:
  - Persist the last known credits balance across shell remounts using a lightweight cache (memory + sessionStorage).
  - Seed the credits state from cache before firing the async request.
  - Refresh the cache when a valid number is returned; clear the cache when the API reports a non-number balance.
  - Keep the cached balance on fetch errors so the UI does not flicker.
  - Preserve existing error logs and avoid hardcoded placeholder values.
 - Done:
   - Added `app/lib/credits-cache.ts` to store and validate credits in memory + sessionStorage with explicit logging on failures.
   - Seeded `DashboardShell` credits state from cache on session load, so the card remains visible across remounts.
   - Updated credits fetch handling to refresh the cache on valid values, clear it on invalid values, and keep cached values on fetch errors to prevent UI flicker.

## Task 3 — Tests and verification
- Status: Completed.
- Why: Ensure the fix is reliable and doesn’t regress navigation or data accuracy.
- Plan:
  - Add a unit-level test for the credits cache parsing/validation logic in `tests/credits-cache.test.ts`.
  - Add an integration-style check in the same test to verify memory + sessionStorage handoff.
  - Run the new credits-cache test plus one existing frontend test for regression coverage.
 - Done:
   - Added `tests/credits-cache.test.ts` to validate read/write/clear behavior and the memory + sessionStorage handoff.
   - Ran `source .venv/bin/activate && npx tsx tests/credits-cache.test.ts`.
   - Ran `source .venv/bin/activate && npm run test:auth-guard` for regression coverage.
 - Notes:
   - The invalid-payload test logs `credits_cache.invalid_payload` as expected for malformed cache entries.
