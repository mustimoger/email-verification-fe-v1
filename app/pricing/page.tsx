"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";

import { getBillingClient } from "../lib/paddle";
import { ApiError, billingApi } from "../lib/api-client";

import { DashboardShell } from "../components/dashboard-shell";

type Feature = { label: string };

type Plan = {
  id: string;
  name: string;
  price: string;
  creditsNote: string;
  features: Feature[];
  cta: string;
  priceId: string;
  credits?: number;
  amount?: number;
  currency?: string;
};

export default function PricingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutScript, setCheckoutScript] = useState<string | null>(null);
  const [clientSideToken, setClientSideToken] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

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

        const mapped: Plan[] = resp.plans.map((plan) => {
          // pick the first price entry for display
          const priceEntry = Object.values(plan.prices)[0];
          const credits = typeof priceEntry.metadata?.credits === "number" ? priceEntry.metadata.credits : undefined;
          return {
            id: plan.name,
            name: plan.name,
            price: formatPrice(priceEntry.amount, priceEntry.currency_code),
            priceId: priceEntry.price_id,
            creditsNote: plan.metadata?.credits ? `${plan.metadata.credits} Credits` : "Credits Never Expire",
            features: [{ label: "Credits Never Expire" }],
            cta: "Start Verification",
            credits,
            amount: priceEntry.amount,
            currency: priceEntry.currency_code,
          };
        });
        setPlans(mapped);
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

  const tierCards = useMemo(() => plans, [plans]);

  const handleCheckout = async (plan: Plan) => {
    if (!clientSideToken || !checkoutScript) {
      console.warn("[pricing] checkout not enabled");
      return;
    }
    try {
      const billing = await getBillingClient({ token: clientSideToken });
      const session = await billingApi.createTransaction({ price_id: plan.priceId });
      console.info("[pricing] transaction created", session);
      billing.openCheckout({ transactionId: session.id });
    } catch (err) {
      console.error("[pricing] checkout failed", err);
      setError(err instanceof ApiError ? err.message : "Checkout failed");
    }
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
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {plan.creditsNote}
              </p>
              <p className="mt-3 text-3xl font-extrabold text-sky-600">{plan.price}</p>
            </div>

            <div className="my-4 h-px w-full bg-slate-100" />

            <ul className="flex flex-1 flex-col gap-3 text-center text-sm font-semibold text-slate-700">
              {plan.features.map((feature) => (
                <li key={feature.label}>{feature.label}</li>
              ))}
            </ul>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className="rounded-full border border-sky-500 px-6 py-2 text-sm font-semibold text-sky-600 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => handleCheckout(plan)}
                disabled={loading || !!error}
              >
                {plan.cta}
              </button>
            </div>
          </div>
        ))}
      </section>
      {checkoutScript ? (
        <Script src={checkoutScript} strategy="afterInteractive" />
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </DashboardShell>
  );
}
  const formatPrice = (amount?: number, currency?: string) => {
    if (amount == null || !currency) return "Price unavailable";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }).format(amount / 100);
    } catch {
      return `${currency} ${amount / 100}`;
    }
  };
