"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { BadgeCheck } from "lucide-react";

import { getBillingClient } from "../lib/paddle";
import { ApiError, billingApi } from "../lib/api-client";

import { DashboardShell } from "../components/dashboard-shell";
import { mapPricingPlans, sortPricingPlans, type PricingPlan } from "./utils";

export default function PricingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutScript, setCheckoutScript] = useState<string | null>(null);
  const [clientSideToken, setClientSideToken] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<"sandbox" | "production" | undefined>(undefined);
  const [plans, setPlans] = useState<PricingPlan[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadPlans() {
      setLoading(true);
      setError(null);
      try {
        const resp = await billingApi.listPlans();
        if (!isMounted) return;
        setCheckoutScript(resp.checkout_script || null);
        setClientSideToken(resp.client_side_token || null);
        if (resp.status === "sandbox" || resp.status === "production") {
          setEnvironment(resp.status);
        }

        setPlans(mapPricingPlans(resp.plans));
      } catch (err) {
        const message = err instanceof ApiError ? `${err.status}: ${err.message}` : "Failed to load plans";
        console.error("[pricing] load plans failed", err);
        if (isMounted) setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  const tierCards = useMemo(() => sortPricingPlans(plans), [plans]);

  const handleCheckout = async (plan: PricingPlan) => {
    if (!clientSideToken || !checkoutScript) {
      console.warn("[pricing] checkout not enabled");
      return;
    }
    try {
      const billing = await getBillingClient({ token: clientSideToken, environment });
      const session = await billingApi.createTransaction({ price_id: plan.priceId });
      console.info("[pricing] transaction created", session);
      billing.Checkout.open({ transactionId: session.id });
    } catch (err) {
      console.error("[pricing] checkout failed", err);
      setError(err instanceof ApiError ? err.message : "Checkout failed");
    }
  };

  const handleContact = (plan: PricingPlan) => {
    console.info("[pricing] contact_requested", { plan_name: plan.name, price_id: plan.priceId });
  };

  const handleCta = (plan: PricingPlan) => {
    if (plan.ctaAction === "checkout") {
      void handleCheckout(plan);
      return;
    }
    if (plan.ctaAction === "contact") {
      handleContact(plan);
      return;
    }
    console.warn("[pricing] cta_action_unknown", { plan_name: plan.name, cta_action: plan.ctaAction });
  };

  return (
    <DashboardShell>
      <section className="grid gap-6 lg:grid-cols-4">
        {tierCards.map((plan) => (
          <div
            key={plan.id}
            className="flex h-full flex-col rounded-3xl bg-white/95 p-6 shadow-md ring-1 ring-slate-200"
          >
            <div className="text-center">
              <p className="text-sm font-extrabold text-slate-800">{plan.name}</p>
              {plan.subtitle ? (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {plan.subtitle}
                </p>
              ) : null}
              {plan.price ? (
                <p className="mt-3 text-3xl font-extrabold text-sky-600">{plan.price}</p>
              ) : null}
            </div>

            <div className="my-4 h-px w-full bg-slate-100" />

            <ul className="mx-auto flex flex-1 flex-col items-start gap-3 text-sm font-semibold text-slate-700">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-left">
                  <BadgeCheck className="mt-0.5 h-4 w-4 text-[var(--status-warning)]" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {plan.ctaLabel ? (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  className="rounded-full border border-sky-500 px-6 py-2 text-sm font-semibold text-sky-600 transition hover:cursor-pointer hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => handleCta(plan)}
                  disabled={loading || !!error || !plan.ctaAction}
                >
                  {plan.ctaLabel}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </section>
      {checkoutScript ? (
        <Script src={checkoutScript} strategy="afterInteractive" />
      ) : null}
      {error ? <p className="mt-4 text-sm text-[var(--status-danger)]">{error}</p> : null}
    </DashboardShell>
  );
}
