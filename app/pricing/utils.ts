import { Plan as ApiPlan } from "../lib/api-client";

export type PricingPlan = {
  id: string;
  name: string;
  price: string;
  subtitle?: string;
  features: string[];
  ctaLabel?: string;
  ctaAction?: string;
  priceId: string;
  credits?: number;
  amount?: number;
  currency?: string;
  sortOrder?: number;
};

type PriceEntry = ApiPlan["prices"][string];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toStringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

const toNumberValue = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const resolvePrimaryPrice = (plan: ApiPlan): PriceEntry | undefined => {
  const priceEntries = Object.values(plan.prices);
  return priceEntries[0];
};

const formatPrice = (amount?: number, currency?: string): string | null => {
  if (amount == null || !currency) {
    console.warn("[pricing] price_missing", { amount, currency });
    return null;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount / 100);
  } catch (err) {
    console.warn("[pricing] price_format_failed", err);
    return `${currency} ${amount / 100}`;
  }
};

export const mapPricingPlans = (plans: ApiPlan[]): PricingPlan[] =>
  plans
    .map((plan) => {
      const priceEntry = resolvePrimaryPrice(plan);
      if (!priceEntry) {
        console.warn("[pricing] plan_missing_price", { plan_name: plan.name });
        return null;
      }
      const metadata = isRecord(priceEntry.metadata) ? priceEntry.metadata : {};
      const features = toStringArray(metadata.features);
      const subtitle = toStringValue(metadata.subtitle);
      const displayPrice = toStringValue(metadata.display_price);
      const ctaLabel = toStringValue(metadata.cta_label);
      const ctaAction = toStringValue(metadata.cta_action);
      const sortOrder = toNumberValue(metadata.sort_order);
      const credits = typeof metadata.credits === "number" ? metadata.credits : undefined;

      if (!features.length) {
        console.warn("[pricing] plan_features_missing", { plan_name: plan.name });
      }
      if (!ctaLabel) {
        console.warn("[pricing] plan_cta_label_missing", { plan_name: plan.name });
      }
      if (!ctaAction) {
        console.warn("[pricing] plan_cta_action_missing", { plan_name: plan.name });
      }

      const formattedPrice = displayPrice ?? formatPrice(priceEntry.amount, priceEntry.currency_code);

      return {
        id: plan.name,
        name: plan.name,
        price: formattedPrice ?? "",
        priceId: priceEntry.price_id,
        subtitle,
        features,
        ctaLabel,
        ctaAction,
        credits,
        amount: priceEntry.amount,
        currency: priceEntry.currency_code,
        sortOrder,
      };
    })
    .filter((plan): plan is PricingPlan => Boolean(plan));

export const sortPricingPlans = (plans: PricingPlan[]): PricingPlan[] =>
  [...plans].sort((left, right) => {
    if (left.sortOrder == null || right.sortOrder == null) return 0;
    return left.sortOrder - right.sortOrder;
  });

export const filterCheckoutPlans = (plans: PricingPlan[]): PricingPlan[] =>
  plans.filter((plan) => plan.ctaAction === "checkout");
