"use client";

import Image from "next/image";

import { DashboardShell } from "../components/dashboard-shell";

const integrations = [
  { name: "Zapier", logo: "/integrations/zapier.png", alt: "Zapier logo" },
  { name: "n8n", logo: "/integrations/n8n.png", alt: "n8n logo" },
  {
    name: "Google Sheets",
    logo: "/integrations/google-sheets.png",
    alt: "Google Sheets logo",
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
          </div>
        ))}
      </section>

      <p className="mt-8 text-sm font-semibold text-slate-600">
        More coming soon...
      </p>
    </DashboardShell>
  );
}
