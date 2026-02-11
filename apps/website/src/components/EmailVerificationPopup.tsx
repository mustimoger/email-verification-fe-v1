"use client";

import {
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  type PopupVerificationResult,
  type PopupVerificationStatus,
} from "@/lib/email-verification";

type EmailVerificationPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  result: PopupVerificationResult | null;
  isLoading: boolean;
  email: string;
  errorMessage?: string | null;
};

type StatusConfig = {
  label: string;
  tagline: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  icon: keyof typeof ICON_MAP;
  risk: keyof typeof RISK_LABELS;
};

const STATUS_CONFIG: Record<PopupVerificationStatus, StatusConfig> = {
  valid: {
    label: "Valid",
    tagline: "This email is deliverable and safe to send",
    accent: "#22c55e",
    accentBg: "rgba(34,197,94,0.08)",
    accentBorder: "rgba(34,197,94,0.18)",
    icon: "check",
    risk: "none",
  },
  invalid: {
    label: "Invalid",
    tagline: "This mailbox does not exist or cannot receive email",
    accent: "#ef4444",
    accentBg: "rgba(239,68,68,0.08)",
    accentBorder: "rgba(239,68,68,0.18)",
    icon: "x",
    risk: "high",
  },
  invalid_syntax: {
    label: "Invalid Syntax",
    tagline: "The email format is invalid",
    accent: "#ef4444",
    accentBg: "rgba(239,68,68,0.08)",
    accentBorder: "rgba(239,68,68,0.18)",
    icon: "x",
    risk: "high",
  },
  catchall: {
    label: "Catch-All",
    tagline: "Domain accepts all addresses and can hide invalid mailboxes",
    accent: "#f59e0b",
    accentBg: "rgba(245,158,11,0.08)",
    accentBorder: "rgba(245,158,11,0.18)",
    icon: "alert",
    risk: "medium",
  },
  disposable_domain: {
    label: "Disposable",
    tagline: "Temporary inbox detected",
    accent: "#f97316",
    accentBg: "rgba(249,115,22,0.08)",
    accentBorder: "rgba(249,115,22,0.18)",
    icon: "trash",
    risk: "high",
  },
  role_based: {
    label: "Role-Based",
    tagline: "Shared mailbox detected (info@, support@)",
    accent: "#8b5cf6",
    accentBg: "rgba(139,92,246,0.08)",
    accentBorder: "rgba(139,92,246,0.18)",
    icon: "users",
    risk: "medium",
  },
  unknown: {
    label: "Unknown",
    tagline: "Could not verify this address right now",
    accent: "#6b7280",
    accentBg: "rgba(107,114,128,0.08)",
    accentBorder: "rgba(107,114,128,0.18)",
    icon: "help",
    risk: "unknown",
  },
};

const RISK_LABELS = {
  none: { text: "Safe to Send", color: "#22c55e" },
  medium: { text: "Proceed with Caution", color: "#f59e0b" },
  high: { text: "Do Not Send", color: "#ef4444" },
  unknown: { text: "Inconclusive", color: "#6b7280" },
};

function IconCheck({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconX({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconAlert({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconHelp({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconTrash({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function IconUsers({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconMail({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconLoader({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

const ICON_MAP = {
  check: IconCheck,
  x: IconX,
  alert: IconAlert,
  help: IconHelp,
  trash: IconTrash,
  users: IconUsers,
};

type DetailRowProps = {
  label: string;
  value: string;
  passed: boolean | null;
  delay?: number;
};

function DetailRow({ label, value, passed, delay = 0 }: DetailRowProps) {
  return (
    <div
      className="flex items-center justify-between border-b border-white/[0.04] py-2.5 opacity-0 last:border-0 animate-fadeSlideUp"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <span className="text-sm tracking-wide text-gray-400">{label}</span>
      <span
        className={`text-sm font-medium tracking-wide ${
          passed === true
            ? "text-emerald-400"
            : passed === false
              ? "text-red-400"
              : "text-gray-300"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function formatBooleanLabel(value: boolean | undefined, yes = "Yes", no = "No") {
  if (value === undefined) {
    return "Unknown";
  }
  return value ? yes : no;
}

export default function EmailVerificationPopup({
  isOpen,
  onClose,
  result,
  isLoading,
  email,
  errorMessage,
}: EmailVerificationPopupProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    const timer = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
    return () => clearTimeout(timer);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, handleClose]);

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      handleClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const statusKey = result?.status ?? "unknown";
  const config = STATUS_CONFIG[statusKey];
  const StatusIcon = ICON_MAP[config.icon];
  const riskInfo = RISK_LABELS[config.risk];

  return (
    <>
      <style jsx global>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes scaleOut {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.92) translateY(16px); }
        }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes overlayOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes pulseRing {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-fadeSlideUp { animation: fadeSlideUp 0.35s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16,1,0.3,1); }
        .animate-scaleOut { animation: scaleOut 0.25s ease-in forwards; }
        .animate-overlayIn { animation: overlayIn 0.25s ease-out; }
        .animate-overlayOut { animation: overlayOut 0.2s ease-in forwards; }
        .animate-pulseRing { animation: pulseRing 1.8s ease-out infinite; }
        .animate-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0) 100%);
          background-size: 200% 100%;
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>

      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-md ${
          isClosing ? "animate-overlayOut" : "animate-overlayIn"
        }`}
      >
        <div
          className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.06] shadow-2xl ${
            isClosing ? "animate-scaleOut" : "animate-scaleIn"
          }`}
          style={{
            background:
              "linear-gradient(165deg, #0f172a 0%, #0c1322 40%, #0a0f1e 100%)",
          }}
        >
          <div
            className="h-1 w-full"
            style={{ background: `linear-gradient(90deg, ${config.accent}, transparent)` }}
          />

          <button
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-gray-500 transition-colors duration-150 hover:bg-white/[0.05] hover:text-gray-300"
            aria-label="Close popup"
          >
            <IconX size={18} />
          </button>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-5 px-6 py-16">
              <div className="relative">
                <div
                  className="absolute inset-0 animate-pulseRing rounded-full"
                  style={{ border: "2px solid rgba(59,130,246,0.3)" }}
                />
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10">
                  <IconLoader size={24} color="#3b82f6" />
                </div>
              </div>
              <div className="space-y-1.5 text-center">
                <p className="text-sm font-medium tracking-wide text-gray-200">
                  Verifying email...
                </p>
                <p className="max-w-[280px] truncate font-mono text-xs text-gray-500">
                  {email}
                </p>
              </div>
              <div className="h-1 w-48 overflow-hidden rounded-full bg-white/[0.03]">
                <div className="animate-shimmer h-full w-full" />
              </div>
            </div>
          ) : null}

          {!isLoading && result ? (
            <div className="px-6 pb-5 pt-6">
              <div className="mb-5 flex items-start gap-4">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    backgroundColor: config.accentBg,
                    borderColor: config.accentBorder,
                  }}
                >
                  <StatusIcon size={22} color={config.accent} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="mb-1 flex items-center gap-2.5">
                    <span
                      className="rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.1em]"
                      style={{
                        color: config.accent,
                        backgroundColor: config.accentBg,
                        border: `1px solid ${config.accentBorder}`,
                      }}
                    >
                      {config.label}
                    </span>
                    <span
                      className="text-[10px] font-semibold tracking-wide"
                      style={{ color: riskInfo.color }}
                    >
                      {riskInfo.text}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-400">{config.tagline}</p>
                </div>
              </div>

              <div
                className="animate-fadeSlideUp mb-5 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 opacity-0"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  animationDelay: "80ms",
                  animationFillMode: "forwards",
                }}
              >
                <IconMail size={15} color="#64748b" />
                <span className="truncate font-mono text-sm text-gray-300">
                  {result.email || email}
                </span>
              </div>

              {result.did_you_mean ? (
                <div
                  className="animate-fadeSlideUp mb-5 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs opacity-0"
                  style={{
                    background: "rgba(59,130,246,0.06)",
                    border: "1px solid rgba(59,130,246,0.12)",
                    animationDelay: "120ms",
                    animationFillMode: "forwards",
                  }}
                >
                  <span className="font-semibold text-blue-400">Tip</span>
                  <span className="text-blue-300/80">
                    Did you mean <strong className="text-blue-300">{result.did_you_mean}</strong>?
                  </span>
                </div>
              ) : null}

              <div
                className="overflow-hidden rounded-xl border border-white/[0.04]"
                style={{ background: "rgba(255,255,255,0.015)" }}
              >
                <div className="border-b border-white/[0.04] px-4 py-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">
                    Verification Details
                  </span>
                </div>
                <div className="px-4">
                  {result.syntax_valid !== undefined ? (
                    <DetailRow
                      label="Syntax"
                      value={result.syntax_valid ? "Valid" : "Invalid"}
                      passed={result.syntax_valid}
                      delay={150}
                    />
                  ) : null}
                  {result.mx_found !== undefined ? (
                    <DetailRow
                      label="MX Records"
                      value={result.mx_found ? "Found" : "Not Found"}
                      passed={result.mx_found}
                      delay={200}
                    />
                  ) : null}
                  <DetailRow
                    label="Status"
                    value={config.label}
                    passed={
                      statusKey === "valid"
                        ? true
                        : statusKey === "invalid" || statusKey === "invalid_syntax"
                          ? false
                          : null
                    }
                    delay={250}
                  />
                  <DetailRow
                    label="Domain"
                    value={result.domain || "Unknown"}
                    passed={null}
                    delay={300}
                  />
                  <DetailRow
                    label="Role Address"
                    value={formatBooleanLabel(result.is_role)}
                    passed={result.is_role === undefined ? null : !result.is_role}
                    delay={350}
                  />
                  <DetailRow
                    label="Disposable"
                    value={formatBooleanLabel(result.is_disposable)}
                    passed={
                      result.is_disposable === undefined ? null : !result.is_disposable
                    }
                    delay={400}
                  />
                  <DetailRow
                    label="Catch-All"
                    value={formatBooleanLabel(result.is_catchall)}
                    passed={null}
                    delay={450}
                  />
                  {result.unknown_reason ? (
                    <DetailRow
                      label="Unknown Reason"
                      value={result.unknown_reason}
                      passed={null}
                      delay={500}
                    />
                  ) : null}
                </div>
              </div>

              <div
                className="animate-fadeSlideUp mt-5 opacity-0"
                style={{ animationDelay: "550ms", animationFillMode: "forwards" }}
              >
                <a
                  href="https://app.boltroute.ai/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-center text-sm font-semibold tracking-wide text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-amber-400 hover:to-orange-400 hover:shadow-orange-400/30"
                >
                  Verify your full list - 100 free credits -&gt;
                </a>
                <p className="mt-2.5 text-center text-[11px] tracking-wide text-gray-600">
                  No credit card required • Credits never expire
                </p>
              </div>
            </div>
          ) : null}

          {!isLoading && !result ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-14">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                <IconX size={22} color="#ef4444" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-sm font-medium text-gray-200">Verification failed</p>
                <p className="text-xs text-gray-500">
                  {errorMessage || "Something went wrong. Please try again."}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="mt-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-5 py-2 text-xs font-medium text-gray-300 transition-colors duration-150 hover:bg-white/[0.06]"
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
