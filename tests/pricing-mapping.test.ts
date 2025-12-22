import assert from "node:assert";

import { filterCheckoutPlans, mapPricingPlans, sortPricingPlans } from "../app/pricing/utils";
import { Plan as ApiPlan } from "../app/lib/api-client";

function run(name: string, fn: () => void) {
  try {
    fn();
    // eslint-disable-next-line no-console
    console.log(`✓ ${name}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`✗ ${name}`);
    throw error;
  }
}

const basePlan: ApiPlan = {
  name: "Basic",
  product_id: "pro_1",
  metadata: {},
  prices: {
    one_time: {
      price_id: "pri_1",
      amount: 2900,
      currency_code: "USD",
      metadata: {
        features: ["10,000 Credits", "Email Support"],
        subtitle: "Credits Never Expire",
        cta_label: "Start Verification",
        cta_action: "checkout",
        sort_order: 1,
      },
    },
  },
};

run("mapPricingPlans maps feature metadata", () => {
  const mapped = mapPricingPlans([basePlan]);
  assert.strictEqual(mapped.length, 1);
  assert.strictEqual(mapped[0]?.name, "Basic");
  assert.strictEqual(mapped[0]?.subtitle, "Credits Never Expire");
  assert.deepStrictEqual(mapped[0]?.features, ["10,000 Credits", "Email Support"]);
  assert.strictEqual(mapped[0]?.ctaLabel, "Start Verification");
  assert.strictEqual(mapped[0]?.ctaAction, "checkout");
});

run("mapPricingPlans uses display_price override", () => {
  const customPlan: ApiPlan = {
    ...basePlan,
    name: "Custom Pricing",
    prices: {
      one_time: {
        price_id: "custom_contact_v1",
        amount: 0,
        currency_code: "USD",
        metadata: {
          display_price: "Contact Us",
          features: ["1M+ Credits"],
          cta_label: "Contact Us",
          cta_action: "contact",
          sort_order: 4,
        },
      },
    },
  };
  const mapped = mapPricingPlans([customPlan]);
  assert.strictEqual(mapped[0]?.price, "Contact Us");
});

run("sortPricingPlans orders by sort_order when present", () => {
  const [first] = sortPricingPlans(
    mapPricingPlans([
      { ...basePlan, name: "Enterprise", prices: { one_time: { ...basePlan.prices.one_time, metadata: { ...basePlan.prices.one_time?.metadata, sort_order: 3 } } } },
      basePlan,
    ]),
  );
  assert.strictEqual(first?.name, "Basic");
});

run("filterCheckoutPlans keeps checkout-only plans", () => {
  const customPlan: ApiPlan = {
    ...basePlan,
    name: "Custom Pricing",
    prices: {
      one_time: {
        price_id: "custom_contact_v1",
        amount: 0,
        currency_code: "USD",
        metadata: {
          display_price: "Contact Us",
          features: ["1M+ Credits"],
          cta_label: "Contact Us",
          cta_action: "contact",
          sort_order: 4,
        },
      },
    },
  };
  const mapped = mapPricingPlans([basePlan, customPlan]);
  const checkoutPlans = filterCheckoutPlans(mapped);
  assert.strictEqual(checkoutPlans.length, 1);
  assert.strictEqual(checkoutPlans[0]?.name, "Basic");
});

// eslint-disable-next-line no-console
console.log("pricing mapping tests completed");
