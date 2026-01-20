"use client";

import Link from "next/link";
import { FileDown, History, ListChecks } from "lucide-react";

import { EXTERNAL_DATA_UNAVAILABLE, type HistoryRow } from "../history/utils";

const HERO_HIGHLIGHTS = [
  "Export-ready results",
  "Status timeline visibility",
  "Audit-friendly summaries",
  "Download on demand",
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "processing", label: "Processing" },
  { key: "failed", label: "Failed" },
] as const;

const STATUS_LEGEND = [
  { label: "Completed", color: "var(--status-success)" },
  { label: "Processing", color: "var(--status-warning)" },
  { label: "Failed", color: "var(--status-danger)" },
];

const STATUS_TONE_CLASS: Record<HistoryRow["statusTone"], string> = {
  completed: "bg-[var(--status-success)]",
  processing: "bg-[var(--status-warning)]",
  failed: "bg-[var(--status-danger)]",
  unknown: "bg-[var(--status-unknown)]",
};

type FilterKey = (typeof FILTERS)[number]["key"];

export type HistorySummary = {
  total: number;
  completed: number;
  processing: number;
  failed: number;
  downloadable: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
        isActive
          ? "border-[var(--history-accent)] bg-[var(--history-accent-soft)] text-[var(--history-accent)]"
          : "border-[var(--history-border)] bg-[var(--history-surface-contrast)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {label}
    </button>
  );
}

export function HistoryHero({ transitionClass }: { transitionClass?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-[var(--history-border)] bg-[var(--history-card-strong)] px-6 py-10 shadow-[var(--history-shadow)] sm:px-10 ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.25)_0%,_transparent_70%)]" />
        <div className="absolute right-[-120px] top-[120px] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.12)_0%,_transparent_70%)]" />
      </div>
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--history-border)] bg-[var(--history-accent-soft)] px-4 py-2 text-xs font-semibold tracking-[0.2em] text-[var(--history-accent)]">
            <span className="h-2 w-2 rounded-full bg-[var(--history-accent)]" />
            VERIFICATION HISTORY
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Keep every verification
            <span className="bg-[linear-gradient(135deg,var(--history-accent)_0%,var(--history-accent-strong)_100%)] bg-clip-text text-transparent">
              {" "}
              organized
            </span>
          </h1>
          <p className="mt-4 text-base text-[var(--text-secondary)] sm:text-lg">
            Track status changes, download exports, and revisit past results without hunting through inboxes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/verify"
              className="rounded-xl bg-[linear-gradient(135deg,var(--history-accent)_0%,var(--history-accent-strong)_100%)] px-6 py-3 text-sm font-semibold text-[var(--history-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(249,168,37,0.38)]"
            >
              Start verification
            </Link>
            <Link
              href="/api"
              className="rounded-xl border border-[var(--history-border)] bg-[var(--history-surface-contrast)] px-6 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:-translate-y-0.5 hover:border-[var(--history-accent)] hover:bg-[var(--history-accent-soft)] hover:text-[var(--text-primary)]"
            >
              View API
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {HERO_HIGHLIGHTS.map((label) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--history-border)] bg-[var(--history-card-muted)] px-4 py-4 text-sm font-semibold text-[var(--text-secondary)]"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HistoryHighlights({
  summary,
  loading,
  transitionClass,
}: {
  summary: HistorySummary;
  loading: boolean;
  transitionClass?: string;
}) {
  const hasHistory = summary.total > 0;
  return (
    <div
      className={`grid gap-6 lg:grid-cols-[1.2fr_0.9fr] ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.05s" }}
    >
      <div className="rounded-[24px] border border-[var(--history-border)] bg-[var(--history-card-muted)] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Snapshot</p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">History at a glance</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Review past runs, progress states, and export availability in one timeline.
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--history-accent-soft)] text-[var(--history-accent)]">
            <History className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-[var(--history-border)] bg-[var(--history-surface-contrast)] p-5">
          {loading && !hasHistory ? (
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Loading history</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">Fetching your latest verification timeline.</p>
            </div>
          ) : hasHistory ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Total tasks", value: summary.total },
                { label: "Downloadable exports", value: summary.downloadable },
                { label: "Completed", value: summary.completed },
                { label: "Processing", value: summary.processing },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[var(--history-border)] bg-[var(--history-surface-contrast-strong)] px-3 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                    {formatNumber(item.value)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">No history yet</p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Run a verification to start building your history timeline.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="rounded-[24px] border border-[var(--history-border)] bg-[var(--history-card-muted)] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Exports</p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Results ready to share</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Keep downloads, summaries, and status checks accessible when teams need them.
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--history-accent-soft)] text-[var(--history-accent)]">
            <FileDown className="h-6 w-6" />
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          {["Downloadable exports", "Status-aware progress", "Audit-friendly summaries"].map((item) => (
            <div
              key={item}
              className="flex items-center justify-between rounded-2xl border border-[var(--history-border)] bg-[var(--history-surface-contrast)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]"
            >
              <span>{item}</span>
              <ListChecks className="h-4 w-4 text-[var(--history-accent)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HistoryTableSection({
  rows,
  totalRows,
  loading,
  loadingMore,
  refreshing,
  error,
  downloadError,
  activeDownload,
  canLoadMore,
  paginationLabel,
  activeFilter,
  onFilterChange,
  onRefresh,
  onLoadMore,
  onDownload,
  transitionClass,
}: {
  rows: HistoryRow[];
  totalRows: number;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  downloadError: string | null;
  activeDownload: string | null;
  canLoadMore: boolean;
  paginationLabel: string;
  activeFilter: FilterKey;
  onFilterChange: (filter: FilterKey) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onDownload: (row: HistoryRow) => void;
  transitionClass?: string;
}) {
  const showLoading = loading && totalRows === 0;
  const showEmpty = !loading && !error && rows.length === 0;

  return (
    <div
      className={`rounded-[24px] border border-[var(--history-border)] bg-[var(--history-card-muted)] p-6 sm:p-8 ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">History</p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Previous tasks</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Monitor completion status and keep exports ready to download.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || loadingMore || refreshing}
          className="rounded-xl border border-[var(--history-border)] bg-[var(--history-surface-contrast)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-sm transition hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => (
          <FilterChip
            key={filter.key}
            label={filter.label}
            isActive={filter.key === activeFilter}
            onClick={() => onFilterChange(filter.key)}
          />
        ))}
      </div>

      {downloadError ? (
        <div className="mt-4 rounded-xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-xs font-semibold text-rose-700">
          {downloadError}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--history-border)] bg-[var(--history-surface-contrast)]">
        <div className="hidden grid-cols-6 gap-2 border-b border-[var(--history-border)] px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] md:grid">
          <span>Date</span>
          <span>Task</span>
          <span className="text-right">Valid</span>
          <span className="text-right">Invalid</span>
          <span className="text-right">Catch-all</span>
          <span className="text-right">Action</span>
        </div>
        <div className="hidden divide-y divide-[var(--history-border)] md:block">
          {showLoading ? (
            <div className="px-5 py-6 text-sm font-semibold text-[var(--text-muted)]">Loading history...</div>
          ) : error ? (
            <div className="px-5 py-6 text-sm font-semibold text-rose-600">{error}</div>
          ) : showEmpty ? (
            <div className="px-5 py-6 text-sm font-semibold text-[var(--text-muted)]">
              No history yet. Once you verify a list, entries will appear here.
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-6 items-center gap-2 px-5 py-4 text-sm font-semibold text-[var(--text-secondary)]"
              >
                <span className="text-xs text-[var(--text-muted)]">{row.date}</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {row.label === EXTERNAL_DATA_UNAVAILABLE ? (
                    row.label
                  ) : (
                    <>
                      {row.label} /{" "}
                      <span className="font-semibold text-[var(--text-primary)]">{formatNumber(row.total)}</span>
                    </>
                  )}
                </span>
                <span className="text-right text-xs text-[var(--text-secondary)]">{formatNumber(row.valid)}</span>
                <span className="text-right text-xs text-[var(--text-secondary)]">{formatNumber(row.invalid)}</span>
                <span className="text-right text-xs text-[var(--text-secondary)]">{formatNumber(row.catchAll)}</span>
                <span className="flex justify-end">
                  {row.action === "download" ? (
                    <button
                      type="button"
                      onClick={() => onDownload(row)}
                      disabled={activeDownload === row.id}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--history-border)] bg-[var(--history-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--history-accent)] transition hover:bg-[var(--history-accent-soft-strong)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      {activeDownload === row.id ? "Downloading..." : "Download"}
                    </button>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white ${STATUS_TONE_CLASS[row.statusTone]}`}
                    >
                      {row.statusLabel}
                    </span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="space-y-4 px-4 py-5 md:hidden">
          {showLoading ? (
            <div className="rounded-2xl border border-[var(--history-border)] bg-white/80 px-4 py-4 text-sm font-semibold text-[var(--text-muted)]">
              Loading history...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-4 text-sm font-semibold text-rose-600">
              {error}
            </div>
          ) : showEmpty ? (
            <div className="rounded-2xl border border-[var(--history-border)] bg-white/80 px-4 py-4 text-sm font-semibold text-[var(--text-muted)]">
              No history yet. Once you verify a list, entries will appear here.
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-[var(--history-border)] bg-white/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-muted)]">{row.date}</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {row.label === EXTERNAL_DATA_UNAVAILABLE ? row.label : row.label}
                    </p>
                    {row.label === EXTERNAL_DATA_UNAVAILABLE ? null : (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Total: {formatNumber(row.total)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white ${STATUS_TONE_CLASS[row.statusTone]}`}
                  >
                    {row.statusLabel}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-[var(--text-secondary)]">
                  <div>
                    <p className="text-[var(--text-muted)]">Valid</p>
                    <p className="mt-1 font-semibold text-[var(--text-primary)]">{formatNumber(row.valid)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Invalid</p>
                    <p className="mt-1 font-semibold text-[var(--text-primary)]">{formatNumber(row.invalid)}</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Catch-all</p>
                    <p className="mt-1 font-semibold text-[var(--text-primary)]">{formatNumber(row.catchAll)}</p>
                  </div>
                </div>
                {row.action === "download" ? (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onDownload(row)}
                      disabled={activeDownload === row.id}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--history-border)] bg-[var(--history-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--history-accent)] transition hover:bg-[var(--history-accent-soft-strong)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      {activeDownload === row.id ? "Downloading..." : "Download"}
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-[var(--text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_LEGEND.map((status) => (
            <div key={status.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
              <span>{status.label}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span>{paginationLabel}</span>
          <button
            type="button"
            disabled={!canLoadMore}
            onClick={onLoadMore}
            className="rounded-xl border border-[var(--history-border)] bg-[var(--history-surface-contrast)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-sm transition hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMore ? "Loading..." : canLoadMore ? "Load more" : "All loaded"}
          </button>
        </div>
      </div>
    </div>
  );
}
