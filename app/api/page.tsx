"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Copy, Eye, EyeOff } from "lucide-react";
import { Line, LineChart as ReLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DashboardShell } from "../components/dashboard-shell";
import { RequireAuth } from "../components/protected";
import { useAuth } from "../components/auth-provider";
import {
  apiClient,
  ApiError,
  ApiKeySummary,
  IntegrationOption,
  ListApiKeysResponse,
  UsageSummaryResponse,
  UsagePurposeResponse,
} from "../lib/api-client";
import { EXTERNAL_DATA_UNAVAILABLE } from "../lib/messages";
import {
  formatPurposeLabel,
  listPurposeOptions,
  mapPurposeSeries,
  resolveDateRange,
  summarizeKeyUsage,
  summarizePurposeUsage,
} from "./utils";

type KeyStatus = "active" | "disabled";
type UsageView = "per_key" | "per_purpose";

const statusStyle: Record<KeyStatus, string> = {
  active: "bg-[var(--status-success-soft)] text-[var(--status-success)]",
  disabled: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
};

const usageAxisTickStyle = {
  fill: "var(--text-muted)",
  fontSize: 12,
  fontWeight: 600,
};

function maskKeyValue(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 3) return trimmed;
  return `${trimmed.slice(0, 3)}***`;
}

function getDefaultName(option?: IntegrationOption) {
  if (!option) return "";
  if (option.default_name && option.default_name.trim().length > 0) return option.default_name;
  return option.label;
}

export default function ApiPage() {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [usageView, setUsageView] = useState<UsageView>("per_key");
  const [selectedPurpose, setSelectedPurpose] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    from: "",
    to: "",
  });
  const [keyUsageKeys, setKeyUsageKeys] = useState<ApiKeySummary[] | null>(null);
  const [purposeUsage, setPurposeUsage] = useState<UsagePurposeResponse | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [usageLoaded, setUsageLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [integrationOptions, setIntegrationOptions] = useState<IntegrationOption[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>("");
  const [keyName, setKeyName] = useState<string>("");
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [lastPlainKey, setLastPlainKey] = useState<string | null>(null);
  const [fullKeysById, setFullKeysById] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const { session, loading: authLoading } = useAuth();

  const keyUsage = useMemo(
    () => summarizeKeyUsage(keyUsageKeys ?? [], selectedKey || undefined),
    [keyUsageKeys, selectedKey],
  );
  const purposeUsageSummary = useMemo(
    () => summarizePurposeUsage(purposeUsage, selectedPurpose || undefined),
    [purposeUsage, selectedPurpose],
  );
  const usageTotal = usageView === "per_key" ? keyUsage.total : purposeUsageSummary.total;
  const hasUsageData = usageView === "per_key" ? keyUsage.hasData : purposeUsageSummary.hasData;
  const chartData = useMemo(() => {
    if (usageView === "per_purpose") {
      return mapPurposeSeries(purposeUsage?.series, selectedPurpose || undefined);
    }
    return usageSummary?.series ?? [];
  }, [usageView, usageSummary, purposeUsage, selectedPurpose]);
  const totalUsageLabel = useMemo(() => {
    if (!usageLoaded) return "—";
    if (hasUsageData && usageTotal !== null) return usageTotal.toLocaleString();
    return "—";
  }, [hasUsageData, usageLoaded, usageTotal]);
  const purposeOptions = useMemo(() => listPurposeOptions(purposeUsage), [purposeUsage]);
  const usageSummaryUnavailable =
    usageView === "per_key" && usageLoaded && (!usageSummary || usageSummary.source === "unavailable");
  const purposeUsageUnavailable = usageView === "per_purpose" && usageLoaded && !purposeUsage;
  const totalUnavailable =
    usageLoaded && !hasUsageData && (usageView === "per_key" ? usageSummaryUnavailable : purposeUsageUnavailable);
  const chartUnavailable =
    usageLoaded &&
    !isLoadingUsage &&
    (usageView === "per_key"
      ? selectedKey !== "" || usageSummaryUnavailable
      : purposeUsageUnavailable);
  const totalDisplay = totalUnavailable ? EXTERNAL_DATA_UNAVAILABLE : totalUsageLabel;

  const isDashboardKey = (key: ApiKeySummary) => (key.name ?? "").toLowerCase() === "dashboard_api";

  const resolveFullKey = (key: ApiKeySummary) => {
    if (key.key && key.key.trim()) return key.key;
    if (key.id && fullKeysById[key.id]) return fullKeysById[key.id];
    return null;
  };

  const syncKeyState = (list: ApiKeySummary[]) => {
    const ids = new Set(list.map((key) => key.id).filter(Boolean) as string[]);
    setRevealedKeys((prev) => {
      const next: Record<string, boolean> = {};
      ids.forEach((id) => {
        if (prev[id]) next[id] = prev[id];
      });
      return next;
    });
    setFullKeysById((prev) => {
      const next: Record<string, string> = {};
      list.forEach((key) => {
        if (!key.id) return;
        if (key.key && key.key.trim()) {
          next[key.id] = key.key;
          return;
        }
        if (prev[key.id]) {
          next[key.id] = prev[key.id];
        }
      });
      return next;
    });
  };

  const toggleReveal = (key: ApiKeySummary) => {
    if (!key.id) {
      console.warn("api.keys.reveal_missing_id");
      return;
    }
    const hasFullKey = Boolean(resolveFullKey(key));
    if (!hasFullKey) {
      console.warn("api.keys.full_key.unavailable", { key_id: key.id });
    }
    setRevealedKeys((prev) => ({ ...prev, [key.id as string]: !prev[key.id as string] }));
  };

  const copyKey = async (key: ApiKeySummary) => {
    if (!key.id) {
      console.warn("api.keys.copy_missing_id");
      return;
    }
    const fullKey = resolveFullKey(key);
    if (!fullKey) {
      console.warn("api.keys.copy_unavailable", { key_id: key.id });
      setRevealedKeys((prev) => ({ ...prev, [key.id as string]: true }));
      return;
    }
    if (!navigator?.clipboard?.writeText) {
      console.warn("api.keys.copy_unsupported", { key_id: key.id });
      return;
    }
    try {
      await navigator.clipboard.writeText(fullKey);
    } catch (error) {
      console.warn("api.keys.copy_failed", { key_id: key.id, error });
    }
  };

  useEffect(() => {
    if (!session) {
      setKeys([]);
      setSelectedKey("");
      setSelectedPurpose("");
      setKeyUsageKeys(null);
      setPurposeUsage(null);
      setUsageSummary(null);
      setUsageLoaded(false);
      setIntegrationOptions([]);
      setSelectedIntegrationId("");
      setKeyName("");
      setError(null);
      return;
    }
    const load = async () => {
      setIsLoadingKeys(true);
      setError(null);
      try {
        const response: ListApiKeysResponse = await apiClient.listApiKeys();
        const list = (response.keys ?? []).filter((key) => !isDashboardKey(key));
        setKeys(list);
        syncKeyState(list);
        setSelectedKey("");
        setSelectedPurpose("");
        setKeyUsageKeys(null);
        setPurposeUsage(null);
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : "Failed to load API keys";
        setError(message);
      } finally {
        setIsLoadingKeys(false);
      }
    };
    void load();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const loadIntegrations = async () => {
      setLoadingIntegrations(true);
      setError(null);
      try {
        const options = await apiClient.listIntegrations();
        setIntegrationOptions(options);
        if (options.length > 0) {
          setSelectedIntegrationId(options[0].id);
          setKeyName(options[0].default_name || options[0].label);
        }
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : "Failed to load integrations";
        setError(message);
      } finally {
        setLoadingIntegrations(false);
      }
    };
    void loadIntegrations();
  }, [session]);

  useEffect(() => {
    setKeyUsageKeys(null);
    setPurposeUsage(null);
    setUsageSummary(null);
    setUsageLoaded(false);
    if (usageView === "per_purpose") {
      setSelectedPurpose("");
    }
  }, [usageView]);

  const loadUsage = async () => {
    if (!session) return;
    setIsLoadingUsage(true);
    setError(null);
    const resolvedRange = resolveDateRange(dateRange);
    if (resolvedRange.error) {
      setError(resolvedRange.error);
      console.warn("api.usage.range.invalid", { error: resolvedRange.error, from: dateRange.from, to: dateRange.to });
      setIsLoadingUsage(false);
      return;
    }
    const rangeStart = resolvedRange.start;
    const rangeEnd = resolvedRange.end;
    console.info("api.usage.load", {
      view: usageView,
      api_key_id: selectedKey || "all",
      purpose: selectedPurpose || "all",
      from: rangeStart,
      to: rangeEnd,
    });
    try {
      if (usageView === "per_key") {
        const response: ListApiKeysResponse = await apiClient.listApiKeys(false, rangeStart, rangeEnd);
        const list = (response.keys ?? []).filter((key) => !isDashboardKey(key));
        setKeyUsageKeys(list);
        setPurposeUsage(null);
        console.debug("api.usage.per_key.loaded", { count: list.length });
      } else {
        const response = await apiClient.getUsagePurpose(rangeStart, rangeEnd);
        setPurposeUsage(response);
        setKeyUsageKeys(null);
        console.debug("api.usage.per_purpose.loaded", {
          total_requests: response.total_requests,
          purposes: Object.keys(response.requests_by_purpose ?? {}).length,
        });
      }
      if (usageView === "per_key") {
        try {
          const summary = await apiClient.getUsageSummary(rangeStart, rangeEnd, selectedKey || undefined);
          setUsageSummary(summary);
          console.debug("api.usage.summary.loaded", {
            source: summary.source,
            points: summary.series.length,
            api_key_id: summary.api_key_id ?? null,
          });
        } catch (err: unknown) {
          const message = err instanceof ApiError ? err.message : "Failed to load usage chart";
          console.error("api.usage.summary.failed", { error: message });
          setUsageSummary({
            source: "unavailable",
            total: null,
            series: [],
            api_key_id: selectedKey || null,
          });
          setError(message);
        }
      } else {
        setUsageSummary(null);
      }
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to load usage";
      setError(message);
    } finally {
      setIsLoadingUsage(false);
      setUsageLoaded(true);
    }
  };

  const handleCreateKey = async () => {
    if (!selectedIntegrationId) {
      setError("Please choose an integration.");
      return;
    }
    const resolvedName = keyName.trim() || selectedIntegrationId;
    setCreating(true);
    setError(null);
    try {
      const created = await apiClient.createApiKey(resolvedName, selectedIntegrationId);
      setLastPlainKey(created.key || null);
      if (created.id && created.key) {
        setFullKeysById((prev) => ({ ...prev, [created.id as string]: created.key as string }));
      }
      const refreshed = await apiClient.listApiKeys();
      const list = (refreshed.keys ?? []).filter((key) => !isDashboardKey(key));
      setKeys(list);
      syncKeyState(list);
      setSelectedKey(created.id ?? "");
      setKeyName(resolvedName);
      setShowModal(false);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to create API key";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleIntegrationChange = (id: string) => {
    setSelectedIntegrationId(id);
    const next = integrationOptions.find((opt) => opt.id === id);
    setKeyName(getDefaultName(next));
  };

  const handleRevoke = async (id: string) => {
    setError(null);
    try {
      await apiClient.revokeApiKey(id);
      const refreshed = await apiClient.listApiKeys();
      const list = (refreshed.keys ?? []).filter((key) => !isDashboardKey(key));
      setKeys(list);
      syncKeyState(list);
      setSelectedKey(list[0]?.id ?? "");
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to revoke API key";
      setError(message);
    }
  };

  if (authLoading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[240px] items-center justify-center text-sm font-semibold text-slate-700">
          Checking session...
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <RequireAuth>
        <section className="space-y-6">
        <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-slate-900">API Keys</h2>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm transition hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Generate API Key
            </button>
          </div>
          {error ? (
            <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>
          ) : null}
          {lastPlainKey ? (
            <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
              New key (copy now): {lastPlainKey}
            </div>
          ) : null}
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-5 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-700 md:text-sm gap-x-4">
              <span>API key name</span>
              <span>API key</span>
              <span>Integration</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-slate-100">
              {isLoadingKeys ? (
                <div className="px-4 py-3 text-sm font-semibold text-slate-600">Loading keys...</div>
              ) : keys.length === 0 ? (
                <div className="px-4 py-3 text-sm font-semibold text-slate-600">No API keys yet.</div>
              ) : (
                keys.map((key) => (
                  <div
                    key={key.id}
                    className="grid grid-cols-5 items-center px-4 py-3 text-sm font-semibold text-slate-800 md:text-base gap-x-4"
                  >
                    <span className="text-slate-700">{key.name}</span>
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="min-w-0 flex-1 break-all">
                        {(() => {
                          const fullKey = resolveFullKey(key);
                          const revealed = Boolean(key.id && revealedKeys[key.id]);
                          if (revealed) return fullKey ?? EXTERNAL_DATA_UNAVAILABLE;
                          const masked = maskKeyValue(key.key_preview ?? fullKey ?? "");
                          return masked ?? EXTERNAL_DATA_UNAVAILABLE;
                        })()}
                      </span>
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleReveal(key)}
                          disabled={!key.id}
                          aria-pressed={Boolean(key.id && revealedKeys[key.id])}
                          aria-label={
                            Boolean(key.id && revealedKeys[key.id])
                              ? "Hide API key"
                              : "Reveal API key"
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {Boolean(key.id && revealedKeys[key.id]) ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyKey(key)}
                          disabled={!key.id}
                          aria-label="Copy API key"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </span>
                    <span className="text-slate-700">{key.integration ?? key.purpose ?? "—"}</span>
                    <span>
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
                          statusStyle[key.is_active ? "active" : "disabled"],
                        ].join(" ")}
                      >
                        {key.is_active ? "Active" : "Disabled"}
                      </span>
                    </span>
                    <span className="flex justify-end">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        onClick={() => handleRevoke(key.id || "")}
                        disabled={creating}
                      >
                        Revoke
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-extrabold text-slate-900">API Usage</h2>
            <span className="text-sm font-semibold text-slate-600">Total: {totalDisplay}</span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Usage view
              </label>
              <select
                value={usageView}
                onChange={(event) => setUsageView(event.target.value as UsageView)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--ring)]"
              >
                <option value="per_key">Per API key</option>
                <option value="per_purpose">Per purpose</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                {usageView === "per_key" ? "Select API key" : "Select purpose"}
              </label>
              {usageView === "per_key" ? (
                <select
                  value={selectedKey}
                  onChange={(event) => setSelectedKey(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--ring)]"
                >
                  <option value="">All keys</option>
                  {keys.map((key) => {
                    const preview = maskKeyValue(key.key_preview ?? resolveFullKey(key) ?? "");
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
                  onChange={(event) => setSelectedPurpose(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--ring)]"
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
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Date range
              </label>
              <div className="flex items-center gap-2">
                <div className="relative w-full">
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(event) => setDateRange((prev) => ({ ...prev, from: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--ring)]"
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
                <div className="relative w-full">
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(event) => setDateRange((prev) => ({ ...prev, to: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--ring)]"
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadUsage}
              disabled={isLoadingUsage}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {isLoadingUsage ? "Loading..." : "See Usage"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Download
            </button>
          </div>

          <div className="mt-6 h-72 w-full rounded-xl border border-slate-200 bg-slate-50 p-3">
            {isLoadingUsage ? (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-600">
                Loading usage...
              </div>
            ) : chartUnavailable ? (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-600">
                {EXTERNAL_DATA_UNAVAILABLE}
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-600">
                {hasUsageData && usageTotal !== null
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
                    tickFormatter={(v) => `${v}`}
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
        </div>

        {showModal ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">Generate API Key</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    Keys are universal; picking an integration only tags usage for reporting.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {loadingIntegrations ? (
                  <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
                    Loading integrations...
                  </div>
                ) : integrationOptions.length === 0 ? (
                  <div className="col-span-2 rounded-lg border border-slate-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700">
                    No integrations available. Please refresh later.
                  </div>
                ) : (
                  integrationOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer flex-col gap-2 rounded-xl border px-4 py-3 shadow-sm transition hover:border-[var(--accent)] ${
                        selectedIntegrationId === option.id ? "border-[var(--accent)] bg-slate-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="integration"
                            checked={selectedIntegrationId === option.id}
                            onChange={() => handleIntegrationChange(option.id)}
                            className="h-4 w-4 accent-[var(--accent)]"
                          />
                          <span className="text-sm font-extrabold text-slate-900">{option.label}</span>
                        </div>
                        {option.icon ? (
                          <span className="text-xs font-semibold text-slate-500">{option.icon}</span>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold text-slate-600">{option.description}</p>
                    </label>
                  ))
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-700">Key name</label>
                <input
                  value={keyName}
                  onChange={(event) => setKeyName(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--ring)]"
                  placeholder="Enter a name for this key"
                />
                <p className="text-xs font-semibold text-slate-500">
                  Name helps you recognize keys; you can reuse them across any platform.
                </p>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateKey}
                  disabled={creating || !selectedIntegrationId || (keyName.trim() === "" && !selectedIntegrationId)}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  {creating ? "Creating..." : "Create Key"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      </RequireAuth>
    </DashboardShell>
  );
}
