"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const HERO_HIGHLIGHTS = [
  "Profile updates in one place",
  "Security checks on demand",
  "Billing history visibility",
  "Credits overview at a glance",
];

export function AccountHero({ transitionClass }: { transitionClass?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-[var(--account-border)] bg-[var(--account-card-strong)] px-6 py-10 shadow-[var(--account-shadow)] sm:px-10 ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.25)_0%,_transparent_70%)]" />
        <div className="absolute right-[-120px] top-[120px] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.12)_0%,_transparent_70%)]" />
      </div>
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--account-border)] bg-[var(--account-accent-soft)] px-4 py-2 text-xs font-semibold tracking-[0.2em] text-[var(--account-accent)]">
            <span className="h-2 w-2 rounded-full bg-[var(--account-accent)]" />
            ACCOUNT SETTINGS
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Keep your profile{" "}
            <span className="bg-[linear-gradient(135deg,var(--account-accent)_0%,var(--account-accent-strong)_100%)] bg-clip-text text-transparent">
              secure
            </span>
            , current, and ready.
          </h1>
          <p className="mt-4 text-base text-[var(--text-secondary)] sm:text-lg">
            Update identity details, refresh credentials, and review billing history from a single dashboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/verify"
              className="rounded-xl bg-[linear-gradient(135deg,var(--account-accent)_0%,var(--account-accent-strong)_100%)] px-6 py-3 text-sm font-semibold text-[var(--account-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(249,168,37,0.38)]"
            >
              Verify emails
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-[var(--account-border)] bg-[var(--account-surface-contrast)] px-6 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:-translate-y-0.5 hover:border-[var(--account-accent)] hover:bg-[var(--account-accent-soft)] hover:text-[var(--text-primary)]"
            >
              View pricing
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {HERO_HIGHLIGHTS.map((label) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--account-border)] bg-[var(--account-card-muted)] px-4 py-4 text-sm font-semibold text-[var(--text-secondary)]"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AccountSectionCard({
  id,
  children,
  className,
  transitionClass,
  delay = "0s",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  transitionClass?: string;
  delay?: string;
}) {
  return (
    <div
      id={id}
      className={`rounded-[24px] border border-[var(--account-border)] bg-[var(--account-card-muted)] p-6 sm:p-8 ${transitionClass ?? ""} ${className ?? ""}`}
      style={{ transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}` }}
    >
      {children}
    </div>
  );
}
