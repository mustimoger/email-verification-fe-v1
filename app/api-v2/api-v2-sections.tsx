"use client";

import type { ReactNode } from "react";
import { Calendar, Copy, Eye, EyeOff } from "lucide-react";
import {
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  ApiKeySummary,
  IntegrationOption,
  UsageSummaryPoint,
} from "../lib/api-client";
import { EXTERNAL_DATA_UNAVAILABLE } from "../lib/messages";
import { formatPurposeLabel } from "../api/utils";

type UsageView = "per_key" | "per_purpose";

type DateRange = {
  from: string;
  to: string;
};

const HERO_HIGHLIGHTS = [
  "Rotate keys without downtime",
  "Track usage by key or purpose",
  "Audit usage per integration",
  "Revoke instantly when needed",
];

const STATUS_STYLE: Record<"active" | "disabled", string> = {
  active: "bg-[var(--status-success-soft)] text-[var(--status-success)]",
  disabled: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
};

const usageAxisTickStyle = {
  fill: "var(--text-muted)",
  fontSize: 12,
  fontWeight: 600,
};

function maskKeyValue(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 3) return trimmed;
  return `${trimmed.slice(0, 3)}***`;
}

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
      className={`rounded-[24px] border border-[var(--api-border)] bg-[var(--api-card-muted)] p-6 sm:p-8 ${
        transitionClass ?? ""
      }`}
      style={{ transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay ?? "0s"}` }}
    >
      {children}
    </div>
  );
}

export function ApiHero({ transitionClass }: { transitionClass?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-[var(--api-border)] bg-[var(--api-card-strong)] px-6 py-10 shadow-[var(--api-shadow)] sm:px-10 ${
        transitionClass ?? ""
      }`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.25)_0%,_transparent_70%)]" />
        <div className="absolute right-[-120px] top-[120px] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(249,168,37,0.12)_0%,_transparent_70%)]" />
      </div>
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--api-border)] bg-[var(--api-accent-soft)] px-4 py-2 text-xs font-semibold tracking-[0.2em] text-[var(--api-accent)]">
            <span className="h-2 w-2 rounded-full bg-[var(--api-accent)]" />
            API ACCESS
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Launch verification everywhere with
            <span className="bg-[linear-gradient(135deg,var(--api-accent)_0%,var(--api-accent-strong)_100%)] bg-clip-text text-transparent">
              {" "}
              keys you control
            </span>
          </h1>
          <p className="mt-4 text-base text-[var(--text-secondary)] sm:text-lg">
            Create dedicated API keys, tag usage by workflow, and monitor throughput from a single
            dashboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#api-keys"
              className="rounded-xl bg-[linear-gradient(135deg,var(--api-accent)_0%,var(--api-accent-strong)_100%)] px-6 py-3 text-sm font-semibold text-[var(--api-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(249,168,37,0.38)]"
            >
              Generate API key
            </a>
            <a
              href="#api-usage"
              className="rounded-xl border border-[var(--api-border)] bg-[var(--api-surface-contrast)] px-6 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:-translate-y-0.5 hover:border-[var(--api-accent)] hover:bg-[var(--api-accent-soft)] hover:text-[var(--text-primary)]"
            >
              Review usage
            </a>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {HERO_HIGHLIGHTS.map((label) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--api-border)] bg-[var(--api-surface-contrast)] px-4 py-4 text-sm font-semibold text-[var(--text-secondary)]"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ApiKeysSection({
  transitionClass,
  keys,
  loading,
  error,
  lastKey,
  revealedKeys,
  resolveFullKey,
  onGenerate,
  onRevoke,
  onToggleReveal,
  onCopy,
}: {
  transitionClass?: string;
  keys: ApiKeySummary[];
  loading: boolean;
  error: string | null;
  lastKey: string | null;
  revealedKeys: Record<string, boolean>;
  resolveFullKey: (key: ApiKeySummary) => string | null;
  onGenerate: () => void;
  onRevoke: (id: string) => void;
  onToggleReveal: (key: ApiKeySummary) => void;
  onCopy: (key: ApiKeySummary) => void;
}) {
  const isEmpty = !loading && keys.length === 0;

  return (
    <SectionCard transitionClass={transitionClass} delay="0.05s">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            API keys
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            Manage your verification keys
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Create and revoke keys as you move between integrations and custom workflows.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          className="rounded-xl bg-[linear-gradient(135deg,var(--api-accent)_0%,var(--api-accent-strong)_100%)] px-5 py-2.5 text-sm font-semibold text-[var(--api-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(249,168,37,0.38)]"
        >
          Generate API key
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {lastKey ? (
        <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm font-semibold text-amber-700">
          New key (copy now): {lastKey}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--api-border)] bg-[var(--api-surface-contrast)]">
        <div className="grid min-w-[720px] grid-cols-5 gap-4 border-b border-[var(--api-border)] bg-[var(--api-surface-contrast-strong)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          <span>API key name</span>
          <span>API key</span>
          <span>Integration</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>
        <div className="divide-y divide-[var(--api-border)]">
          {loading ? (
            <div className="px-5 py-4 text-sm font-semibold text-[var(--text-muted)]">Loading keys...</div>
          ) : isEmpty ? (
            <div className="px-5 py-6 text-sm font-semibold text-[var(--text-muted)]">No API keys yet.</div>
          ) : (
            keys.map((key) => {
              const fullKey = resolveFullKey(key);
              const revealed = Boolean(key.id && revealedKeys[key.id]);
              const masked = maskKeyValue(key.key_preview ?? fullKey ?? "");
              const displayValue = revealed
                ? fullKey ?? EXTERNAL_DATA_UNAVAILABLE
                : masked ?? EXTERNAL_DATA_UNAVAILABLE;
              const statusTone = key.is_active === false ? "disabled" : "active";
              return (
                <div key={key.id} className="grid min-w-[720px] grid-cols-5 gap-4 px-5 py-4 text-sm font-semibold">
                  <span className="text-[var(--text-secondary)]">{key.name}</span>
                  <span className="flex min-w-0 items-center gap-2 text-[var(--text-secondary)]">
                    <span className="min-w-0 flex-1 break-all">{displayValue}</span>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onToggleReveal(key)}
                        disabled={!key.id}
                        aria-pressed={revealed}
                        aria-label={revealed ? "Hide API key" : "Reveal API key"}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--api-border)] text-[var(--text-muted)] transition hover:border-[var(--api-accent)] hover:text-[var(--api-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onCopy(key)}
                        disabled={!key.id}
                        aria-label="Copy API key"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--api-border)] text-[var(--text-muted)] transition hover:border-[var(--api-accent)] hover:text-[var(--api-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </span>
                  </span>
                  <span className="text-[var(--text-secondary)]">{key.integration ?? key.purpose ?? "—"}</span>
                  <span>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                        STATUS_STYLE[statusTone]
                      }`}
                    >
                      {statusTone === "active" ? "Active" : "Disabled"}
                    </span>
                  </span>
                  <span className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onRevoke(key.id ?? "")}
                      disabled={!key.id}
                      className="rounded-xl border border-[var(--api-border)] bg-[var(--api-surface-contrast-strong)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </SectionCard>
  );
}

export function ApiUsageSection({
  transitionClass,
  usageView,
  selectedKey,
  selectedPurpose,
  keys,
  purposeOptions,
  dateRange,
  totalLabel,
  isLoadingUsage,
  chartData,
  chartUnavailable,
  hasUsageData,
  usageTotal,
  usageLoaded,
  onUsageViewChange,
  onSelectedKeyChange,
  onSelectedPurposeChange,
  onDateRangeChange,
  onLoadUsage,
  onDownload,
}: {
  transitionClass?: string;
  usageView: UsageView;
  selectedKey: string;
  selectedPurpose: string;
  keys: ApiKeySummary[];
  purposeOptions: string[];
  dateRange: DateRange;
  totalLabel: string;
  isLoadingUsage: boolean;
  chartData: UsageSummaryPoint[];
  chartUnavailable: boolean;
  hasUsageData: boolean;
  usageTotal: number | null;
  usageLoaded: boolean;
  onUsageViewChange: (value: UsageView) => void;
  onSelectedKeyChange: (value: string) => void;
  onSelectedPurposeChange: (value: string) => void;
  onDateRangeChange: (range: DateRange) => void;
  onLoadUsage: () => void;
  onDownload: () => void;
}) {
  return (
    <SectionCard transitionClass={transitionClass} delay="0.1s">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Usage</p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">API usage overview</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Compare usage by key or purpose, then export the timeline for reporting.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--api-border)] bg-[var(--api-surface-contrast)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">
          Total: {totalLabel}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Usage view
          </label>
          <select
            value={usageView}
            onChange={(event) => onUsageViewChange(event.target.value as UsageView)}
            className="w-full rounded-xl border border-[var(--api-border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] shadow-sm outline-none focus:border-[var(--api-accent)] focus:ring-1 focus:ring-[var(--ring)]"
          >
            <option value="per_key">Per API key</option>
            <option value="per_purpose">Per purpose</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {usageView === "per_key" ? "Select API key" : "Select purpose"}
          </label>
          {usageView === "per_key" ? (
            <select
              value={selectedKey}
              onChange={(event) => onSelectedKeyChange(event.target.value)}
              className="w-full rounded-xl border border-[var(--api-border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] shadow-sm outline-none focus:border-[var(--api-accent)] focus:ring-1 focus:ring-[var(--ring)]"
            >
              <option value="">All keys</option>
              {keys.map((key) => {
                const preview = maskKeyValue(key.key_preview ?? key.key ?? "");
                const label = preview ? `${key.name ?? ""} (${preview})` : key.name ?? "";
                return (
                  <option key={key.id} value={key.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          ) : (
            <select
              value={selectedPurpose}
              onChange={(event) => onSelectedPurposeChange(event.target.value)}
              className="w-full rounded-xl border border-[var(--api-border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] shadow-sm outline-none focus:border-[var(--api-accent)] focus:ring-1 focus:ring-[var(--ring)]"
            >
              <option value="">All purposes</option>
              {purposeOptions.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {formatPurposeLabel(purpose)}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Date range
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative w-full">
              <input
                type="date"
                value={dateRange.from}
                onChange={(event) => onDateRangeChange({ ...dateRange, from: event.target.value })}
                className="w-full rounded-xl border border-[var(--api-border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] shadow-sm outline-none focus:border-[var(--api-accent)] focus:ring-1 focus:ring-[var(--ring)]"
              />
              <Calendar className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
            </div>
            <div className="relative w-full">
              <input
                type="date"
                value={dateRange.to}
                onChange={(event) => onDateRangeChange({ ...dateRange, to: event.target.value })}
                className="w-full rounded-xl border border-[var(--api-border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] shadow-sm outline-none focus:border-[var(--api-accent)] focus:ring-1 focus:ring-[var(--ring)]"
              />
              <Calendar className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[var(--text-muted)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onLoadUsage}
          disabled={isLoadingUsage}
          className="rounded-xl bg-[linear-gradient(135deg,var(--api-accent)_0%,var(--api-accent-strong)_100%)] px-5 py-2.5 text-sm font-semibold text-[var(--api-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(249,168,37,0.38)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoadingUsage ? "Loading..." : "See usage"}
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="rounded-xl border border-[var(--api-border)] bg-[var(--api-surface-contrast-strong)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:-translate-y-0.5 hover:border-[var(--api-accent)] hover:bg-[var(--api-accent-soft)] hover:text-[var(--text-primary)]"
        >
          Download
        </button>
      </div>

      <div className="mt-6 h-72 w-full rounded-2xl border border-[var(--api-border)] bg-[var(--api-surface-contrast)] p-3">
        {isLoadingUsage ? (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-[var(--text-muted)]">
            Loading usage...
          </div>
        ) : chartUnavailable ? (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-[var(--text-muted)]">
            {EXTERNAL_DATA_UNAVAILABLE}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-[var(--text-muted)]">
            {usageLoaded && hasUsageData && usageTotal !== null
              ? `Total usage: ${usageTotal.toLocaleString()}`
              : "No usage data available for the selected range."}
          </div>
        ) : (
          <ResponsiveContainer>
            <ReLineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={usageAxisTickStyle} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
                width={40}
                tick={usageAxisTickStyle}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--chart-line)"
                strokeWidth={3}
                dot={{
                  r: 5,
                  fill: "var(--chart-line)",
                  strokeWidth: 2,
                  stroke: "var(--surface-elevated)",
                }}
              />
            </ReLineChart>
          </ResponsiveContainer>
        )}
      </div>
    </SectionCard>
  );
}

export function ApiCreateKeyModal({
  open,
  integrationOptions,
  selectedIntegrationId,
  keyName,
  creating,
  loadingIntegrations,
  onClose,
  onIntegrationChange,
  onKeyNameChange,
  onCreate,
}: {
  open: boolean;
  integrationOptions: IntegrationOption[];
  selectedIntegrationId: string;
  keyName: string;
  creating: boolean;
  loadingIntegrations: boolean;
  onClose: () => void;
  onIntegrationChange: (id: string) => void;
  onKeyNameChange: (value: string) => void;
  onCreate: () => void;
}) {
  if (!open) return null;

  const canCreate = Boolean(selectedIntegrationId) && !creating;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--overlay)] px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[24px] border border-[var(--api-border)] bg-[var(--api-card-strong)] p-6 shadow-[var(--api-shadow)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">New key</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Generate API key</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Pick an integration to tag usage, then reuse the key in any workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--api-border)] bg-white/70 px-3 py-1 text-sm font-semibold text-[var(--text-secondary)]"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {loadingIntegrations ? (
            <div className="col-span-2 rounded-2xl border border-[var(--api-border)] bg-white/80 px-4 py-4 text-sm font-semibold text-[var(--text-muted)]">
              Loading integrations...
            </div>
          ) : integrationOptions.length === 0 ? (
            <div className="col-span-2 rounded-2xl border border-[var(--api-border)] bg-white/80 px-4 py-4 text-sm font-semibold text-[var(--text-muted)]">
              No integrations available. Please refresh later.
            </div>
          ) : (
            integrationOptions.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer flex-col gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  selectedIntegrationId === option.id
                    ? "border-[var(--api-accent)] bg-[var(--api-accent-soft)] text-[var(--text-primary)]"
                    : "border-[var(--api-border)] bg-white/80 text-[var(--text-secondary)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="integration"
                      checked={selectedIntegrationId === option.id}
                      onChange={() => onIntegrationChange(option.id)}
                      className="h-4 w-4 accent-[var(--api-accent)]"
                    />
                    <span>{option.label}</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{option.description}</p>
              </label>
            ))
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Key name</label>
          <input
            value={keyName}
            onChange={(event) => onKeyNameChange(event.target.value)}
            className="w-full rounded-xl border border-[var(--api-border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] shadow-sm outline-none focus:border-[var(--api-accent)] focus:ring-1 focus:ring-[var(--ring)]"
            placeholder="Enter a name for this key"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--api-border)] bg-white/80 px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={!canCreate}
            className="rounded-xl bg-[linear-gradient(135deg,var(--api-accent)_0%,var(--api-accent-strong)_100%)] px-5 py-2.5 text-sm font-semibold text-[var(--api-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create key"}
          </button>
        </div>
      </div>
    </div>
  );
}
