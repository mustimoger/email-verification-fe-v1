# Pricing Page Alignment Plan (Dashboard)

Goal: align dashboard `/pricing` page with landing-page pricing details and add a Custom Pricing option with a Contact Us button. Keep MVP first, no hardcoded fallbacks; reuse existing data structures.

Plan (step-by-step)

1) Audit current pricing implementation (MVP) (DONE)
   - Located `/pricing` implementation at `app/pricing/page.tsx` with data from `/api/billing/plans`.
   - Identified gaps: feature lists are not provided (only “Credits Never Expire”), all cards use Paddle checkout CTA, and there is no Custom Pricing card/Contact Us CTA.
   - Noted data source: `/api/billing/plans` reads Supabase `billing_plans` rows, passing `custom_data` into price metadata and `credits` into plan metadata.
   - Why: establishes current data flow and confirms missing details for parity with Screenshot_2.

2) Define feature/custom plan data source (MVP) (DONE)
   - Decision: use Supabase `billing_plans.custom_data` for feature lists and CTA behavior.
   - Why: keeps UI data-driven and avoids hardcoded terms while enabling a non-Paddle tier.

3) Define `custom_data` schema + Custom Pricing storage (MVP)
   - `custom_data` keys:
     - `subtitle` (string): secondary line under plan title (e.g., “Credits Never Expire”).
     - `features` (array of strings): bullet list for the card.
     - `cta_label` (string): button label (“Start Verification”, “Contact Us”).
     - `cta_action` (string): `checkout` or `contact` (used to block Paddle checkout).
     - `display_price` (string): override price text (e.g., “Contact Us”).
     - `sort_order` (number): stable card ordering.
   - Storage approach: add a display-only row in `billing_plans` with synthetic IDs and `cta_action="contact"`, and update backend to block checkout when `cta_action` is not `checkout`.
   - Why: ensures the Custom Pricing card is data-driven without breaking Paddle checkout or schema constraints.

4) Add feature details to each plan (MVP) (DONE)
   - Populated `custom_data.subtitle` + `custom_data.features` for Basic/Professional/Enterprise in `billing_plans`.
   - Pricing UI now renders subtitle + feature list from `custom_data` (no hardcoded fallback text).
   - Why: matches dashboard pricing with landing page without altering general UI structure.

5) Add Custom Pricing plan (MVP) (DONE)
   - The pricing grid now renders all plans (sorted by `custom_data.sort_order`), including the display-only `custom_pricing` row.
   - Custom Pricing card shows “Contact Us” price text, feature list, and a Contact Us CTA that logs intent without checkout wiring.
   - Why: completes parity with landing page while avoiding premature backend wiring.

6) Verify layout + responsiveness (MVP)
   - Ensure the grid and spacing match existing dashboard style and stay responsive on mobile.
   - Validate no UI regression in sidebar/footer layout.
   - Why: preserves UI integrity while adding content.

Status
- Step 1: DONE
- Step 2: DONE
- Step 3: DONE
- Step 4: DONE
- Step 5: DONE
- Step 6: PENDING

Notes
- No Paddle changes expected.
- If any step cannot be implemented, document under the step and flag it.
