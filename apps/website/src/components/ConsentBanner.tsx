"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConsentDecision, ConsentStatus, ConsentUpdateSource } from "@/lib/consent";
import {
  getConsentStatus,
  saveConsentDecision,
  subscribeToConsentBannerRequests,
  subscribeToConsentUpdates,
} from "@/lib/consent";

type LegalLink = {
  key: "privacy" | "terms" | "gdpr";
  label: string;
  href: string;
};

const LEGAL_LINKS: LegalLink[] = [
  { key: "privacy", label: "Privacy Policy", href: "/privacy-policy" },
  { key: "terms", label: "Terms of Service", href: "/terms" },
  { key: "gdpr", label: "GDPR Compliance", href: "/gdpr-compliance" },
];

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<ConsentStatus>("unknown");
  const [source, setSource] = useState<ConsentUpdateSource>("banner");
  const legalLinks = useMemo(() => LEGAL_LINKS, []);

  useEffect(() => {
    const current = getConsentStatus();
    setStatus(current);
    setVisible(current === "unknown");
    setSource("banner");

    const unsubscribeUpdates = subscribeToConsentUpdates((update) => {
      setStatus(update.status);
      setVisible(false);
      setSource("banner");
    });

    const unsubscribeOpen = subscribeToConsentBannerRequests(() => {
      setStatus(getConsentStatus());
      setVisible(true);
      setSource("preferences");
    });

    return () => {
      unsubscribeUpdates();
      unsubscribeOpen();
    };
  }, []);

  const handleDecision = (decision: ConsentDecision) => {
    saveConsentDecision(decision, source);
    setStatus(decision);
    setVisible(false);
    setSource("banner");
  };

  if (!visible) {
    return null;
  }

  const currentPreferenceLabel =
    status === "accepted" ? "Accepted" : status === "rejected" ? "Rejected" : "Not set yet";
  const isReviewMode = source === "preferences";

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="mx-auto w-full max-w-[1176px] rounded-[16px] border border-white/20 bg-[#101214]/95 px-4 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[16px] font-semibold leading-6 text-white">Cookie preferences</p>
            <p className="max-w-3xl text-[14px] leading-[22px] text-white/80">
              We use essential cookies for core site functionality. Optional analytics cookies help
              us understand performance and improve the website. Choose Accept to enable optional
              cookies, or Reject to keep them disabled.
            </p>
            {isReviewMode ? (
              <p className="text-[13px] leading-5 text-white/70">
                Current setting: <span className="font-semibold text-white">{currentPreferenceLabel}</span>
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3 text-[13px] leading-5">
              {legalLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-white/80 underline-offset-2 transition hover:text-[#3397F6] hover:underline"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {isReviewMode ? (
              <button
                type="button"
                onClick={() => setVisible(false)}
                className="inline-flex items-center justify-center rounded-[10px] border border-white/20 px-4 py-2 text-[14px] font-medium text-white/80 transition hover:border-white/40 hover:text-white"
              >
                Close
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => handleDecision("rejected")}
              className="inline-flex items-center justify-center rounded-[10px] border border-white/20 px-4 py-2 text-[14px] font-semibold text-white transition hover:border-white/40"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => handleDecision("accepted")}
              className="inline-flex items-center justify-center rounded-[10px] bg-[#3397F6] px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-[#3FA0F8]"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
