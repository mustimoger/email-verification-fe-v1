# Pricing Page Alignment Plan (Dashboard)

Goal: align dashboard `/pricing` page with landing-page pricing details and add a Custom Pricing option with a Contact Us button. Keep MVP first, no hardcoded fallbacks; reuse existing data structures.

Plan (step-by-step)

1) Audit current pricing implementation (MVP) (DONE)
   - Located `/pricing` implementation at `app/pricing/page.tsx` with data from `/api/billing/plans`.
   - Identified gaps: feature lists are not provided (only “Credits Never Expire”), all cards use Paddle checkout CTA, and there is no Custom Pricing card/Contact Us CTA.
   - Noted data source: `/api/billing/plans` reads Supabase `billing_plans` rows, passing `custom_data` into price metadata and `credits` into plan metadata.
   - Why: establishes current data flow and confirms missing details for parity with Screenshot_2.

2) Define feature/custom plan data source (MVP)
   - Decide whether to store plan features + CTA behavior in Supabase `billing_plans.custom_data` (preferred) or a dedicated config table to avoid hardcoding.
   - Ensure Custom Pricing can be represented without a Paddle price and without breaking checkout flows.
   - Why: keeps UI data-driven and avoids hardcoded terms while enabling a non-Paddle tier.

3) Add feature details to each plan (MVP)
   - Extend the pricing plan data model to include feature lists shown in Screenshot_2.
   - Render the feature list in each card while preserving existing layout and typography.
   - Why: matches dashboard pricing with landing page without altering general UI structure.

4) Add Custom Pricing plan (MVP)
   - Add a fourth card for “Custom Pricing” with “Contact Us” pricing text.
   - Include its feature list (1M+ Credits, 24/7 Chat Support, Real-time API, All Integrations, CSV/Excel Upload, Advanced Analytics).
   - Add a “Contact Us” button (no Paddle wiring yet) and keep CTA behavior neutral.
   - Why: completes parity with landing page while avoiding premature backend wiring.

5) Verify layout + responsiveness (MVP)
   - Ensure the grid and spacing match existing dashboard style and stay responsive on mobile.
   - Validate no UI regression in sidebar/footer layout.
   - Why: preserves UI integrity while adding content.

Status
- Step 1: DONE
- Step 2: PENDING
- Step 3: PENDING
- Step 4: PENDING
- Step 5: PENDING

Notes
- No Paddle changes expected.
- If any step cannot be implemented, document under the step and flag it.
