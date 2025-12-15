"use client";

import { useMemo } from "react";

import { DashboardShell } from "../components/dashboard-shell";

type Feature = { label: string };

type Plan = {
  id: string;
  name: string;
  price: string;
  creditsNote: string;
  features: Feature[];
  cta: string;
};

const plans: Plan[] = [
  {
    id: "basic-29",
    name: "Basic",
    price: "$29",
    creditsNote: "Credits Never Expire",
    features: [
      { label: "Free Setup" },
      { label: "10,000 Credits" },
      { label: "Email Support" },
      { label: "Real-time API" },
      { label: "All Integrations" },
      { label: "CSV/Excel Upload" },
      { label: "Basic Analytics" },
    ],
    cta: "Start Verification",
  },
  {
    id: "basic-129",
    name: "Basic",
    price: "$129",
    creditsNote: "Credits Never Expire",
    features: [
      { label: "Free Setup" },
      { label: "100,000 Credits" },
      { label: "Priority Email Support" },
      { label: "Real-time API" },
      { label: "All Integrations" },
      { label: "CSV/Excel Upload" },
      { label: "Advanced Analytics" },
    ],
    cta: "Start Verification",
  },
  {
    id: "basic-279",
    name: "Basic",
    price: "$279",
    creditsNote: "Credits Never Expire",
    features: [
      { label: "Free Setup" },
      { label: "500,000 Credits" },
      { label: "Chat Support" },
      { label: "Real-time API" },
      { label: "All Integrations" },
      { label: "CSV/Excel Upload" },
      { label: "Advanced Analytics" },
    ],
    cta: "Start Verification",
  },
  {
    id: "contact",
    name: "Basic",
    price: "Contact Us",
    creditsNote: "Credits Never Expire",
    features: [
      { label: "Free Setup" },
      { label: "1M Plus Credits" },
      { label: "27/7 Chat Support" },
      { label: "Real-time API" },
      { label: "All Integrations" },
      { label: "CSV/Excel Upload" },
      { label: "Advanced Analytics" },
    ],
    cta: "Start Verification",
  },
];

export default function PricingPage() {
  const tierCards = useMemo(() => plans, []);

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
                className="rounded-full border border-sky-500 px-6 py-2 text-sm font-semibold text-sky-600 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                onClick={() => {
                  console.info("[pricing] CTA clicked", { plan: plan.id });
                }}
              >
                {plan.cta}
              </button>
            </div>
          </div>
        ))}
      </section>
    </DashboardShell>
  );
}
