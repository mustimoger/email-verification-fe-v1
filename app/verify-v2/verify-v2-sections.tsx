import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  ListChecks,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import { formatNumber, type VerificationResult } from "../verify/utils";

const HERO_HIGHLIGHTS = [
  "Manual or bulk verification",
  "CSV and XLSX support",
  "Real-time status updates",
  "No charge for unknowns",
];

const WORKFLOW_STEPS = [
  {
    title: "Add your list",
    description: "Paste emails or drop a file to start a new verification run.",
    icon: UploadCloud,
  },
  {
    title: "Map email columns",
    description: "Confirm which column contains emails before you launch.",
    icon: ListChecks,
  },
  {
    title: "Review live results",
    description: "Track status changes and quality insights as the run completes.",
    icon: Sparkles,
  },
  {
    title: "Export with confidence",
    description: "Download results as soon as they finish to keep them handy.",
    icon: FileText,
  },
];

export type ResultsStatusCounts = {
  valid: number;
  invalid: number;
  catchAll: number;
  unknown: number;
  pending: number;
};

type ResultsStatusKey = keyof ResultsStatusCounts;

const STATUS_PILLS: { key: ResultsStatusKey; label: string; color: string }[] = [
  { key: "valid", label: "Valid", color: "bg-[var(--status-success)]" },
  { key: "invalid", label: "Invalid", color: "bg-[var(--status-danger)]" },
  { key: "catchAll", label: "Catch-all", color: "bg-[var(--status-warning)]" },
  { key: "unknown", label: "Unknown", color: "bg-[var(--status-unknown)]" },
];

const STATUS_LABELS: Record<ResultsStatusKey, string> = {
  valid: "Valid",
  invalid: "Invalid",
  catchAll: "Catch-all",
  unknown: "Unknown",
  pending: "Pending",
};

const STATUS_TONES: Record<ResultsStatusKey, string> = {
  valid: "text-[var(--status-success)]",
  invalid: "text-[var(--status-danger)]",
  catchAll: "text-[var(--status-warning)]",
  unknown: "text-[var(--status-unknown)]",
  pending: "text-[var(--text-muted)]",
};

const resolveStatusKey = (status?: string): ResultsStatusKey => {
  const normalized = status ? status.toLowerCase().trim() : "";
  if (!normalized) return "unknown";
  if (normalized === "exists" || normalized === "valid") return "valid";
  if (normalized === "not_exists" || normalized === "invalid" || normalized === "invalid_syntax") return "invalid";
  if (normalized === "catchall" || normalized === "catch-all" || normalized === "catch_all") return "catchAll";
  if (normalized === "unknown") return "unknown";
  if (normalized === "pending") return "pending";
  return "unknown";
};

type ManualVerificationCardProps = {
  inputValue: string;
  onInputChange: (value: string) => void;
  onVerify: () => void;
  onClear: () => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  transitionClass?: string;
};

type ResultsCardProps = {
  results: VerificationResult[];
  statusCounts: ResultsStatusCounts;
  statusLabel: string;
  onRefresh: (() => void) | null;
  isRefreshing: boolean;
  onExport: () => void;
  exportLabel: string;
  exportDisabled: boolean;
  exportError?: string | null;
  transitionClass?: string;
};

function SectionCard({
  children,
  className,
  transitionClass,
  delay = "0s",
}: {
  children: ReactNode;
  className?: string;
  transitionClass?: string;
  delay?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border border-[var(--verify-border)] bg-[var(--verify-card-muted)] p-6 sm:p-10 ${transitionClass ?? ""} ${className ?? ""}`}
      style={{ transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}` }}
    >
      {children}
    </div>
  );
}

export function VerifyHero({ transitionClass }: { transitionClass?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-[var(--verify-border)] bg-[var(--verify-card)] px-6 py-10 shadow-[var(--verify-shadow)] sm:px-10 ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.25)_0%,_transparent_70%)]" />
        <div className="absolute right-[-120px] top-[120px] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.12)_0%,_transparent_70%)]" />
      </div>
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--verify-border)] bg-[var(--verify-accent-soft)] px-4 py-2 text-xs font-semibold tracking-[0.2em] text-[var(--verify-accent)]">
            <span className="h-2 w-2 rounded-full bg-[var(--verify-accent)]" />
            VERIFY IN MINUTES
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Verify every list with
            <span className="bg-[linear-gradient(135deg,var(--verify-accent)_0%,var(--verify-accent-strong)_100%)] bg-clip-text text-transparent">
              {" "}
              precision
            </span>
          </h1>
          <p className="mt-4 text-base text-[var(--text-secondary)] sm:text-lg">
            Run manual checks or bulk uploads in one workspace, then export clean results the moment they finish.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-xl bg-[linear-gradient(135deg,var(--verify-accent)_0%,var(--verify-accent-strong)_100%)] px-6 py-3 text-sm font-semibold text-[var(--verify-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)]"
            >
              Start verification
            </button>
            <Link
              href="/history"
              className="rounded-xl border border-[var(--verify-border)] bg-white/70 px-6 py-3 text-sm font-semibold text-[var(--text-secondary)]"
            >
              View history
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {HERO_HIGHLIGHTS.map((label) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--verify-border)] bg-[var(--verify-card-muted)] px-4 py-4 text-sm font-semibold text-[var(--text-secondary)]"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ManualVerificationCard({
  transitionClass,
  inputValue,
  onInputChange,
  onVerify,
  onClear,
  isSubmitting,
  errorMessage,
}: ManualVerificationCardProps) {
  return (
    <div
      className={`rounded-2xl border border-[var(--verify-border)] bg-[var(--verify-card-strong)] p-6 shadow-[var(--verify-shadow)] ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.05s" }}
    >
      <div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Manual verification</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Paste one email per line to run a focused verification pass.
        </p>
      </div>
      <div className="mt-5 rounded-xl border border-[var(--verify-border)] bg-white/70 p-4">
        <textarea
          aria-label="Email list"
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          rows={8}
          spellCheck={false}
          className="w-full resize-none bg-transparent text-sm text-[var(--text-secondary)] outline-none"
        />
      </div>
      {errorMessage ? (
        <div
          className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200/70 bg-rose-50/80 px-3 py-2 text-xs font-semibold text-rose-700"
          role="alert"
        >
          <AlertCircle className="h-4 w-4" />
          {errorMessage}
        </div>
      ) : null}
      <div className="mt-4 rounded-lg border border-[var(--verify-border)] bg-[var(--verify-accent-soft)] px-4 py-3 text-xs font-semibold text-[var(--verify-accent)]">
        Manual results stay available for this session. Export them right after completion.
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onVerify}
          disabled={isSubmitting}
          className="rounded-xl bg-[linear-gradient(135deg,var(--verify-accent)_0%,var(--verify-accent-strong)_100%)] px-6 py-3 text-sm font-semibold text-[var(--verify-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)]"
        >
          {isSubmitting ? "Verifying..." : "Verify emails"}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={isSubmitting}
          className="rounded-xl border border-[var(--verify-border)] bg-white/70 px-6 py-3 text-sm font-semibold text-[var(--text-secondary)]"
        >
          Clear input
        </button>
      </div>
    </div>
  );
}

export function ResultsCard({
  transitionClass,
  results,
  statusCounts,
  statusLabel,
  onRefresh,
  isRefreshing,
  onExport,
  exportLabel,
  exportDisabled,
  exportError,
}: ResultsCardProps) {
  const hasResults = results.length > 0;
  return (
    <div
      className={`rounded-2xl border border-[var(--verify-border)] bg-[var(--verify-card-strong)] p-6 shadow-[var(--verify-shadow)] ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">Live results</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {statusLabel}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Results appear here once verification begins.
      </p>
      <div className="mt-6 grid gap-3">
        {STATUS_PILLS.map((status) => (
          <div
            key={status.label}
            className="flex items-center justify-between rounded-xl border border-[var(--verify-border)] bg-white/70 px-4 py-3 text-sm text-[var(--text-secondary)]"
          >
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${status.color}`} />
              <span className="font-semibold">{status.label}</span>
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {formatNumber(hasResults ? statusCounts[status.key] : null)}
            </span>
          </div>
        ))}
      </div>
      {exportError ? (
        <div
          className="mt-4 rounded-lg border border-rose-200/70 bg-rose-50/80 px-3 py-2 text-xs font-semibold text-rose-700"
          role="alert"
        >
          {exportError}
        </div>
      ) : null}
      <div className="mt-5 rounded-xl border border-[var(--verify-border)] bg-white/70 p-4">
        {hasResults ? (
          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {results.map((item) => {
              const statusKey = resolveStatusKey(item.status);
              return (
                <div
                  key={item.email}
                  className="flex items-center justify-between rounded-lg border border-[var(--verify-border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-secondary)]"
                >
                  <span className="truncate pr-3 font-semibold">{item.email}</span>
                  <span className={`text-xs font-semibold uppercase ${STATUS_TONES[statusKey]}`}>
                    {STATUS_LABELS[statusKey]}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Results will appear here after verification.</p>
        )}
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-xl border border-[var(--verify-border)] bg-white/70 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
          >
            {isRefreshing ? "Refreshing..." : "Refresh status"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onExport}
          disabled={exportDisabled}
          className="rounded-xl border border-[var(--verify-border)] bg-white/70 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {exportLabel}
        </button>
      </div>
    </div>
  );
}

export function UploadSection({
  transitionClass,
  showSummary = false,
}: {
  transitionClass?: string;
  showSummary?: boolean;
}) {
  const summaryPanel = (
    <div className="rounded-2xl border border-[var(--verify-border)] bg-[var(--verify-card-strong)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Upload summary</h3>
          <p className="text-xs text-[var(--text-muted)]">This panel activates when uploads complete.</p>
        </div>
        <button
          type="button"
          className="rounded-xl border border-[var(--verify-border)] bg-white/70 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]"
        >
          Refresh status
        </button>
      </div>
      <div className="mt-4 rounded-2xl border border-dashed border-[var(--verify-border)] bg-white/70 px-4 py-10 text-center text-xs text-[var(--text-muted)]">
        Summary charts appear here after a successful upload.
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
        <span className="rounded-full border border-[var(--verify-border)] bg-white/70 px-3 py-1">
          Status breakdown
        </span>
        <span className="rounded-full border border-[var(--verify-border)] bg-white/70 px-3 py-1">
          Completion time
        </span>
        <span className="rounded-full border border-[var(--verify-border)] bg-white/70 px-3 py-1">
          Export ready
        </span>
      </div>
    </div>
  );

  const preflightPanel = (
    <div className="rounded-2xl border border-[var(--verify-border)] bg-[var(--verify-card-strong)] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--verify-accent-soft)] text-[var(--verify-accent)]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Pre-flight checklist</h3>
          <p className="text-xs text-[var(--text-muted)]">Prepare your file for clean results.</p>
        </div>
      </div>
      <div className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
        <div className="flex items-start gap-3 rounded-xl border border-[var(--verify-border)] bg-white/70 px-3 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--verify-accent)]" />
          Ensure each row has one email address.
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-[var(--verify-border)] bg-white/70 px-3 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--verify-accent)]" />
          Label the email column to speed up mapping.
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-[var(--verify-border)] bg-white/70 px-3 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--verify-accent)]" />
          Keep files under your plan upload limit.
        </div>
      </div>
    </div>
  );

  return (
    <SectionCard transitionClass={transitionClass} delay="0.15s">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Bulk upload</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Drop a CSV or spreadsheet to verify lists in minutes.
          </p>
          <div className="mt-5 flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--verify-border)] bg-white/70 px-4 text-center">
            <UploadCloud className="h-8 w-8 text-[var(--text-muted)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Drag files here</p>
              <p className="text-xs text-[var(--text-muted)]">CSV, XLSX, or XLS</p>
            </div>
            <button
              type="button"
              className="rounded-xl border border-[var(--verify-border)] bg-white/70 px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]"
            >
              Browse files
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
            <span className="rounded-full border border-[var(--verify-border)] bg-white/70 px-3 py-1">
              Auto-detect headers
            </span>
            <span className="rounded-full border border-[var(--verify-border)] bg-white/70 px-3 py-1">
              Duplicate removal
            </span>
            <span className="rounded-full border border-[var(--verify-border)] bg-white/70 px-3 py-1">
              Column mapping
            </span>
          </div>
        </div>
        {showSummary ? summaryPanel : preflightPanel}
      </div>
    </SectionCard>
  );
}

export function WorkflowSection({ transitionClass }: { transitionClass?: string }) {
  return (
    <SectionCard transitionClass={transitionClass} delay="0.25s">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Verification workflow</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Every run follows a consistent, transparent sequence.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {WORKFLOW_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="rounded-2xl border border-[var(--verify-border)] bg-white/70 p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--verify-accent-soft)] text-[var(--verify-accent)]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">{step.title}</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{step.description}</p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
