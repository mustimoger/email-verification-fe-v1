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
  ListApiKeysResponse,
  UsageEntry,
  UsageResponse,
} from "../lib/api-client";

type KeyStatus = "active" | "disabled";

const statusStyle: Record<KeyStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  disabled: "bg-slate-200 text-slate-600",
};

function maskKey(id?: string) {
  if (!id) return "";
  if (id.length <= 4) return id;
  return `${id.slice(0, 4)}****`;
}

function groupUsage(items: UsageEntry[]) {
  return items.map((item) => ({
    date: item.period_start ? new Date(item.period_start).toLocaleDateString() : "",
    processed: item.count,
    valid: item.count, // backend does not split valid/invalid yet; treat as total for now
    invalid: 0,
  }));
}

export default function ApiPage() {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    from: "",
    to: "",
  });
  const [usage, setUsage] = useState<UsageEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [creating, setCreating] = useState(false);
  const integrationOptions = ["Zapier", "n8n", "Google Sheets", "Custom"] as const;
  const [integrationChoice, setIntegrationChoice] = useState<(typeof integrationOptions)[number]>(
    integrationOptions[0],
  );
  const [customKeyName, setCustomKeyName] = useState("");
  const [lastPlainKey, setLastPlainKey] = useState<string | null>(null);
  const { session, loading: authLoading } = useAuth();

  const chartData = useMemo(() => groupUsage(usage), [usage]);

  const isDashboardKey = (key: ApiKeySummary) => (key.name ?? "").toLowerCase() === "dashboard_api";

  useEffect(() => {
    if (!session) {
      setKeys([]);
      setUsage([]);
      setSelectedKey("");
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
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : "Failed to load API keys";
        setError(message);
      } finally {
        setIsLoadingKeys(false);
      }
    };
    void load();
  }, [session]);

  const loadUsage = async () => {
    if (!session) return;
    setIsLoadingUsage(true);
    setError(null);
    try {
      const response: UsageResponse = await apiClient.getUsage(
        dateRange.from || undefined,
        dateRange.to || undefined,
        selectedKey || undefined,
      );
      setUsage(response.items ?? []);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to load usage";
      setError(message);
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const handleCreateKey = async () => {
    const resolvedName = integrationChoice === "Custom" ? customKeyName.trim() : integrationChoice;
    if (!resolvedName) {
      setError("Please enter a key name.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await apiClient.createApiKey(resolvedName);
      setLastPlainKey(created.key || null);
      const refreshed = await apiClient.listApiKeys();
      const list = (refreshed.keys ?? []).filter((key) => !isDashboardKey(key));
      setKeys(list);
      setSelectedKey(created.id ?? "");
      setCustomKeyName("");
      setIntegrationChoice(integrationOptions[0]);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to create API key";
      setError(message);
    } finally {
      setCreating(false);
    }
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900">API Keys</h2>
            <div className="flex items-center gap-2">
              <select
                value={integrationChoice}
                onChange={(event) =>
                  setIntegrationChoice(event.target.value as (typeof integrationOptions)[number])
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
              >
                {integrationOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {integrationChoice === "Custom" ? (
                <input
                  value={customKeyName}
                  onChange={(event) => setCustomKeyName(event.target.value)}
                  aria-label="Custom key name"
                  className="w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
                />
              ) : null}
              <button
                type="button"
                disabled={creating || (integrationChoice === "Custom" && customKeyName.trim() === "")}
                onClick={handleCreateKey}
                className="rounded-lg bg-[#4c61cc] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f52ad] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
              >
                {creating ? "Creating..." : "Create Key"}
              </button>
            </div>
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
            <div className="grid grid-cols-4 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-700 md:text-sm">
              <span>API key name</span>
              <span>API key</span>
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
                    className="grid grid-cols-4 items-center px-4 py-3 text-sm font-semibold text-slate-800 md:text-base"
                  >
                    <span className="text-slate-700">{key.name}</span>
                    <span className="text-slate-700">{maskKey(key.id)}</span>
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
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Select API key
              </label>
              <select
                value={selectedKey}
                onChange={(event) => setSelectedKey(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
              >
                <option value="">All keys</option>
                {keys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.name} ({maskKey(key.id)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Date range
              </label>
              <div className="flex items-center gap-2">
                <div className="relative w-full">
                  <input
                    value={dateRange.from}
                    onChange={(event) => setDateRange((prev) => ({ ...prev, from: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
                <div className="relative w-full">
                  <input
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
                No usage data available for the selected range.
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
                    dataKey="valid"
                    stroke="#00b69b"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#00b69b", strokeWidth: 2, stroke: "white" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="invalid"
                    stroke="#ff6b6b"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#ff6b6b", strokeWidth: 2, stroke: "white" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="processed"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "white" }}
                  />
                </ReLineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        </section>
      </RequireAuth>
    </DashboardShell>
  );
}
