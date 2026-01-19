# Design Principles: Pricing-v2 Card Spec (Exact Blueprint)

Purpose
- Provide a single source of truth for the visual system used on `/pricing-v2`, so every other page can match it exactly.

Sources
- `app/pricing-v2/pricing-v2.module.css`
- `app/pricing-v2/pricing-v2-client.tsx`
- `app/pricing-v2/pricing-v2-sections.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `app/components/dashboard-shell.tsx`

Framework and structure
- Next.js + Tailwind CSS v4 utility classes.
- Page-scoped CSS variables (pricing tokens) applied via `styles.root` on the page section.
- Layout container: `DashboardShell` uses `main` with `px-4 py-6 sm:px-6 lg:px-10` and a `max-w-6xl` inner wrapper.

Typography (global)
- Font family: Nunito Sans (Google font) via `app/layout.tsx`, applied to `body` in `app/globals.css`.
- Primary heading scale in pricing:
  - Hero H1: `text-3xl sm:text-5xl`, `font-semibold`, `text-[var(--text-primary)]`.
  - Section H2: `text-2xl`, `font-semibold`, `text-[var(--text-primary)]`.
  - Price display: `text-5xl`, `font-semibold`, `text-[var(--text-primary)]`.
- Utility labels: `text-xs`, `uppercase`, `tracking-[0.2em]`, `font-semibold`, `text-[var(--text-muted)]`.
- Body text: `text-sm` or `text-base`, `text-[var(--text-secondary)]` or `text-[var(--text-muted)]`.

Global theme tokens (all colors)
Light theme (`:root` in `app/globals.css`)
- --surface: #f5f6fb
- --surface-elevated: #ffffff
- --surface-muted: #eef2ff
- --surface-soft: #f8fafc
- --surface-strong: #f1f4f9
- --surface-overlay: rgba(255, 255, 255, 0.8)
- --surface-overlay-strong: rgba(255, 255, 255, 0.95)
- --surface-overlay-soft: rgba(255, 255, 255, 0.5)
- --text-primary: #111827
- --text-secondary: #4b5563
- --text-muted: #9ca3af
- --text-inverse: #ffffff
- --border: #e5e7eb
- --border-strong: #d1d5db
- --divider: #e2e8f0
- --accent: #4c61cc
- --accent-hover: #3f52ad
- --accent-soft: #e9edff
- --accent-contrast: #ffffff
- --ring: rgba(76, 97, 204, 0.35)
- --overlay: rgba(15, 23, 42, 0.4)
- --overlay-strong: rgba(15, 23, 42, 0.7)
- --nav-surface: #2f47c7
- --nav-hover: rgba(76, 97, 204, 0.7)
- --nav-active: #4c61cc
- --nav-muted: rgba(255, 255, 255, 0.8)
- --nav-muted-hover: rgba(255, 255, 255, 0.12)
- --nav-shadow: 0 8px 24px rgba(15, 23, 42, 0.2)
- --status-success: #0eb38b
- --status-success-soft: #ecfdf5
- --status-danger: #ef4444
- --status-danger-soft: #fee2e2
- --status-warning: #f59e0b
- --status-warning-soft: #fffbeb
- --status-info: #3b82f6
- --status-unknown: #94a3b8
- --chart-valid: #0eb38b
- --chart-catchall: #d97706
- --chart-invalid: #ff6b6b
- --chart-processing: #cbd5f5
- --chart-line: #3b82f6
- --cta: #ffe369
- --cta-hover: #ffd84d
- --cta-foreground: #111827
- --avatar-start: #6ea8ff
- --avatar-mid: #f089ff
- --avatar-end: #ffba7a
- --auth-surface: #4880ff
- --auth-panel: #ffffff
- --auth-glow-1: rgba(255, 255, 255, 0.14)
- --auth-glow-2: rgba(255, 255, 255, 0.12)
- --auth-glow-3: rgba(255, 255, 255, 0.1)
- --app-background: radial-gradient(circle at 20% 20%, #ffffff 0, #eef2ff 35%), radial-gradient(circle at 80% 0%, #ffffff 0, #f3f4f6 40%), linear-gradient(180deg, #f7f8fb 0%, #edf1ff 100%)

Dark theme (`[data-theme="dark"]` in `app/globals.css`)
- --surface: #0f1424
- --surface-elevated: #171f36
- --surface-muted: #141c31
- --surface-soft: #111a2f
- --surface-strong: #1c2842
- --surface-overlay: rgba(23, 31, 54, 0.82)
- --surface-overlay-strong: rgba(23, 31, 54, 0.94)
- --surface-overlay-soft: rgba(23, 31, 54, 0.6)
- --text-primary: #f8fafc
- --text-secondary: #c7d2fe
- --text-muted: #94a3b8
- --text-inverse: #f8fafc
- --border: #27324d
- --border-strong: #33415f
- --divider: #24304a
- --accent: #7aa2ff
- --accent-hover: #5f84ea
- --accent-soft: rgba(122, 162, 255, 0.16)
- --accent-contrast: #0f1424
- --ring: rgba(122, 162, 255, 0.4)
- --overlay: rgba(15, 20, 36, 0.7)
- --overlay-strong: rgba(15, 20, 36, 0.85)
- --nav-surface: #1e2b66
- --nav-hover: rgba(122, 162, 255, 0.3)
- --nav-active: #3554c6
- --nav-muted: rgba(248, 250, 252, 0.78)
- --nav-muted-hover: rgba(248, 250, 252, 0.12)
- --nav-shadow: 0 8px 24px rgba(4, 10, 24, 0.45)
- --status-success: #22c55e
- --status-success-soft: rgba(34, 197, 94, 0.14)
- --status-danger: #f87171
- --status-danger-soft: rgba(248, 113, 113, 0.14)
- --status-warning: #fbbf24
- --status-warning-soft: rgba(251, 191, 36, 0.14)
- --status-info: #60a5fa
- --status-unknown: #94a3b8
- --chart-valid: #34d399
- --chart-catchall: #f59e0b
- --chart-invalid: #f87171
- --chart-processing: #475569
- --chart-line: #60a5fa
- --cta: #facc15
- --cta-hover: #fbbf24
- --cta-foreground: #0f1424
- --avatar-start: #7aa2ff
- --avatar-mid: #b784ff
- --avatar-end: #ffb36b
- --auth-surface: #1f2b65
- --auth-panel: #141c31
- --auth-glow-1: rgba(122, 162, 255, 0.2)
- --auth-glow-2: rgba(122, 162, 255, 0.16)
- --auth-glow-3: rgba(122, 162, 255, 0.12)
- --app-background: radial-gradient(circle at 20% 20%, #141c31 0, #0f1424 35%), radial-gradient(circle at 80% 0%, #1c2642 0, #101728 40%), linear-gradient(180deg, #0b1122 0%, #121a2f 100%)

Pricing-v2 page tokens (all colors)
Light theme (`app/pricing-v2/pricing-v2.module.css`)
- --pricing-accent: #f9a825
- --pricing-accent-strong: #f57c00
- --pricing-accent-soft: rgba(249, 168, 37, 0.14)
- --pricing-accent-soft-strong: rgba(249, 168, 37, 0.22)
- --pricing-card: rgba(255, 255, 255, 0.92)
- --pricing-card-strong: rgba(255, 255, 255, 0.98)
- --pricing-card-muted: rgba(248, 250, 252, 0.9)
- --pricing-border: rgba(148, 163, 184, 0.25)
- --pricing-track: rgba(148, 163, 184, 0.3)
- --pricing-thumb: #ffffff
- --pricing-shadow: 0 24px 60px rgba(15, 23, 42, 0.08)
- --pricing-cta-ink: #111827

Dark theme (`app/pricing-v2/pricing-v2.module.css`)
- --pricing-card: rgba(15, 23, 42, 0.78)
- --pricing-card-strong: rgba(15, 23, 42, 0.92)
- --pricing-card-muted: rgba(15, 23, 42, 0.64)
- --pricing-border: rgba(148, 163, 184, 0.2)
- --pricing-track: rgba(148, 163, 184, 0.2)
- --pricing-thumb: #0f1424
- --pricing-shadow: 0 28px 70px rgba(4, 10, 24, 0.45)
- --pricing-cta-ink: #0f1424

Card spec checklist (apply exactly)
Main cards
- Hero container: `rounded-[28px] border border-[var(--pricing-border)] bg-[var(--pricing-card)] shadow-[var(--pricing-shadow)] overflow-hidden px-6 py-10 sm:px-10`.
- Summary card: `rounded-2xl border border-[var(--pricing-border)] bg-[var(--pricing-card-strong)] shadow-[var(--pricing-shadow)] p-6 lg:sticky lg:top-6`.

Section cards (large blocks below hero)
- `rounded-[24px] border border-[var(--pricing-border)] bg-[var(--pricing-card-muted)] p-6 sm:p-10`.
- Final CTA variant: same radius/border but `bg-[var(--pricing-accent-soft)] p-8 sm:p-12`.
- No extra drop shadow on these blocks.

Inner cards / sub-cards
- Feature list card: `rounded-2xl border border-[var(--pricing-border)] bg-[var(--pricing-card-muted)] p-6`.
- FAQ item: `rounded-2xl border border-[var(--pricing-border)] bg-white/70 p-6`.
- Volume tier button: `rounded-xl border border-[var(--pricing-border)] bg-white/70 px-4 py-4`.
  - Active state: `border-[var(--pricing-accent)] bg-[var(--pricing-accent-soft)]`.
- Comparison header cell: `rounded-t-xl bg-[var(--pricing-accent-soft)] px-4 py-3`.
- Comparison body highlight cell: `bg-white/60` + `border-t border-[var(--pricing-border)]`.

Corner radius map
- 28px: hero card (`rounded-[28px]`).
- 24px: section cards (`rounded-[24px]`).
- 16px: standard cards (`rounded-2xl`).
- 12px: buttons/tabs (`rounded-xl`).
- 8px: helper boxes (`rounded-lg`).
- Full: chips/pills (`rounded-full`).

Borders
- Width: 1px (`border`, `border-t`).
- Color: `--pricing-border` (light/dark values above).

Shadows
- Card shadow token: `--pricing-shadow`.
- CTA button shadow: `0 16px 32px rgba(249, 168, 37, 0.3)`.
- Slider thumb shadow: `0 6px 16px rgba(249, 168, 37, 0.35)`.

Buttons
- Primary CTA: `rounded-xl bg-[linear-gradient(135deg,var(--pricing-accent)_0%,var(--pricing-accent-strong)_100%)] text-[var(--pricing-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)] px-6 py-3 text-sm font-semibold`.
- Secondary CTA: `rounded-xl border border-[var(--pricing-border)] bg-white/60 px-6 py-3 text-sm font-semibold text-[var(--text-secondary)]`.
- Plan tabs: `rounded-xl px-4 py-2 text-sm font-semibold` with active gradient background and optional savings pill.
- Savings pill: `rounded-md px-2 py-0.5 text-[10px] font-bold`.

Form fields (pricing slider + input)
- Input: `rounded-xl border border-[var(--pricing-border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm`.
- Range track: height 8px, radius 999px, gradient `var(--pricing-accent)` to `var(--pricing-track)` via `--range-progress`.
- Range thumb: 24px, radius 999px, gradient `var(--pricing-accent)` to `var(--pricing-accent-strong)`, border `3px solid var(--pricing-thumb)`.

Background glows (page-level)
- Container: `pointer-events-none absolute inset-0 overflow-hidden`.
- Glow 1: `h-[420px] w-[720px]` with `bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.25)_0%,_transparent_70%)]`, positioned `-top-48 left-1/2 -translate-x-1/2`.
- Glow 2: `h-[320px] w-[320px]` with `bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.12)_0%,_transparent_70%)]`, positioned `right-[-120px] top-[120px]`.

Motion
- Entrance transition: `opacity-100 translate-y-0` with `transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1)` and staggered delays.

Checklist for reuse across pages
- Apply pricing-v2 tokens at the page root (`styles.root`).
- Use the radius map exactly for each card tier.
- Match `border` + `--pricing-border` on all card surfaces.
- Use `--pricing-shadow` only on the hero and summary cards, not on section blocks.
- Preserve text color tokens (`--text-primary`, `--text-secondary`, `--text-muted`) for consistent hierarchy.
- Use the same gradient and glow treatments for hero sections.
