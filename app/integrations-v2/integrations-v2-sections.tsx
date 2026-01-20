"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Blocks, KeyRound, LineChart, PlugZap } from "lucide-react";

import type { IntegrationOption } from "../lib/api-client";

const HERO_HIGHLIGHTS = [
  "Usage tagged by platform",
  "No-code or custom workflows",
  "Same API everywhere",
  "Bulk-friendly pipelines",
];

const VALUE_POINTS = [
  { label: "One API key works everywhere", icon: KeyRound },
  { label: "Track usage by platform in the API tab", icon: LineChart },
  { label: "Automations stay in sync with your credits", icon: Blocks },
];

const STARTER_STEPS = [
  { step: "Generate a key", description: "Create or reuse a key that tags usage by integration." },
  { step: "Drop it in your workflow", description: "Paste the key into Zapier, n8n, Sheets, or your own scripts." },
  { step: "Monitor usage", description: "See platform usage, errors, and throughput in the API dashboard." },
];

function SectionCard({
  children,
  transitionClass,
  delay,
}: {
  children: ReactNode;
  transitionClass?: string;
  delay?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border border-[var(--integrations-border)] bg-[var(--integrations-card-muted)] p-6 sm:p-8 ${transitionClass ?? ""}`}
      style={{ transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay ?? "0s"}` }}
    >
      {children}
    </div>
  );
}

export function IntegrationsHero({ transitionClass }: { transitionClass?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-[var(--integrations-border)] bg-[var(--integrations-card-strong)] px-6 py-10 shadow-[var(--integrations-shadow)] sm:px-10 ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.25)_0%,_transparent_70%)]" />
        <div className="absolute right-[-120px] top-[120px] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.12)_0%,_transparent_70%)]" />
      </div>
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--integrations-border)] bg-[var(--integrations-accent-soft)] px-4 py-2 text-xs font-semibold tracking-[0.2em] text-[var(--integrations-accent)]">
            <span className="h-2 w-2 rounded-full bg-[var(--integrations-accent)]" />
            INTEGRATIONS
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Connect verification to every
            <span className="bg-[linear-gradient(135deg,var(--integrations-accent)_0%,var(--integrations-accent-strong)_100%)] bg-clip-text text-transparent">
              {" "}
              workflow
            </span>
          </h1>
          <p className="mt-4 text-base text-[var(--text-secondary)] sm:text-lg">
            Generate keys for each platform, tag usage by source, and keep automation reporting consistent across your
            stack.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/api"
              className="rounded-xl bg-[linear-gradient(135deg,var(--integrations-accent)_0%,var(--integrations-accent-strong)_100%)] px-6 py-3 text-sm font-semibold text-[var(--integrations-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)]"
            >
              Generate API key
            </Link>
            <Link
              href="/verify"
              className="rounded-xl border border-[var(--integrations-border)] bg-white/70 px-6 py-3 text-sm font-semibold text-[var(--text-secondary)]"
            >
              Start verifying
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {HERO_HIGHLIGHTS.map((label) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--integrations-border)] bg-[var(--integrations-card-muted)] px-4 py-4 text-sm font-semibold text-[var(--text-secondary)]"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  option,
  iconError,
  onIconError,
}: {
  option: IntegrationOption;
  iconError: boolean;
  onIconError: () => void;
}) {
  const description = option.description?.trim();
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[var(--integrations-border)] bg-white/70 p-6">
      <div className="relative h-16 w-full">
        {option.icon && !iconError ? (
          <Image
            src={option.icon}
            alt={`${option.label} logo`}
            fill
            className="object-contain"
            sizes="(min-width: 1024px) 240px, 33vw"
            onError={onIconError}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-[var(--integrations-border)] text-sm font-semibold text-[var(--text-muted)]">
            {option.label}
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-4">
        <p className="text-sm font-semibold text-[var(--text-secondary)]">
          {description || "Details unavailable for this integration."}
        </p>
        <Link
          href={`/api?integration=${encodeURIComponent(option.id)}`}
          className="inline-flex w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--integrations-accent)_0%,var(--integrations-accent-strong)_100%)] px-4 py-2 text-sm font-semibold text-[var(--integrations-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)]"
        >
          Generate key for {option.label}
        </Link>
      </div>
    </div>
  );
}

export function IntegrationsCatalog({
  transitionClass,
  integrations,
  loading,
  error,
}: {
  transitionClass?: string;
  integrations: IntegrationOption[];
  loading: boolean;
  error: string | null;
}) {
  const [iconErrors, setIconErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (integrations.length === 0) return;
    const missingIcons = integrations.filter((option) => !option.icon);
    if (missingIcons.length > 0) {
      console.warn("integrations.icon_missing", {
        ids: missingIcons.map((option) => option.id),
      });
    }
    const missingDescriptions = integrations.filter((option) => !option.description?.trim());
    if (missingDescriptions.length > 0) {
      console.warn("integrations.description_missing", {
        ids: missingDescriptions.map((option) => option.id),
      });
    }
  }, [integrations]);

  const showEmpty = !loading && !error && integrations.length === 0;

  return (
    <SectionCard transitionClass={transitionClass} delay="0.05s">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Catalog</p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Launch from your favorite tools</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Pick an integration to tag usage, then call the API exactly the same way everywhere else.
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--integrations-accent-soft)] text-[var(--integrations-accent)]">
          <PlugZap className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-6">
        {loading ? (
          <div className="rounded-2xl border border-[var(--integrations-border)] bg-white/80 px-4 py-4 text-sm font-semibold text-[var(--text-muted)]">
            Loading integrations...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-4 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : showEmpty ? (
          <div className="rounded-2xl border border-[var(--integrations-border)] bg-white/80 px-4 py-4 text-sm font-semibold text-[var(--text-muted)]">
            No integrations available right now. Please refresh later.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                option={integration}
                iconError={Boolean(iconErrors[integration.id])}
                onIconError={() => {
                  setIconErrors((prev) => ({ ...prev, [integration.id]: true }));
                  console.warn("integrations.icon_failed", {
                    id: integration.id,
                    icon: integration.icon,
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="mt-6 rounded-2xl border border-[var(--integrations-border)] bg-white/70 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">
        Keys are universal; the integration choice simply tags usage so you can see consumption per platform on the API
        page.
      </div>
    </SectionCard>
  );
}

export function IntegrationsHighlights({ transitionClass }: { transitionClass?: string }) {
  return (
    <div
      className={`grid gap-6 lg:grid-cols-[1.1fr_0.9fr] ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s" }}
    >
      <SectionCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Usage</p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Stay on top of platform spend</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Every key can be mapped to a platform, so usage reporting stays clean without extra tooling.
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--integrations-accent-soft)] text-[var(--integrations-accent)]">
            <LineChart className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          {VALUE_POINTS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl border border-[var(--integrations-border)] bg-white/70 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]"
              >
                <span>{item.label}</span>
                <Icon className="h-4 w-4 text-[var(--integrations-accent)]" />
              </div>
            );
          })}
        </div>
      </SectionCard>
      <SectionCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Quick Start</p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Get integrated in minutes</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Follow the same three steps whether you are in a no-code builder or a custom app.
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--integrations-accent-soft)] text-[var(--integrations-accent)]">
            <Blocks className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {STARTER_STEPS.map((item, index) => (
            <div
              key={item.step}
              className="rounded-2xl border border-[var(--integrations-border)] bg-white/70 px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Step {index + 1}
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{item.step}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{item.description}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
