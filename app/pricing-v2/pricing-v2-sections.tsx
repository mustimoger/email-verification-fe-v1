import Link from "next/link";

import {
  formatCredits,
  formatCurrency,
  formatPricePerEmail,
  formatVolumeLabel,
  type DisplayPriceEntry,
} from "./utils";

const COMPARISON_ROWS = [
  { feature: "Credits Expire", boltroute: "Never", others: "30-365 days" },
  { feature: "Catch-all Detection", boltroute: "Advanced", others: "Basic" },
  { feature: "Charge for Unknowns", boltroute: "Free", others: "Often charged" },
  { feature: "Support Response", boltroute: "< 4 hours", others: "24-72 hours" },
  { feature: "Uptime SLA", boltroute: "99.9%", others: "No guarantee" },
];

const FAQS = [
  {
    q: "Do credits expire?",
    a: "Never. Your credits remain valid indefinitely until you use them.",
  },
  {
    q: "What if an email can't be verified?",
    a: "You're not charged for unknown or catch-all results. Only pay for definitive verifications.",
  },
  {
    q: "Can I switch between plans?",
    a: "Yes, upgrade or downgrade anytime. Unused credits always roll over.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept Visa, Mastercard, American Express, and PayPal.",
  },
];

export function VolumePricingSection({
  entries,
  currency,
  selectedQuantity,
  onSelect,
  transitionClass,
}: {
  entries: DisplayPriceEntry[];
  currency: string;
  selectedQuantity: number | null;
  onSelect: (volume: number) => void;
  transitionClass?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border border-[var(--pricing-border)] bg-[var(--pricing-card-muted)] p-6 sm:p-10 ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s" }}
    >
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Volume Pricing</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">The more you verify, the more you save</p>
      </div>
      {entries.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {entries.map((tier) => {
            const isActive = selectedQuantity === tier.volume;
            return (
              <button
                key={tier.volume}
                type="button"
                onClick={() => onSelect(tier.volume)}
                className={`rounded-xl border px-4 py-4 text-center transition ${
                  isActive
                    ? "border-[var(--pricing-accent)] bg-[var(--pricing-accent-soft)]"
                    : "border-[var(--pricing-border)] bg-white/70"
                }`}
              >
                <div
                  className={`text-xs font-semibold ${
                    isActive ? "text-[var(--pricing-accent)]" : "text-[var(--text-muted)]"
                  }`}
                >
                  {formatVolumeLabel(tier.volume)}
                </div>
                <div className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  {formatCurrency(tier.total, currency)}
                </div>
                <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                  {"$"}
                  {formatPricePerEmail(tier.total, tier.volume)}/ea
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">Volume pricing is unavailable right now.</p>
      )}
    </div>
  );
}

export function ComparisonSection({
  transitionClass,
  priceLabel,
  priceOthersLabel,
}: {
  transitionClass?: string;
  priceLabel: string;
  priceOthersLabel: string;
}) {
  const rows = [
    { feature: "Price (100K emails)", boltroute: priceLabel, others: priceOthersLabel },
    ...COMPARISON_ROWS,
  ];
  return (
    <div
      className={`rounded-[24px] border border-[var(--pricing-border)] bg-[var(--pricing-card-muted)] p-6 sm:p-10 ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s" }}
    >
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Why BoltRoute?</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Same pricing as budget tools. Superior everything else.
        </p>
      </div>

      <div className="mt-8 grid gap-y-2 sm:grid-cols-[2fr_1fr_1fr]">
        <div></div>
        <div className="rounded-t-xl bg-[var(--pricing-accent-soft)] px-4 py-3 text-center text-sm font-semibold text-[var(--pricing-accent)]">
          BoltRoute
        </div>
        <div className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)]">Others</div>

        {rows.map((row) => (
          <div key={row.feature} className="contents">
            <div className="border-t border-[var(--pricing-border)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              {row.feature}
            </div>
            <div className="border-t border-[var(--pricing-border)] bg-white/60 px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)]">
              {row.boltroute}
            </div>
            <div className="border-t border-[var(--pricing-border)] px-4 py-3 text-center text-sm text-[var(--text-muted)]">
              {row.others}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FaqSection({ transitionClass }: { transitionClass?: string }) {
  return (
    <div
      className={`rounded-[24px] border border-[var(--pricing-border)] bg-[var(--pricing-card-muted)] p-6 sm:p-10 ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.3s" }}
    >
      <h2 className="text-center text-2xl font-semibold text-[var(--text-primary)]">
        Frequently Asked Questions
      </h2>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {FAQS.map((faq) => (
          <div key={faq.q} className="rounded-2xl border border-[var(--pricing-border)] bg-white/70 p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{faq.q}</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinalCtaSection({
  transitionClass,
  freeTrialCredits,
}: {
  transitionClass?: string;
  freeTrialCredits?: number | null;
}) {
  return (
    <div
      className={`rounded-[24px] border border-[var(--pricing-border)] bg-[var(--pricing-accent-soft)] p-8 text-center sm:p-12 ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.4s" }}
    >
      <div className="mx-auto max-w-xl">
        <h2 className="text-3xl font-semibold text-[var(--text-primary)]">Start verifying emails today</h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          {freeTrialCredits
            ? `Get ${formatCredits(freeTrialCredits)} free credits to test our accuracy. No credit card required.`
            : "Get free credits to test our accuracy. No credit card required."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-xl bg-[linear-gradient(135deg,var(--pricing-accent)_0%,var(--pricing-accent-strong)_100%)] px-6 py-3 text-sm font-semibold text-[var(--pricing-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)]"
          >
            Start Free Trial
          </Link>
          <Link
            href="/api"
            className="rounded-xl border border-[var(--pricing-border)] bg-white/60 px-6 py-3 text-sm font-semibold text-[var(--text-secondary)]"
          >
            View Documentation
          </Link>
        </div>
      </div>
    </div>
  );
}
