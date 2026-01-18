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

