"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardShell } from "../components/dashboard-shell";
import { apiClient, ApiError, ApiKeySummary, TaskDetailResponse, TaskListResponse, Task } from "../lib/api-client";
import { RequireAuth } from "../components/protected";
import { useAuth } from "../components/auth-provider";
import { HistoryRow, mapDetailToHistoryRow, mapTaskToHistoryRow } from "./utils";

const statusColor: Record<HistoryRow["statusTone"], string> = {
  completed: "bg-emerald-500",
  processing: "bg-amber-400",
  failed: "bg-rose-500",
  unknown: "bg-slate-400",
};

const PAGE_SIZE = 10;

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
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
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [activeDownload, setActiveDownload] = useState<string | null>(null);
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
        const nextSelectedKey = selectedKey && list.some((key) => key.id === selectedKey) ? selectedKey : "";
        setSelectedKey(nextSelectedKey);
        console.info("history.keys.loaded", { count: list.length, selected_key: nextSelectedKey || "all" });
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
        const rowsByIndex: Array<HistoryRow | null> = new Array(items.length).fill(null);
        const detailRequests: Array<Promise<{ index: number; detail: TaskDetailResponse | null }>> = [];

        items.forEach((task, index) => {
          const mapped = mapTaskToHistoryRow(task as Task);
          if (mapped) {
            rowsByIndex[index] = mapped;
          } else if (task.id) {
            detailRequests.push(
              apiClient
                .getTask(task.id, selectedKey || undefined)
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
          <div className="flex flex-col">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-700">API key</label>
            <select
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
              disabled={keysLoading}
            >
              <option value="">All keys</option>
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
        {downloadError ? (
          <div className="mb-3 text-sm font-semibold text-rose-600">{downloadError}</div>
        ) : null}
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
