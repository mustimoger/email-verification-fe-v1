# Dark Mode Plan (MVP first)

Goal: add a reliable dark mode that respects system preference, allows a user toggle, and keeps the existing visual language intact without hardcoded, scattered colors.

## Constraints
- Reuse existing UI structure and layout; only change colors/visual tokens.
- Use a single source of truth for colors (CSS variables or Tailwind theme tokens).
- MVP first, then tests (unit + integration), verify, then enhancements.

## Step-by-step plan
1) Audit current color usage and theme touchpoints (MVP groundwork)
   - Locate global theme variables and backgrounds (`app/globals.css`).
   - List component-level hardcoded colors (e.g., dashboard shell, cards, buttons).
   - Identify any one-off gradients or shadows that need tokenization.

2) Establish semantic color tokens for light + dark (MVP)
   - Define semantic tokens (surface, text primary/secondary, border, accent, muted, gradients) in one place.
   - Keep `:root` for light mode and add a dark-mode override selector (e.g., `[data-theme="dark"]`).
   - Wire tokens into Tailwind via `@theme inline` to avoid per-component hex values.

3) Theme state, persistence, and hydration-safe setup (MVP)
   - Add a lightweight theme provider (client) that:
     - Defaults to system preference.
     - Stores the user override in local storage.
     - Applies a `data-theme` attribute to `document.documentElement`.
     - Logs and falls back to system preference if storage is unavailable.
   - Add a hydration-safe initialization (small inline script or layout hook) to avoid light-to-dark flash.

4) Wire the existing “Dark Mode” menu item to the theme toggle (MVP)
   - Use the `dashboard-shell` profile menu item as the toggle entry point.
   - Show the current state (light/dark/system) for clarity and accessibility.
   - Keep navigation behavior unchanged.

5) Replace hardcoded component colors with tokens (MVP)
   - Swap hardcoded `bg/text/border` values for semantic tokens across shared components.
   - Ensure gradients/shadows use tokenized values so they adapt to dark mode.
   - Verify auth pages and dashboard pages both read from the same tokens.

6) Testing (MVP must pass before enhancements)
   - Unit tests for theme state logic: system default, user override, persistence.
   - Integration/smoke tests to confirm:
     - Theme toggles across key pages without layout changes.
     - Theme persists across navigation and reload.
   - Run existing JS test scripts and add a new test target for theme coverage if needed.

7) Manual verification (MVP)
   - Check contrast and readability in dark mode for all primary pages.
   - Confirm no flash-of-incorrect-theme during initial load.
   - Validate that charts, icons, and backgrounds stay legible.

8) Commit + deploy to main (MVP)
   - Commit the theme changes, run tests, and only then merge/deploy.

## Post-MVP enhancements (only after MVP + tests + verification)
- Add a per-user server-side preference (optional) while keeping system default.
- Refine dark-mode gradients and chart palettes for better contrast.
- Add a quick toggle in auth screens if needed.

## Implementation tracking
- [ ] Step 1 — Tokenize theme colors (light + dark) in `app/globals.css` and wire to Tailwind theme variables.
  Explanation: Pending. Establish shared semantic tokens before touching component styles.
- [ ] Step 2 — Theme state + persistence + hydration-safe init.
  Explanation: Pending. Respect system preference, store user overrides, and avoid theme flash on load.
- [ ] Step 3 — Wire the existing “Dark Mode” menu item to the theme toggle with clear state.
  Explanation: Pending. Use the profile menu as the MVP entry without changing navigation.
- [ ] Step 4 — Replace hardcoded component colors with semantic tokens.
  Explanation: Pending. Ensure gradients, shadows, and text colors adapt across pages.
- [ ] Step 5 — Tests + manual verification (unit + integration).
  Explanation: Pending. Verify persistence, navigation, and visuals before merging.
- [ ] Step 6 — Deploy to main after MVP verification.
  Explanation: Pending. Only after tests pass and manual verification is complete.
