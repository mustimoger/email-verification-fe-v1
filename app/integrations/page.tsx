"use client";

import Link from "next/link";
import Image from "next/image";

import { DashboardShell } from "../components/dashboard-shell";

const integrations = [
  {
    name: "Zapier",
    logo: "/integrations/zapier.png",
    alt: "Zapier logo",
    description: "Use Webhooks/Code steps to call the Email Verification API with your key. Classification is for usage only.",
  },
  {
    name: "n8n",
    logo: "/integrations/n8n.png",
    alt: "n8n logo",
    description: "Call the API from HTTP Request or Code nodes. Keys are universal,can be used anywhere but picking n8n just tags usage.",
  },
  {
    name: "Google Sheets",
    logo: "/integrations/google-sheets.png",
    alt: "Google Sheets logo",
    description: "Use Apps Script or connectors to hit the API. Select Sheets when creating a key to see usage by platform.",
  },
];

export default function IntegrationsPage() {
  return (
    <DashboardShell>
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="relative h-20 w-full">
              <Image
                src={integration.logo}
                alt={integration.alt}
                fill
                className="object-contain"
                sizes="(min-width: 1024px) 240px, 33vw"
              />
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700">{integration.description}</p>
              <Link
                href={`/api?integration=${encodeURIComponent(integration.name)}`}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#4c61cc] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f52ad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
              >
                Generate key for {integration.name}
              </Link>
            </div>
          </div>
        ))}
      </section>

      <p className="mt-8 text-sm font-semibold text-slate-600">
        Keys are universal; the integration choice simply tags usage so you can see consumption per platform on the API page.
      </p>
    </DashboardShell>
  );
}
