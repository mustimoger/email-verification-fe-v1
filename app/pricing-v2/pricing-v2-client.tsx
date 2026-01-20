"use client";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import type { PricingConfigV2Response, PricingQuoteV2Response, PricingIntervalV2 } from "../lib/api-client";
import { ApiError, billingApi } from "../lib/api-client";
import { getBillingClient } from "../lib/paddle";
import { DashboardShell } from "../components/dashboard-shell";
import styles from "./pricing-v2.module.css";
import { ComparisonSection, FaqSection, FinalCtaSection, VolumePricingSection } from "./pricing-v2-sections";
import {
  calculateSavingsPercent,
  extractPaygDisplayPrices,
  formatCredits,
  formatCurrency,
  formatPricePerEmail,
  formatVolumeLabel,
  parseQuantity,
  resolveDisplayTotals,
  validateQuantity,
} from "./utils";
type PlanKey = "payg" | "monthly" | "annual";
type PlanOption = {
  key: PlanKey;
  label: string;
  mode: "payg" | "subscription";
  interval: PricingIntervalV2;
};
const PLAN_OPTIONS: PlanOption[] = [
  { key: "payg", label: "One-Time Purchase", mode: "payg", interval: "one_time" },
  { key: "monthly", label: "Monthly", mode: "subscription", interval: "month" },
  { key: "annual", label: "Annual", mode: "subscription", interval: "year" },
];
const FEATURE_LIST = [
  "Credits never expire",
  "No charge for unknowns",
  "No charge for catch-all",
  "99%+ accuracy",
  "Real-time API access",
  "Bulk upload (CSV, XLSX)",
  "All integrations included",
  "Priority support",
];
const TRUST_ITEMS = ["Instant activation", "Secure payment", "Cancel anytime"];
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

function resolveDefaultQuantity(config: PricingConfigV2Response): number {
  const candidate = config.pricing.metadata?.default_quantity;
  if (typeof candidate === "number") {
    const validation = validateQuantity(candidate, config.pricing);
    if (validation.isValid) {
      return candidate;
    }
    console.warn("pricing_v2.default_quantity_invalid", { candidate, validation });
  }
  return config.pricing.min_volume;
}

function buildQuantityMessage(config: PricingConfigV2Response | null, quantityValue: number | null): string | null {
  if (!config || quantityValue === null) return null;
  const validation = validateQuantity(quantityValue, config.pricing);
  if (!validation.isBelowMin && !validation.isAboveMax && !validation.isInvalidStep) {
    return null;
  }
  if (validation.isBelowMin) {
    return `Minimum purchase is ${formatCredits(config.pricing.min_volume)} credits.`;
  }
  if (validation.isAboveMax) {
    return `For over ${formatCredits(config.pricing.max_volume)} credits contact us.`;
  }
  if (validation.isInvalidStep) {
    return `Use increments of ${formatCredits(config.pricing.step_size)} credits.`;
  }
  return null;
}

function openSupportChat(payload: { quantity?: number; plan: PlanKey }) {
  if (typeof window === "undefined") return;
  const crisp = (window as Window & { $crisp?: unknown[] }).$crisp;
  if (Array.isArray(crisp)) {
    crisp.push(["do", "chat:open"]);
    crisp.push(["do", "chat:show"]);
    return;
  }
  console.info("pricing_v2.contact_requested", payload);
}
export default function PricingV2Client() {
  const [config, setConfig] = useState<PricingConfigV2Response | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [quantityInput, setQuantityInput] = useState("");
  const [activePlan, setActivePlan] = useState<PlanKey>("payg");
  const [quotes, setQuotes] = useState<Record<PlanKey, PricingQuoteV2Response | null>>({
    payg: null,
    monthly: null,
    annual: null,
  });
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      setConfigLoading(true);
      setConfigError(null);
      try {
        const response = await billingApi.getPricingConfigV2();
        if (!active) return;
        setConfig(response);
        setQuantityInput(`${resolveDefaultQuantity(response)}`);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Unable to load pricing";
        console.error("pricing_v2.config_load_failed", err);
        if (active) setConfigError(message);
      } finally {
        if (active) setConfigLoading(false);
      }
    };
    void loadConfig();
    return () => {
      active = false;
    };
  }, []);

  const activePlanOption = useMemo(
    () => PLAN_OPTIONS.find((plan) => plan.key === activePlan) ?? PLAN_OPTIONS[0],
    [activePlan],
  );

  const quantityValue = useMemo(() => parseQuantity(quantityInput), [quantityInput]);
  const debouncedQuantity = useDebouncedValue(quantityValue, 250);

  const validation = useMemo(() => {
    if (!config || debouncedQuantity === null) return null;
    return validateQuantity(debouncedQuantity, config.pricing);
  }, [config, debouncedQuantity]);

  const contactRequired = Boolean(validation?.isAboveMax);

  const sliderValue = useMemo(() => {
    if (!config) return 0;
    const min = config.pricing.min_volume;
    const max = config.pricing.max_volume;
    const value = debouncedQuantity ?? min;
    return Math.min(Math.max(value, min), max);
  }, [config, debouncedQuantity]);

  const sliderProgress = useMemo(() => {
    if (!config) return 0;
    const min = config.pricing.min_volume;
    const max = config.pricing.max_volume;
    if (max <= min) return 0;
    return ((sliderValue - min) / (max - min)) * 100;
  }, [config, sliderValue]);

  useEffect(() => {
    let active = true;
    if (!config || debouncedQuantity === null) {
      setQuotes({ payg: null, monthly: null, annual: null });
      return;
    }
    const validationResult = validateQuantity(debouncedQuantity, config.pricing);
    if (!validationResult.isValid) {
      setQuotes({ payg: null, monthly: null, annual: null });
      if (!validationResult.isAboveMax) {
        setQuoteError(buildQuantityMessage(config, debouncedQuantity));
      } else {
        setQuoteError(null);
      }
      return;
    }

    const loadQuotes = async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const requests = PLAN_OPTIONS.map(async (plan) => {
          const quote = await billingApi.getQuoteV2({
            quantity: debouncedQuantity,
            mode: plan.mode,
            interval: plan.interval,
          });
          return [plan.key, quote] as const;
        });
        const results = await Promise.allSettled(requests);
        if (!active) return;
        const nextQuotes: Record<PlanKey, PricingQuoteV2Response | null> = {
          payg: null,
          monthly: null,
          annual: null,
        };
        let anySuccess = false;
        results.forEach((result) => {
          if (result.status === "fulfilled") {
            const [key, quote] = result.value;
            nextQuotes[key] = quote;
            anySuccess = true;
          } else {
            console.warn("pricing_v2.quote_failed", result.reason);
          }
        });
        setQuotes(nextQuotes);
        if (!anySuccess || !nextQuotes[activePlan]) {
          setQuoteError("Pricing unavailable");
        }
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Pricing unavailable";
        console.error("pricing_v2.quote_error", err);
        if (active) setQuoteError(message);
      } finally {
        if (active) setQuoteLoading(false);
      }
    };

    void loadQuotes();
    return () => {
      active = false;
    };
  }, [config, debouncedQuantity, activePlan]);

  const displayTotalsByPlan = useMemo(() => {
    return PLAN_OPTIONS.reduce((acc, plan) => {
      const quote = quotes[plan.key];
      if (!quote) return acc;
      const rounded = Number(quote.rounded_total);
      if (!Number.isFinite(rounded)) return acc;
      acc[plan.key] = resolveDisplayTotals({ roundedTotal: rounded, interval: quote.interval });
      return acc;
    }, {} as Record<PlanKey, ReturnType<typeof resolveDisplayTotals>>);
  }, [quotes]);

  const activeTotals = displayTotalsByPlan[activePlan];
  const activeQuote = quotes[activePlan];
  const paygTotals = displayTotalsByPlan.payg;

  const savingsByPlan = useMemo(() => {
    return {
      monthly: calculateSavingsPercent(paygTotals?.displayTotal ?? null, displayTotalsByPlan.monthly?.displayTotal ?? null),
      annual: calculateSavingsPercent(paygTotals?.displayTotal ?? null, displayTotalsByPlan.annual?.displayTotal ?? null),
    };
  }, [displayTotalsByPlan, paygTotals]);

  const pricingError = quoteError || configError;
  const quantityMessage = buildQuantityMessage(config, quantityValue);

  const currency = config?.pricing.currency ?? activeQuote?.currency ?? "USD";
  const displayPrice = activeTotals ? formatCurrency(activeTotals.displayTotal, currency) : "--";
  const pricePerEmail = activeTotals && debouncedQuantity
    ? formatPricePerEmail(activeTotals.displayTotal, debouncedQuantity)
    : "--";

  const volumeTable = useMemo(() => extractPaygDisplayPrices(config?.pricing.metadata), [config?.pricing.metadata]);

  useEffect(() => {
    if (config && volumeTable.length === 0) {
      console.warn("pricing_v2.display_prices_missing");
    }
  }, [config, volumeTable.length]);

  const comparisonPriceLabel = useMemo(() => {
    const anchor = volumeTable.find((entry) => entry.volume === 100000);
    return anchor ? formatCurrency(anchor.total, currency) : "Pricing unavailable";
  }, [currency, volumeTable]);

  const comparisonOtherLabel = comparisonPriceLabel === "Pricing unavailable" ? "Pricing unavailable" : "Varies";

  const environment = config?.status === "sandbox" || config?.status === "production" ? config.status : undefined;
  const checkoutEnabled = Boolean(config?.checkout_enabled && config?.client_side_token && config?.checkout_script);

  const handleCheckout = async () => {
    setCheckoutError(null);
    if (!config || !debouncedQuantity) return;
    if (!checkoutEnabled) {
      console.warn("pricing_v2.checkout_disabled");
      setCheckoutError("Checkout is unavailable right now.");
      return;
    }
    if (!activeQuote) {
      setCheckoutError("Pricing is unavailable.");
      return;
    }
    if (contactRequired) {
      openSupportChat({ quantity: debouncedQuantity, plan: activePlan });
      return;
    }
    try {
      setCheckoutLoading(true);
      const billing = await getBillingClient({ token: config.client_side_token || "", environment });
      const session = await billingApi.createTransactionV2({
        quantity: debouncedQuantity,
        mode: activePlanOption.mode,
        interval: activePlanOption.interval,
      });
      billing.Checkout.open({ transactionId: session.id });
    } catch (err) {
      console.error("pricing_v2.checkout_failed", err);
      setCheckoutError(err instanceof ApiError ? err.message : "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const transitionClass = isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6";

  return (
    <DashboardShell>
      <section className={`${styles.root} relative flex flex-col gap-10`}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-48 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.25)_0%,_transparent_70%)]" />
          <div className="absolute right-[-120px] top-[120px] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.12)_0%,_transparent_70%)]" />
        </div>

        <div
          className={`relative overflow-hidden rounded-[28px] border border-[var(--pricing-border)] bg-[var(--pricing-card)] px-6 py-10 shadow-[var(--pricing-shadow)] sm:px-10 ${transitionClass}`}
          style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          <div className="mb-10 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--pricing-border)] bg-[var(--pricing-accent-soft)] px-4 py-2 text-xs font-semibold tracking-[0.2em] text-[var(--pricing-accent)]">
              <span className="h-2 w-2 rounded-full bg-[var(--pricing-accent)]" />
              SIMPLE, TRANSPARENT PRICING
            </div>
            <h1 className="mt-6 text-3xl font-semibold text-[var(--text-primary)] sm:text-5xl">
              Pay only for what you
              <span className="bg-[linear-gradient(135deg,var(--pricing-accent)_0%,var(--pricing-accent-strong)_100%)] bg-clip-text text-transparent">
                {" "}
                verify
              </span>
            </h1>
            <p className="mt-4 text-base text-[var(--text-secondary)] sm:text-lg">
              Credits never expire. No charge for unknowns or catch-all emails.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-[var(--pricing-card-muted)] p-2">
            {PLAN_OPTIONS.map((plan) => {
              const isActive = plan.key === activePlan;
              const savings = plan.key === "payg" ? null : savingsByPlan[plan.key];
              return (
                <button
                  key={plan.key}
                  type="button"
                  onClick={() => setActivePlan(plan.key)}
                  className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
                    isActive
                      ? "bg-[linear-gradient(135deg,var(--pricing-accent)_0%,var(--pricing-accent-strong)_100%)] text-[var(--pricing-cta-ink)] hover:shadow-[0_14px_28px_rgba(249,168,37,0.35)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {plan.label}
                  {savings ? (
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        isActive
                          ? "bg-black/15 text-[var(--pricing-cta-ink)]"
                          : "bg-[var(--pricing-accent-soft)] text-[var(--pricing-accent)]"
                      }`}
                    >
                      SAVE {savings}%
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
            <div className="space-y-8">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Email Credits
                  </span>
                  <span className="text-3xl font-semibold text-[var(--text-primary)]">
                    {config ? formatCredits(sliderValue) : "--"}
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={quantityInput}
                    onChange={(event) => setQuantityInput(event.target.value)}
                    placeholder={config ? `${config.pricing.min_volume}` : ""}
                    className="w-full rounded-xl border border-[var(--pricing-border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    disabled={configLoading}
                  />
                  <div className="relative">
                    <input
                      type="range"
                      min={config?.pricing.min_volume ?? 0}
                      max={config?.pricing.max_volume ?? 0}
                      step={config?.pricing.step_size ?? 1}
                      value={sliderValue}
                      onChange={(event) => setQuantityInput(event.target.value)}
                      className={styles.range}
                      style={{
                        "--range-progress": `${sliderProgress}%`,
                      } as React.CSSProperties}
                      disabled={configLoading}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-[var(--text-muted)]">
                    {config ? [
                      config.pricing.min_volume,
                      Math.round(Math.pow(10, Math.log10(config.pricing.min_volume) + (Math.log10(config.pricing.max_volume) - Math.log10(config.pricing.min_volume)) / 4)),
                      Math.round(Math.pow(10, Math.log10(config.pricing.min_volume) + (Math.log10(config.pricing.max_volume) - Math.log10(config.pricing.min_volume)) / 2)),
                      Math.round(Math.pow(10, Math.log10(config.pricing.min_volume) + (Math.log10(config.pricing.max_volume) - Math.log10(config.pricing.min_volume)) * 0.75)),
                      config.pricing.max_volume,
                    ].map((value, index, arr) => {
                      const stepSize = config.pricing.step_size;
                      const rounded = Math.round(value / stepSize) * stepSize;
                      const clamped = Math.min(Math.max(rounded, arr[0]), arr[arr.length - 1]);
                      return (
                        <span key={`${value}-${index}`}>{formatVolumeLabel(clamped)}</span>
                      );
                    }) : null}
                  </div>
                </div>

                {quantityMessage ? (
                  <p className="mt-3 rounded-xl border border-[var(--pricing-border)] bg-[var(--status-warning-soft)] px-4 py-3 text-xs font-semibold text-[var(--status-warning)]">
                    {quantityMessage}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[var(--pricing-border)] bg-[var(--pricing-card-muted)] p-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Everything Included
                </h3>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {FEATURE_LIST.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--pricing-accent-soft)] text-[var(--pricing-accent)]">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--pricing-border)] bg-[var(--pricing-accent-soft)] px-5 py-4">
                <span className="text-sm font-semibold text-[var(--text-secondary)]">
                  Need more than {config ? formatCredits(config.pricing.max_volume) : ""} credits?
                </span>
                <button
                  type="button"
                  onClick={() => openSupportChat({ quantity: debouncedQuantity ?? undefined, plan: activePlan })}
                  className="rounded-lg border border-[var(--pricing-accent)] px-4 py-2 text-xs font-semibold text-[var(--pricing-accent)] transition hover:-translate-y-0.5 hover:bg-[var(--pricing-accent-soft)] hover:text-[var(--text-primary)]"
                >
                  Contact Sales {"->"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--pricing-border)] bg-[var(--pricing-card-strong)] p-6 shadow-[var(--pricing-shadow)] lg:sticky lg:top-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {activePlanOption.label} Cost
                </span>
                {activePlan !== "payg" && savingsByPlan[activePlan] ? (
                  <span className="rounded-md bg-[var(--status-success-soft)] px-2 py-1 text-[10px] font-bold text-[var(--status-success)]">
                    SAVE {savingsByPlan[activePlan]}%
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-semibold text-[var(--text-primary)]">
                  {displayPrice}
                </span>
                <span className="text-sm font-semibold text-[var(--text-muted)]">
                  {activeTotals?.intervalLabel}
                </span>
              </div>

              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {"$"}
                {pricePerEmail} per email
              </p>

              {activePlan === "annual" && activeTotals?.annualTotal ? (
                <div className="mt-4 rounded-lg border border-[var(--pricing-border)] bg-[var(--pricing-card-muted)] px-4 py-3 text-xs font-semibold text-[var(--text-secondary)]">
                  Billed annually:{" "}
                  <span className="text-[var(--text-primary)]">
                    {formatCurrency(activeTotals.annualTotal, currency)}/year
                  </span>
                </div>
              ) : null}

              {activePlan === "monthly" ? (
                <div className="mt-4 rounded-lg border border-[var(--pricing-border)] bg-[var(--pricing-card-muted)] px-4 py-3 text-xs font-semibold text-[var(--text-secondary)]">
                  Credits roll over each month
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={configLoading || quoteLoading || !checkoutEnabled || Boolean(pricingError) || !debouncedQuantity}
                className="mt-6 w-full rounded-xl bg-[linear-gradient(135deg,var(--pricing-accent)_0%,var(--pricing-accent-strong)_100%)] px-6 py-4 text-base font-semibold text-[var(--pricing-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(249,168,37,0.38)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {contactRequired ? "Contact Sales" : activePlan === "payg" ? "Buy Credits" : "Subscribe Now"}
              </button>

              {pricingError ? (
                <p className="mt-3 text-xs font-semibold text-[var(--status-danger)]">{pricingError}</p>
              ) : null}
              {checkoutError ? (
                <p className="mt-2 text-xs font-semibold text-[var(--status-danger)]">{checkoutError}</p>
              ) : null}

              <div className="mt-6 border-t border-[var(--pricing-border)] pt-4">
                {TRUST_ITEMS.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--status-success)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-[var(--pricing-border)] pt-4 text-[10px] font-semibold text-[var(--text-muted)]">
                <span>We accept</span>
                {"Visa, MC, Amex, PayPal".split(", ").map((method) => (
                  <span
                    key={method}
                    className="rounded-md border border-[var(--pricing-border)] px-2 py-1"
                  >
                    {method}
                  </span>
                ))}
              </div>

              {checkoutLoading ? (
                <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">Preparing checkout...</p>
              ) : null}
            </div>
          </div>
        </div>

        <VolumePricingSection
          entries={volumeTable}
          currency={currency}
          selectedQuantity={debouncedQuantity}
          onSelect={(volume) => setQuantityInput(`${volume}`)}
          transitionClass={transitionClass}
        />

        <ComparisonSection
          transitionClass={transitionClass}
          priceLabel={comparisonPriceLabel}
          priceOthersLabel={comparisonOtherLabel}
        />

        <FaqSection transitionClass={transitionClass} />

        <FinalCtaSection transitionClass={transitionClass} freeTrialCredits={config?.pricing.free_trial_credits} />

        {checkoutEnabled ? <Script src={config?.checkout_script ?? ""} strategy="afterInteractive" /> : null}
      </section>
    </DashboardShell>
  );
}
