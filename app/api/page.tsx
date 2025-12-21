"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
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
  active: "bg-emerald-100 text-emerald-700",
  disabled: "bg-slate-200 text-slate-600",
};

function maskKeyPreview(preview?: string) {
  if (!preview) return "";
  if (preview.length <= 3) return preview;
  return `${preview.slice(0, 3)}***`;
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
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [integrationOptions, setIntegrationOptions] = useState<IntegrationOption[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>("");
  const [keyName, setKeyName] = useState<string>("");
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [lastPlainKey, setLastPlainKey] = useState<string | null>(null);
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
    if (!hasUsageData || usageTotal === null) return "—";
    return usageTotal.toLocaleString();
  }, [hasUsageData, usageTotal]);
  const purposeOptions = useMemo(() => listPurposeOptions(purposeUsage), [purposeUsage]);

  const isDashboardKey = (key: ApiKeySummary) => (key.name ?? "").toLowerCase() === "dashboard_api";

  useEffect(() => {
    if (!session) {
      setKeys([]);
      setSelectedKey("");
      setSelectedPurpose("");
      setKeyUsageKeys(null);
      setPurposeUsage(null);
      setUsageSummary(null);
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
          setUsageSummary(null);
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
      const refreshed = await apiClient.listApiKeys();
      const list = (refreshed.keys ?? []).filter((key) => !isDashboardKey(key));
      setKeys(list);
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
              className="rounded-lg bg-[#4c61cc] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f52ad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
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
            <div className="grid grid-cols-5 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-700 md:text-sm">
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
                    className="grid grid-cols-5 items-center px-4 py-3 text-sm font-semibold text-slate-800 md:text-base"
                  >
                    <span className="text-slate-700">{key.name}</span>
                    <span className="text-slate-700">{maskKeyPreview(key.key_preview)}</span>
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
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#4c61cc] hover:text-[#4c61cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
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
            <span className="text-sm font-semibold text-slate-600">Total: {totalUsageLabel}</span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Usage view
              </label>
              <select
                value={usageView}
                onChange={(event) => setUsageView(event.target.value as UsageView)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
                >
                  <option value="">All keys</option>
                  {keys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name} ({maskKeyPreview(key.key_preview)})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedPurpose}
                  onChange={(event) => setSelectedPurpose(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
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
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
                <div className="relative w-full">
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(event) => setDateRange((prev) => ({ ...prev, to: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
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
              className="rounded-lg bg-[#4c61cc] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f52ad] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
            >
              {isLoadingUsage ? "Loading..." : "See Usage"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#4c61cc] hover:text-[#4c61cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
            >
              Download
            </button>
          </div>

          <div className="mt-6 h-72 w-full rounded-xl border border-slate-200 bg-slate-50 p-3">
            {isLoadingUsage ? (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-600">
                Loading usage...
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
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} width={40} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "white" }}
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
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
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
                      className={`flex cursor-pointer flex-col gap-2 rounded-xl border px-4 py-3 shadow-sm transition hover:border-[#4c61cc] ${
                        selectedIntegrationId === option.id ? "border-[#4c61cc] bg-slate-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="integration"
                            checked={selectedIntegrationId === option.id}
                            onChange={() => handleIntegrationChange(option.id)}
                            className="h-4 w-4 accent-[#4c61cc]"
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
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
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#4c61cc] hover:text-[#4c61cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateKey}
                  disabled={creating || !selectedIntegrationId || (keyName.trim() === "" && !selectedIntegrationId)}
                  className="rounded-lg bg-[#4c61cc] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f52ad] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
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
