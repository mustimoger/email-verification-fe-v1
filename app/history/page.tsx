"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardShell } from "../components/dashboard-shell";
import { apiClient, ApiKeySummary, TaskDetailResponse, TaskListResponse } from "../lib/api-client";
import { RequireAuth } from "../components/protected";
import { useAuth } from "../components/auth-provider";

type HistoryRow = {
  id: string;
  date: string;
  label: string;
  total: number;
  valid: number;
  invalid: number;
  catchAll: number;
  status: "download" | "pending";
};

const statusColor: Record<HistoryRow["status"], string> = {
  download: "bg-emerald-500",
  pending: "bg-amber-400",
};

const PENDING_STATES = new Set(["pending", "processing", "started", "queued"]);
const PAGE_SIZE = 10;

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function deriveCounts(detail: TaskDetailResponse): { total: number; valid: number; invalid: number; catchAll: number } {
  const jobs = detail.jobs ?? [];
  let valid = 0;
  let invalid = 0;
  let catchAll = 0;
  jobs.forEach((job) => {
    const status = job.email?.status || job.status;
    switch (status) {
      case "exists":
        valid += 1;
        break;
      case "catchall":
        catchAll += 1;
        break;
      case "not_exists":
      case "invalid_syntax":
      case "unknown":
      default:
        invalid += 1;
        break;
    }
  });
  return { total: jobs.length, valid, invalid, catchAll };
}

export default function HistoryPage() {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [keysLoading, setKeysLoading] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const dashboardKeyId = useMemo(
    () => keys.find((k) => (k.name ?? "").toLowerCase() === "dashboard_api")?.id ?? "",
    [keys],
  );

  useEffect(() => {
    if (!session) {
      setKeys([]);
      setSelectedKey("");
      setRows([]);
      setTotal(null);
      setError(null);
      return;
    }
    const loadKeys = async () => {
      setKeysLoading(true);
      try {
        const response = await apiClient.listApiKeys(true);
        const list = response.keys ?? [];
        setKeys(list);
        const defaultKey = list.find((k) => (k.name ?? "").toLowerCase() === "dashboard_api")?.id ?? list[0]?.id ?? "";
        setSelectedKey(defaultKey);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load API keys";
        setError(message);
      } finally {
        setKeysLoading(false);
      }
    };
    void loadKeys();
  }, [session]);

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      if (!session) return;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const tasks: TaskListResponse = await apiClient.listTasks(PAGE_SIZE, offset, selectedKey || undefined);
        const items = tasks.tasks ?? [];
        const details = await Promise.all(
          items.map((task) => (task.id ? apiClient.getTask(task.id, selectedKey || undefined) : null)),
        );
        const nextRows: HistoryRow[] = details
          .filter((d): d is TaskDetailResponse => Boolean(d && d.id))
          .map((detail) => {
            const counts = deriveCounts(detail);
            const hasPending = detail.jobs?.some((j) => PENDING_STATES.has((j.status || "").toLowerCase())) ?? false;
            const date = detail.created_at
              ? new Date(detail.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
              : "—";
            return {
              id: detail.id || crypto.randomUUID(),
              date,
              label: detail.id || "Task",
              total: counts.total,
              valid: counts.valid,
              invalid: counts.invalid,
              catchAll: counts.catchAll,
              status: hasPending ? "pending" : "download",
            };
          });
        setRows((prev) => (append ? [...prev, ...nextRows] : nextRows));
        setTotal(tasks.count ?? null);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load history from the verification service. Please try again.";
        setError(message);
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [session, selectedKey],
  );

  useEffect(() => {
    if (!session) return;
    setRows([]);
    setTotal(null);
    void fetchPage(0, false);
  }, [session, selectedKey, fetchPage]);

  const canLoadMore = useMemo(() => {
    if (loading || loadingMore) return false;
    if (total === null) return rows.length >= PAGE_SIZE;
    return rows.length < total;
  }, [loading, loadingMore, rows.length, total]);

  return (
    <DashboardShell>
      <RequireAuth>
        <section className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200 lg:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-700">API key</label>
            <select
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
              disabled={keysLoading}
            >
              {keysLoading ? <option>Loading...</option> : null}
              {keys.map((key) => {
                const label = key.integration || key.name || "API key";
                return (
                  <option key={key.id} value={key.id}>
                    {label}
                    {dashboardKeyId === key.id ? " (Dashboard)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-6 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-700 md:text-sm">
            <span>Date</span>
            <span>Task/Total</span>
            <span className="text-right">Valid</span>
            <span className="text-right">Invalid</span>
            <span className="text-right">Catch-all</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="px-4 py-4 text-sm font-semibold text-slate-600">Loading history...</div>
            ) : error ? (
              <div className="px-4 py-4 text-sm font-semibold text-rose-600">{error}</div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-4 text-sm font-semibold text-slate-600">No history yet.</div>
            ) : (
              rows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-6 items-center px-4 py-4 text-sm font-semibold text-slate-800 md:text-base"
                >
                  <span className="text-slate-700">{row.date}</span>
                  <span className="text-slate-700">
                    {row.label} / {formatNumber(row.total)}
                  </span>
                  <span className="text-right text-slate-700">{formatNumber(row.valid)}</span>
                  <span className="text-right text-slate-700">{formatNumber(row.invalid)}</span>
                  <span className="text-right text-slate-700">{formatNumber(row.catchAll)}</span>
                  <span className="flex justify-end">
                    <span
                      className={[
                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm",
                        statusColor[row.status],
                      ].join(" ")}
                    >
                      {row.status === "download" ? "Download" : "Pending"}
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-600">
          <span>
            {rows.length > 0
              ? `Showing ${rows.length}${total ? ` of ${total}` : ""} record${rows.length === 1 ? "" : "s"}`
              : "No records yet"}
          </span>
          {rows.length > 0 ? (
            <button
              type="button"
              disabled={!canLoadMore}
              onClick={() => fetchPage(rows.length, true)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#4c61cc] hover:text-[#4c61cc] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
            >
              {loadingMore ? "Loading..." : canLoadMore ? "Load more" : "All loaded"}
            </button>
          ) : null}
        </div>
      </section>
      </RequireAuth>
    </DashboardShell>
  );
}
