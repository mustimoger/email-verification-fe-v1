import assert from "node:assert";

import type { PricingConfigV2 } from "../app/lib/api-client";
import {
  calculateSavingsPercent,
  extractPaygDisplayPrices,
  formatVolumeLabel,
  parseQuantity,
  resolveDisplayTotals,
  validateQuantity,
} from "../app/pricing/pricing-quote-utils";

function run(name: string, fn: () => void) {
  try {
    fn();
    // eslint-disable-next-line no-console
    console.log(`PASS ${name}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const config: PricingConfigV2 = {
  currency: "USD",
  min_volume: 2000,
  max_volume: 10000000,
  step_size: 1000,
};

run("parseQuantity strips commas and validates integers", () => {
  assert.strictEqual(parseQuantity("10,000"), 10000);
  assert.strictEqual(parseQuantity("2500"), 2500);
  assert.strictEqual(parseQuantity(""), null);
  assert.strictEqual(parseQuantity("12.5"), null);
});

run("validateQuantity flags min/max/step issues", () => {
  const belowMin = validateQuantity(1000, config);
  assert.strictEqual(belowMin.isBelowMin, true);
  const aboveMax = validateQuantity(20000000, config);
  assert.strictEqual(aboveMax.isAboveMax, true);
  const badStep = validateQuantity(2500, config);
  assert.strictEqual(badStep.isInvalidStep, true);
});

run("resolveDisplayTotals formats annual pricing as monthly equivalent", () => {
  const totals = resolveDisplayTotals({ roundedTotal: 120, interval: "year" });
  assert.strictEqual(totals.displayTotal, 10);
  assert.strictEqual(totals.annualTotal, 120);
});

run("calculateSavingsPercent compares plan totals", () => {
  assert.strictEqual(calculateSavingsPercent(100, 85), 15);
  assert.strictEqual(calculateSavingsPercent(100, 120), null);
});

run("extractPaygDisplayPrices reads metadata entries", () => {
  const entries = extractPaygDisplayPrices({
    display_prices: {
      payg: {
        "2000": 7,
        "5000": 19,
      },
    },
  });
  assert.strictEqual(entries.length, 2);
  assert.deepStrictEqual(entries[0], { volume: 2000, total: 7 });
});

run("formatVolumeLabel formats K/M", () => {
  assert.strictEqual(formatVolumeLabel(2000), "2K");
  assert.strictEqual(formatVolumeLabel(1000000), "1M");
});

// eslint-disable-next-line no-console
console.log("pricing v2 utils tests completed");
