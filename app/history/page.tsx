"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardShell } from "../components/dashboard-shell";
import { apiClient, ApiError, TaskDetailResponse, TaskListResponse, Task } from "../lib/api-client";
import { RequireAuth } from "../components/protected";
import { useAuth } from "../components/auth-provider";
import {
  HistoryRow,
  mapDetailToHistoryRow,
  mapTaskToHistoryRow,
  shouldRefreshHistory,
  shouldUseHistoryCache,
  type HistoryCacheEntry,
} from "./utils";

const historyCache = new Map<string, HistoryCacheEntry>();

const statusColor: Record<HistoryRow["statusTone"], string> = {
  completed: "bg-[var(--status-success)]",
  processing: "bg-[var(--status-warning)]",
  failed: "bg-[var(--status-danger)]",
  unknown: "bg-[var(--status-unknown)]",
};

const PAGE_SIZE = 10;

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export default function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [activeDownload, setActiveDownload] = useState<string | null>(null);
  const { session } = useAuth();
  const cacheKey = session?.user?.id ?? "";

  useEffect(() => {
    if (!session) {
      historyCache.clear();
      setRows([]);
      setTotal(null);
      setError(null);
      setDownloadError(null);
      return;
    }
  }, [session]);

  const fetchPage = useCallback(
    async (offset: number, append: boolean, refresh = false) => {
      if (!session) return;
      if (append) {
        setLoadingMore(true);
      } else if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const tasks: TaskListResponse = await apiClient.listTasks(PAGE_SIZE, offset, undefined, refresh);
        const items = tasks.tasks ?? [];
        const rowsByIndex: Array<HistoryRow | null> = new Array(items.length).fill(null);
        const detailRequests: Array<Promise<{ index: number; detail: TaskDetailResponse | null }>> = [];

        items.forEach((task, index) => {
          const mapped = mapTaskToHistoryRow(task as Task);
          if (mapped) {
            rowsByIndex[index] = mapped;
          } else if (task.id) {
            detailRequests.push(
              apiClient
                .getTask(task.id)
                .then((detail) => ({ index, detail }))
                .catch(() => ({ index, detail: null })),
            );
          }
        });

        if (detailRequests.length > 0) {
          const details = await Promise.all(detailRequests);
          details.forEach(({ index, detail }) => {
            if (!detail) return;
            const row = mapDetailToHistoryRow(detail);
            if (row) {
              rowsByIndex[index] = row;
            }
          });
        }

        const nextRows: HistoryRow[] = rowsByIndex.filter((row): row is HistoryRow => Boolean(row));
        const nextTotal = tasks.count ?? null;
        setTotal(nextTotal);
        setRows((prev) => {
          const updated = append ? [...prev, ...nextRows] : nextRows;
          if (cacheKey) {
            historyCache.set(cacheKey, { rows: updated, total: nextTotal });
          }
          return updated;
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load history from the verification service. Please try again.";
        setError(message);
      } finally {
        if (append) {
          setLoadingMore(false);
        } else if (refresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [session, cacheKey],
  );

  useEffect(() => {
    if (!session) return;
    const cached = cacheKey ? historyCache.get(cacheKey) : undefined;
    if (shouldUseHistoryCache(cached, Boolean(session))) {
      setRows(cached.rows);
      setTotal(cached.total);
      setError(null);
      return;
    }
    setRows([]);
    setTotal(null);
    setError(null);
    void fetchPage(0, false);
  }, [session, cacheKey, fetchPage]);

  const canLoadMore = useMemo(() => {
    if (loading || loadingMore || refreshing) return false;
    if (total === null) return rows.length >= PAGE_SIZE;
    return rows.length < total;
  }, [loading, loadingMore, refreshing, rows.length, total]);

  const handleRefresh = () => {
    if (!shouldRefreshHistory(loading, loadingMore, refreshing)) return;
    void fetchPage(0, false, true);
  };

  const handleDownload = async (row: HistoryRow) => {
    if (!row.fileName) {
      setDownloadError("Download unavailable for this record.");
      return;
    }
    setDownloadError(null);
    setActiveDownload(row.id);
    try {
      const { blob, fileName } = await apiClient.downloadTaskResults(row.id, row.fileName);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      console.info("history.download.success", { task_id: row.id, file_name: fileName });
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.details || err.message : "Download failed";
      console.error("history.download.failed", { task_id: row.id, error: message });
      setDownloadError(typeof message === "string" ? message : "Download failed");
    } finally {
      setActiveDownload(null);
    }
  };

  return (
    <DashboardShell>
      <RequireAuth>
        <section className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200 lg:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-extrabold text-slate-800">PREVIOUS TASKS</h3>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || loadingMore || refreshing}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          {downloadError ? (
            <div className="mb-3 text-sm font-semibold text-rose-600">{downloadError}</div>
          ) : null}
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-6 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-700 md:text-sm">
              <span className="text-xs">Date</span>
              <span className="text-xs">Task/Total</span>
              <span className="text-right text-xs">Valid</span>
              <span className="text-right text-xs">Invalid</span>
              <span className="text-right text-xs">Catch-all</span>
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
                    <span className="text-xs text-slate-700 md:text-sm">{row.date}</span>
                    <span className="text-xs text-slate-700 md:text-sm">
                      {row.label} / <span className="font-extrabold text-slate-800">{formatNumber(row.total)}</span>
                    </span>
                    <span className="text-right text-xs text-slate-700 md:text-sm">{formatNumber(row.valid)}</span>
                    <span className="text-right text-xs text-slate-700 md:text-sm">{formatNumber(row.invalid)}</span>
                    <span className="text-right text-xs text-slate-700 md:text-sm">{formatNumber(row.catchAll)}</span>
                    <span className="flex justify-end">
                      {row.action === "download" ? (
                        <button
                          type="button"
                          onClick={() => void handleDownload(row)}
                          disabled={activeDownload === row.id}
                          className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {activeDownload === row.id ? "Downloading..." : "Download"}
                        </button>
                      ) : (
                        <span
                          className={[
                            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm",
                            statusColor[row.statusTone],
                          ].join(" ")}
                        >
                          {row.statusLabel}
                        </span>
                      )}
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
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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
