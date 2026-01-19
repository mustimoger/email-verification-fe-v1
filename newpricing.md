# New Pricing (Volume Slider + Subscription Option)

## Finalized Behavior Summary (MUST IMPLEMENT)
- Pricing model: volume pricing (all units priced at the tier for the total quantity).
- Slider: min 2,000, max 10,000,000, step 1,000 (quantities must be multiples of 1,000).
- Contact CTA: above 10,000,000, disable checkout and show “For over 10M credits Contact us”.
- Modes: Pay‑As‑You‑Go (one-time) + Subscription (monthly + annual).
- Annual: billed yearly; slider quantity is monthly credits; grant `quantity × 12` credits upfront.
- Free trial credits: grant once after verified signup, unconditional, stacks with signup bonus.
- Rounding: nearest whole dollar with 0.5 rounding up; UI never shows cents; checkout total must match UI exactly.
- Tiers remain distinct even if unit price matches (2,000–5,000 and 5,001–10,000 stay separate).
- Currency USD; tax inclusive; credits never expire.
- IMPORTANT: Use Paddle MCP for all Paddle-related tasks (catalog, prices, simulations, verification).

## V2 Parallel Rollout Decisions (Recorded)
- API: Use cleanly separated v2 endpoints under `/api/billing/v2/*` to avoid touching current pricing flow.
- Supabase: Create dedicated v2 tables (`billing_pricing_config_v2`, `billing_pricing_tiers_v2`) so the existing pricing tables remain unchanged until cutover.
- UI: Implement v2 pricing UI on a separate `/pricing-v2` route only.
- Paddle: Create the new tiered catalog in Paddle sandbox (leave current catalog intact).
- Feature flag: use `PRICING_V2` to control when the v2 flow is activated.
Why: Enables a parallel build/verify/switch workflow without disrupting the current fixed-plan pricing.

## Rounding + Unit Model (UI + Checkout must match)
- Use a price-per-1,000 credits model for Paddle items to avoid fractional cents.
- Compute totals with Decimal math (no floats):
  - `units = quantity / 1000` (integer, validated by step).
  - `raw_total = units * price_per_1000`.
  - `rounded_total = round_half_up(raw_total)`.
  - `rounding_adjustment = rounded_total - raw_total`.
- Apply the rounding adjustment in checkout:
  - If positive, add a fee line item.
  - If negative, add a discount line item.
  - Resulting Paddle checkout total must equal `rounded_total` and match UI.

## Pricing Tiers (Pay‑As‑You‑Go) — Source of Truth
Keep tiers separate even when price matches.

| Tier | Min | Max | Payg Price/Email |
|------|-----|-----|------------------|
| 1 | 2,000 | 5,000 | 0.0037 |
| 2 | 5,001 | 10,000 | 0.0037 |
| 3 | 10,001 | 25,000 | 0.00236 |
| 4 | 25,001 | 50,000 | 0.00178 |
| 5 | 50,001 | 100,000 | 0.00129 |
| 6 | 100,001 | 250,000 | 0.00080 |
| 7 | 250,001 | 500,000 | 0.00060 |
| 8 | 500,001 | 1,000,000 | 0.00039 |
| 9 | 1,000,001 | 2,500,000 | 0.00032 |
| 10 | 2,500,001 | 5,000,000 | 0.00028 |
| 11 | 5,000,001 | 10,000,000 | 0.00025 |

## Subscription Discounts
- Monthly: 15% off Pay‑As‑You‑Go (multiplier 0.85).
- Annual: 20% off Pay‑As‑You‑Go (multiplier 0.80), billed yearly.
- Credits rollover: enabled.

## Display Price Anchors (Reference)
Use rounding rules to compute UI totals, but keep these anchor values for sanity checks.

### Pay‑As‑You‑Go
- 2,000 → $7
- 5,000 → $19
- 10,000 → $37
- 25,000 → $59
- 50,000 → $89
- 100,000 → $129
- 250,000 → $200
- 500,000 → $300
- 1,000,000 → $390
- 2,500,000 → $800
- 5,000,000 → $1,400
- 10,000,000 → $2,500

### Monthly Subscription
- 2,000 → $6
- 5,000 → $16
- 10,000 → $31
- 25,000 → $50
- 50,000 → $76
- 100,000 → $110
- 250,000 → $170
- 500,000 → $255
- 1,000,000 → $332
- 2,500,000 → $680
- 5,000,000 → $1,190
- 10,000,000 → $2,125

### Annual Subscription (Monthly Equivalent)
- 2,000 → $6
- 5,000 → $15
- 10,000 → $30
- 25,000 → $47
- 50,000 → $71
- 100,000 → $103
- 250,000 → $160
- 500,000 → $240
- 1,000,000 → $312
- 2,500,000 → $640
- 5,000,000 → $1,120
- 10,000,000 → $2,000

## Data Model Plan (Source of Truth)
### Step D0: Add pricing config table
- What: Create `billing_pricing_config` to store global rules (min/max/step, rounding rule, bonus credits).
- How: Supabase migration with a single active row:
  - `pricing_version`, `currency`, `min_volume`, `max_volume`, `step_size`,
  - `free_trial_credits`, `rounding_rule`, `status`, `metadata` (jsonb),
  - timestamps.
- Why: Avoids hardcoded values and keeps backend + UI aligned.
Status: Completed — created `billing_pricing_config` with a unique active row and seeded it from the JSON source so all global pricing rules live in Supabase rather than code.
V2 status: Completed — created `billing_pricing_config_v2` and seeded the v2 active row from the JSON source to keep v1 and v2 isolated.

### Step D1: Add tier table in Supabase
- What: Create `billing_pricing_tiers` to store tier ranges and Paddle price IDs.
- How: Supabase migration with columns:
  - `id` (uuid), `mode` (enum: payg, subscription), `interval` (enum: one_time, month, year),
  - `min_quantity`, `max_quantity` (nullable for open-ended), `unit_amount`, `currency`,
  - `paddle_price_id`, `credits_per_unit`, `status`, `sort_order`, `metadata` (jsonb),
  - timestamps + unique index on `(mode, interval, min_quantity, max_quantity)`.
- Why: Centralizes pricing rules and keeps UI/backend logic consistent without hardcoding.
Status: Completed — created the tiers table with constraints/indexes and ready slots for Paddle price IDs.
V2 status: Completed — created `billing_pricing_tiers_v2` with the same constraints/indexes so v2 pricing can be populated independently.

### Step D2: Seed and validate tier data
- What: Populate tiers with real business pricing and map to Paddle price IDs.
- How: Use `boltroute_pricing_config_FINAL.json` as the seed source; validate ranges are non-overlapping and contiguous (or explicitly allow gaps with explicit errors).
- Why: Prevents silent pricing errors and ensures predictable tier selection.
Status: Completed (seed only) — inserted 33 rows (payg + monthly + annual) from the JSON source; Paddle price IDs remain null until catalog sync is run.
V2 status: Completed (seed only) — inserted the same 33 rows into `billing_pricing_tiers_v2`; Paddle price IDs remain null until the v2 catalog sync is run.

## Paddle Catalog Plan
### Step P1: Create Paddle prices per tier
- What: One product (“Email Verification Credits”) with multiple prices for each tier and interval.
- How: For each tier:
  - Create one-time price for payg.
  - Create recurring price(s) for subscription intervals.
  - Add price metadata with `mode`, `interval`, `min_quantity`, `max_quantity`, `credits_per_unit`.
- Why: Keeps Paddle amounts aligned with tier pricing and allows automated syncing.
Status (v2 sandbox): Completed — created product `pro_01kf8ty1659c4dff5c5f0wdwy7` with 33 prices (payg + monthly + annual) and stored tier metadata in `custom_data`. Unit prices are cent-rounded (`unit_amount_cents`) from `unit_amount_raw` so Paddle can accept integer cents; rounding adjustments will reconcile totals to whole dollars.

### Step P2: Sync Paddle prices into Supabase
- What: Extend `backend/scripts/sync_paddle_plans.py` or add a new script to sync tier prices.
- How: Read Paddle price metadata and upsert into `billing_pricing_tiers`.
- Why: Avoids manual drift between Paddle and Supabase.
Status (v2): Completed — added `backend/scripts/sync_paddle_pricing_v2.py` to filter `custom_data.catalog == "pricing_v2"` and upsert Paddle price IDs into `billing_pricing_tiers_v2`; ran the sync against sandbox to populate `paddle_price_id` for all 33 tiers.

## Backend Plan (MVP)
### Step B1: Add tier selection service (v2)
- What: Add a service to load tiers and pick the correct tier for a quantity.
- How: Create `backend/app/services/pricing_tiers.py` with:
  - `list_tiers(mode, interval)` and `select_tier(quantity, mode, interval)` reading from v2 tables.
  - Validation for min/max, gaps, overlap; log and raise explicit errors.
- Why: Centralizes pricing rules and keeps API handlers simple and consistent without touching v1 pricing logic.
Status: Completed — added `backend/app/services/pricing_v2.py` to load v2 config/tiers, validate ranges/steps, and select tiers with explicit error logging.

### Step B2: Add pricing preview endpoint (v2)
- What: Endpoint to return computed unit price and total for a quantity.
- How: `POST /api/billing/v2/quote` with `{quantity, mode, interval}` -> `{tier, unit_amount, total_amount, currency}`.
- Why: Frontend can show exact pricing from backend (no client-side guesswork) without touching current pricing routes.
Status: Completed — added `/api/billing/v2/quote` in `backend/app/api/billing_v2.py` using v2 config/tiers and returning totals with rounding metadata for UI display.

### Step B3: Update transaction creation for quantity + mode (v2)
- What: Allow checkout based on quantity + mode, not just a fixed price ID.
- How: Extend `/api/billing/v2/transactions` payload to accept `{quantity, mode, interval}`:
  - Validate quantity vs min/max.
  - Enforce step=1,000 and max=10,000,000 (reject above max and return contact CTA signal).
  - Use tier selector to resolve `paddle_price_id`.
  - Apply rounding adjustment so checkout totals match UI.
  - Create transaction with `items=[{price_id, quantity}]` plus rounding adjustment item.
  - Keep backwards compatibility with `price_id` for existing card plans.
- Why: Supports slider-driven pricing without exposing pricing logic to the client while keeping the existing v1 checkout intact.
Status: Completed — `/api/billing/v2/transactions` resolves tiers by quantity or price_id, validates ranges/step, and applies rounding fee/discount adjustments so Paddle totals match the rounded UI totals.

### Step B4: Webhook credit grants for tiers
- What: Ensure credits are granted based on tier data, not hardcoded.
- How: When `transaction.completed`:
  - Resolve each `price_id` to `credits_per_unit` via the v2 tiers table.
  - Grant `quantity * credits_per_unit`.
  - For annual subscriptions, multiply by 12 (slider quantity is monthly credits).
  - Log missing tier mappings explicitly and fail fast.
- Why: Keeps credit grants accurate for both payg and subscriptions.
V2 note: Lookup should check v2 tables first and fall back to v1 plan mapping so existing fixed-plan credits remain unchanged during parallel rollout.
Status: Not started — webhook logic still uses `billing_plans` only and does not check v2 tiers or apply annual multipliers.

### Step B4b: One-time free trial credit bonus
- What: Apply the free trial credits once after verified signup.
- How: After email-verified signup, check `credit_grants` for an existing trial entry; if none, add `free_trial_credits` from config.
- Why: Ensures every verified user receives the one-time bonus, independent of purchases.
Status: Not started — no v2-driven free-trial grant endpoint or auth-provider trigger yet.

### Step B5: Backend tests (unit + integration)
- What: Tests for tier selection, quote, and checkout validation.
- How:
  - Unit tests for range boundaries, min/max, and overlap detection.
  - Integration tests for `/api/billing/v2/quote` and `/api/billing/v2/transactions`.
- Why: Prevents regressions around pricing math and tier resolution.
Status: In progress — v2 quote/transaction tests exist; still need webhook credit-grant and free-trial tests plus full test run.

## Frontend Plan (MVP)
### Step F1: Expand billing API client
- What: Add types + methods for quote and new transaction payload.
- How: Update `app/lib/api-client.ts` with:
  - `getPricingConfigV2` and `getQuoteV2` (v2 endpoints).
  - `createTransactionV2` to support `{quantity, mode, interval}`.
- Why: Keeps frontend typed and aligned with backend payloads.
Status: Completed — v2 types and billing client methods added to `app/lib/api-client.ts`.

### Step F2: New pricing UI layout
- What: Replace static cards with a slider-based pricing module.
- How: In `app/pricing-v2/page.tsx`:
  - Add toggle tabs: payg vs subscription.
  - Add numeric input + slider bound to min/max/step from backend config.
  - Show unit price and total (from `/api/billing/v2/quote`).
  - Keep existing Paddle checkout flow.
- Why: Matches the requested UX while staying data-driven and secure.
Status: Completed — slider UI, plan toggles, and pricing summary are implemented in `app/pricing-v2/pricing-v2-client.tsx`.

### Step F3: Checkout flow per mode (v2)
- What: Trigger correct checkout for payg or subscription.
- How:
  - Payg: call `/api/billing/v2/transactions` with `{quantity, mode:"payg", interval:"one_time"}`.
  - Subscription: call `/api/billing/v2/transactions` with `{quantity, mode:"subscription", interval:"month|year"}`.
- Why: Same UI, different backend pricing resolution while leaving v1 untouched.
Status: Completed — checkout handler calls `billingApi.createTransactionV2` with mode/interval.

### Step F4: UI validation + error handling
- What: Enforce min/max and show clear errors.
- How: Disable checkout when quantity invalid; surface server errors in the pricing card.
- Why: Avoids silent failures and supports real-world edge cases.
Status: Completed — validation state drives disabled checkout and shows error messaging.

### Step F5: Frontend tests
- What: Slider math and UI state tests.
- How: Unit tests for pricing helpers + minimal UI tests for disabled/ready states.
- Why: Confirms slider behavior and checkout gating.
Status: In progress — utility tests added in `tests/pricing-v2-utils.test.ts`, UI smoke tests still pending.

## Testing & Validation
### Step T1: UI smoke test `/pricing-v2`
- What: Verify pricing UI renders, slider updates, and checkout opens with v2 transaction.
- How: Use Playwright with a valid Supabase session; confirm no console errors.
- Why: Ensures end-to-end v2 flow works in the browser.
Status: Blocked — current Supabase refresh token rejected (`refresh_token_not_found`); need valid session or credentials.

## MVP Completion Checklist
- Supabase v2 tiers table created and populated with real pricing.
- Paddle prices created for each tier + interval.
- Quote endpoint returns correct totals.
- Checkout uses tier selection and completes successfully.
- Webhook grants credits per tier mapping.
- UI slider matches min/max/step and shows accurate totals.
- Tests pass (backend unit + integration; frontend unit).

## Follow-on Enhancements (After MVP)
- Promo code support and discount display.
- Annual discount display logic (if annual interval is used).
- In-app “Autopay” messaging and account management of subscriptions.
- Tier tooltips and per-email price breakdown in UI.

## Authoritative Source Files (Verbatim)

### boltroute_pricing_FINAL.md
```md
# BoltRoute.ai Pricing Strategy - FINAL
## Matching MillionVerifier + Differentiating on Value

---

## MillionVerifier Verified Pricing (PAYG Credits)

From multiple sources, MillionVerifier's current pricing:

| Volume | MV Price | $/Email |
|--------|----------|---------|
| 10,000 | $37 | $0.0037 |
| 25,000 | $59 | $0.00236 |
| 50,000 | $77-89 | $0.00154-0.00178 |
| 100,000 | $129-149 | $0.00129-0.00149 |
| 500,000 | ~$299 | $0.000598 |
| 1,000,000 | $389-449 | $0.000389-0.000449 |

**Key MV Traits:**
- Credits never expire ✓
- No charge for catch-all emails ✓
- 100% money-back guarantee
- Known weaknesses: slow support, catch-all detection issues, occasional downtime

---

## BoltRoute FINAL Pricing - Match MV Exactly

### Pay-As-You-Go (One-Time Purchase)

| Volume Range | $/Email | Total Price |
|--------------|---------|-------------|
| 2,000 - 5,000 | $0.0037 | $7.40 - $18.50 |
| 5,001 - 10,000 | $0.0037 | $37.00 (10k) |
| 10,001 - 25,000 | $0.00236 | $59.00 (25k) |
| 25,001 - 50,000 | $0.00178 | $89.00 (50k) |
| 50,001 - 100,000 | $0.00129 | $129.00 (100k) |
| 100,001 - 250,000 | $0.00080 | $200.00 (250k) |
| 250,001 - 500,000 | $0.00060 | $300.00 (500k) |
| 500,001 - 1,000,000 | $0.00039 | $390.00 (1M) |
| 1,000,001 - 2,500,000 | $0.00032 | $800.00 (2.5M) |
| 2,500,001 - 5,000,000 | $0.00028 | $1,400.00 (5M) |
| 5,000,001 - 10,000,000 | $0.00025 | $2,500.00 (10M) |

### Monthly Subscription - 15% Off PAYG (Credits Rollover)

| Volume Range | $/Email | Monthly Price |
|--------------|---------|---------------|
| 2,000 - 5,000 | $0.003145 | $6.29 - $15.73 |
| 5,001 - 10,000 | $0.003145 | $31.45 (10k) |
| 10,001 - 25,000 | $0.002006 | $50.15 (25k) |
| 25,001 - 50,000 | $0.001513 | $75.65 (50k) |
| 50,001 - 100,000 | $0.001097 | $109.65 (100k) |
| 100,001 - 250,000 | $0.00068 | $170.00 (250k) |
| 250,001 - 500,000 | $0.00051 | $255.00 (500k) |
| 500,001 - 1,000,000 | $0.000332 | $331.50 (1M) |
| 1,000,001 - 2,500,000 | $0.000272 | $680.00 (2.5M) |
| 2,500,001 - 5,000,000 | $0.000238 | $1,190.00 (5M) |
| 5,000,001 - 10,000,000 | $0.0002125 | $2,125.00 (10M) |

### Annual Subscription - 20% Off PAYG (Billed Annually)

| Volume Range | $/Email | Monthly Equiv | Annual Total |
|--------------|---------|---------------|--------------|
| 2,000 - 5,000 | $0.00296 | $5.92 - $14.80 | $71.04 - $177.60 |
| 5,001 - 10,000 | $0.00296 | $29.60 | $355.20 |
| 10,001 - 25,000 | $0.001888 | $47.20 | $566.40 |
| 25,001 - 50,000 | $0.001424 | $71.20 | $854.40 |
| 50,001 - 100,000 | $0.001032 | $103.20 | $1,238.40 |
| 100,001 - 250,000 | $0.00064 | $160.00 | $1,920.00 |
| 250,001 - 500,000 | $0.00048 | $240.00 | $2,880.00 |
| 500,001 - 1,000,000 | $0.000312 | $312.00 | $3,744.00 |

---

## Head-to-Head: BoltRoute vs MillionVerifier

| Volume | MillionVerifier | BoltRoute PAYG | Difference |
|--------|-----------------|----------------|------------|
| 10,000 | $37 | $37 | Same |
| 25,000 | $59 | $59 | Same |
| 50,000 | $89 | $89 | Same |
| 100,000 | $129 | $129 | Same |
| 500,000 | ~$299 | $300 | Same |
| 1,000,000 | $389 | $390 | Same |

**Price parity achieved.**

---

## BoltRoute Differentiators (What MV Doesn't Offer)

### 1. Credits Never Expire ✓
Both offer this. **Parity.**

### 2. Better Support
MV known for slow/non-existent support. BoltRoute can win here:
- Live chat support
- Faster response times
- Dedicated account manager for high volume

### 3. Better Accuracy Claims
MV has complaints about:
- Poor catch-all detection
- Yahoo email issues
- False positives

BoltRoute messaging:
- "99%+ accuracy on ALL domains including Yahoo"
- "Advanced catch-all detection"
- Publish accuracy benchmarks

### 4. No Charge for Unknowns ✓
MV already does this for catch-all. BoltRoute should match AND market it prominently:
- "Only pay for verified results"
- "Catch-all and unknown emails = FREE"

### 5. Better UX/UI
MV has "dated" UI per reviews. BoltRoute opportunity:
- Modern, clean interface
- Real-time progress tracking
- Better reporting/analytics

### 6. Uptime Guarantee
MV has documented downtime issues. BoltRoute can offer:
- 99.9% uptime SLA
- Status page transparency
- Credit refunds for downtime

---

## Implementation Table (Slider Logic)

```javascript
const PAYG_TIERS = [
  { min: 2000, max: 5000, pricePerEmail: 0.0037 },
  { min: 5001, max: 10000, pricePerEmail: 0.0037 },
  { min: 10001, max: 25000, pricePerEmail: 0.00236 },
  { min: 25001, max: 50000, pricePerEmail: 0.00178 },
  { min: 50001, max: 100000, pricePerEmail: 0.00129 },
  { min: 100001, max: 250000, pricePerEmail: 0.00080 },
  { min: 250001, max: 500000, pricePerEmail: 0.00060 },
  { min: 500001, max: 1000000, pricePerEmail: 0.00039 },
  { min: 1000001, max: 2500000, pricePerEmail: 0.00032 },
  { min: 2500001, max: 5000000, pricePerEmail: 0.00028 },
  { min: 5000001, max: 10000000, pricePerEmail: 0.00025 }
];

const SUBSCRIPTION_DISCOUNTS = {
  monthly: 0.85,  // 15% off
  annual: 0.80    // 20% off
};

function calculatePrice(volume, planType = 'payg') {
  const tier = PAYG_TIERS.find(t => volume >= t.min && volume <= t.max);
  if (!tier) return null;
  
  const basePrice = tier.pricePerEmail * volume;
  const multiplier = SUBSCRIPTION_DISCOUNTS[planType] || 1;
  
  return Math.round(basePrice * multiplier * 100) / 100;
}
```

---

## Display Prices (Rounded for Clean UI)

| Volume | PAYG | Monthly Sub | Annual Sub (per mo) |
|--------|------|-------------|---------------------|
| 2,000 | $7 | $6 | $6 |
| 5,000 | $19 | $16 | $15 |
| 10,000 | $37 | $31 | $30 |
| 25,000 | $59 | $50 | $47 |
| 50,000 | $89 | $76 | $71 |
| 100,000 | $129 | $110 | $103 |
| 250,000 | $200 | $170 | $160 |
| 500,000 | $300 | $255 | $240 |
| 1,000,000 | $390 | $332 | $312 |
| 2,500,000 | $800 | $680 | $640 |
| 5,000,000 | $1,400 | $1,190 | $1,120 |
| 10,000,000 | $2,500 | $2,125 | $2,000 |

---

## Marketing Positioning

### Tagline Options:
- "MillionVerifier pricing. Better everything else."
- "Same price. Superior accuracy. Actual support."
- "Budget pricing. Enterprise quality."

### Key Messages:
1. **Price:** "Industry-lowest pricing - match any competitor"
2. **Accuracy:** "99%+ accuracy including Yahoo and catch-all domains"
3. **Support:** "Real humans. Real fast. Every time."
4. **Flexibility:** "Credits never expire. Only pay for verified results."
5. **Reliability:** "99.9% uptime guaranteed"

### Comparison Table for Landing Page:

| Feature | BoltRoute | MillionVerifier |
|---------|-----------|-----------------|
| Price (100k emails) | $129 | $129 |
| Credits Expire | Never | Never |
| Catch-all Detection | Advanced | Basic |
| Yahoo Accuracy | 99%+ | Issues reported |
| Support Response | < 4 hours | Slow/None |
| Uptime SLA | 99.9% | No guarantee |
| No charge for unknowns | ✓ | ✓ |
| Modern UI | ✓ | Dated |

---

## Summary

**Pricing: Exact match to MillionVerifier**
**Competition: On value, not price**

You're now the "MillionVerifier killer" - same rock-bottom pricing but with:
- Better support
- Better accuracy
- Better reliability
- Better UX

This positions you to steal MV's customers who are frustrated with their weaknesses while attracting new budget-conscious buyers.
```

### boltroute_pricing_config_FINAL.json
```json
{
  "pricing_version": "4.0-FINAL",
  "strategy": "Match MillionVerifier exactly, differentiate on value",
  "currency": "USD",
  "min_volume": 2000,
  "max_volume": 10000000,
  "free_trial_credits": 100,
  
  "volume_tiers": [
    {
      "tier": 1,
      "min": 2000,
      "max": 5000,
      "payg_price_per_email": 0.0037,
      "reference_total_at_max": 18.50
    },
    {
      "tier": 2,
      "min": 5001,
      "max": 10000,
      "payg_price_per_email": 0.0037,
      "reference_total_at_max": 37.00
    },
    {
      "tier": 3,
      "min": 10001,
      "max": 25000,
      "payg_price_per_email": 0.00236,
      "reference_total_at_max": 59.00
    },
    {
      "tier": 4,
      "min": 25001,
      "max": 50000,
      "payg_price_per_email": 0.00178,
      "reference_total_at_max": 89.00
    },
    {
      "tier": 5,
      "min": 50001,
      "max": 100000,
      "payg_price_per_email": 0.00129,
      "reference_total_at_max": 129.00
    },
    {
      "tier": 6,
      "min": 100001,
      "max": 250000,
      "payg_price_per_email": 0.00080,
      "reference_total_at_max": 200.00
    },
    {
      "tier": 7,
      "min": 250001,
      "max": 500000,
      "payg_price_per_email": 0.00060,
      "reference_total_at_max": 300.00
    },
    {
      "tier": 8,
      "min": 500001,
      "max": 1000000,
      "payg_price_per_email": 0.00039,
      "reference_total_at_max": 390.00
    },
    {
      "tier": 9,
      "min": 1000001,
      "max": 2500000,
      "payg_price_per_email": 0.00032,
      "reference_total_at_max": 800.00
    },
    {
      "tier": 10,
      "min": 2500001,
      "max": 5000000,
      "payg_price_per_email": 0.00028,
      "reference_total_at_max": 1400.00
    },
    {
      "tier": 11,
      "min": 5000001,
      "max": 10000000,
      "payg_price_per_email": 0.00025,
      "reference_total_at_max": 2500.00
    }
  ],
  
  "subscription_discounts": {
    "monthly": {
      "discount_percent": 15,
      "multiplier": 0.85,
      "billing_cycle": "monthly",
      "credits_rollover": true
    },
    "annual": {
      "discount_percent": 20,
      "multiplier": 0.80,
      "billing_cycle": "yearly",
      "credits_rollover": true
    }
  },
  
  "display_prices": {
    "payg": {
      "2000": 7,
      "5000": 19,
      "10000": 37,
      "25000": 59,
      "50000": 89,
      "100000": 129,
      "250000": 200,
      "500000": 300,
      "1000000": 390,
      "2500000": 800,
      "5000000": 1400,
      "10000000": 2500
    },
    "monthly_subscription": {
      "2000": 6,
      "5000": 16,
      "10000": 31,
      "25000": 50,
      "50000": 76,
      "100000": 110,
      "250000": 170,
      "500000": 255,
      "1000000": 332,
      "2500000": 680,
      "5000000": 1190,
      "10000000": 2125
    },
    "annual_subscription_monthly_equiv": {
      "2000": 6,
      "5000": 15,
      "10000": 30,
      "25000": 47,
      "50000": 71,
      "100000": 103,
      "250000": 160,
      "500000": 240,
      "1000000": 312,
      "2500000": 640,
      "5000000": 1120,
      "10000000": 2000
    }
  },
  
  "millionverifier_comparison": {
    "10000": { "mv": 37, "boltroute": 37, "match": true },
    "25000": { "mv": 59, "boltroute": 59, "match": true },
    "50000": { "mv": 89, "boltroute": 89, "match": true },
    "100000": { "mv": 129, "boltroute": 129, "match": true },
    "500000": { "mv": 299, "boltroute": 300, "match": true },
    "1000000": { "mv": 389, "boltroute": 390, "match": true }
  },
  
  "differentiators": {
    "credits_never_expire": true,
    "no_charge_for_unknowns": true,
    "no_charge_for_catchall": true,
    "support_response_sla": "< 4 hours",
    "uptime_sla": "99.9%",
    "accuracy_claim": "99%+ including Yahoo and catch-all domains",
    "modern_ui": true
  },
  
  "competitor_weaknesses_to_exploit": [
    "MillionVerifier: Slow/non-existent support",
    "MillionVerifier: Poor catch-all detection",
    "MillionVerifier: Yahoo email accuracy issues",
    "MillionVerifier: Dated UI",
    "MillionVerifier: Documented downtime issues"
  ]
}
```
