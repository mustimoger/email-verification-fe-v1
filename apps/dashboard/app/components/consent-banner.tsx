"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConsentDecision, ConsentStatus } from "../lib/consent";
import { getConsentStatus, saveConsentDecision, subscribeToConsentUpdates } from "../lib/consent";
import { getLegalLinks } from "../lib/legal-links";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<ConsentStatus>("unknown");
  const legalLinks = useMemo(() => getLegalLinks(), []);

  useEffect(() => {
    const current = getConsentStatus();
    setStatus(current);
    setVisible(current === "unknown");
    return subscribeToConsentUpdates((update) => {
      setStatus(update.status);
      setVisible(false);
    });
  }, []);

  const handleDecision = (decision: ConsentDecision) => {
    saveConsentDecision(decision);
    setStatus(decision);
    setVisible(false);
  };

  if (!visible || status !== "unknown") {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        role="dialog"
        aria-live="polite"
        aria-label="Cookie consent"
        className="w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface-overlay-strong)] px-4 py-4 shadow-[var(--nav-shadow)] backdrop-blur sm:px-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Cookie preferences
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              We use cookies and similar technologies to support core features and to enable optional
              services like chat and checkout. Accept to enable non-essential cookies, or reject to
              keep them off.
            </p>
            {legalLinks.length ? (
              <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-[var(--text-muted)]">
                {legalLinks.map((link) => (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="transition hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => handleDecision("rejected")}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border-strong)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => handleDecision("accepted")}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] shadow-[0_10px_22px_rgba(15,23,42,0.12)] transition hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
