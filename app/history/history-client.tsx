"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardShell } from "../components/dashboard-shell";
import { RequireAuth } from "../components/protected";
import { useAuth } from "../components/auth-provider";
import { apiClient, ApiError, TaskDetailResponse, TaskListResponse, Task } from "../lib/api-client";
import {
  HistoryRow,
  mapDetailToHistoryRow,
  mapTaskToHistoryRow,
  shouldRefreshHistory,
  shouldUseHistoryCache,
  type HistoryCacheEntry,
} from "../history/utils";
import styles from "./history.module.css";
import { HistoryHero, HistoryHighlights, HistoryTableSection, type HistorySummary } from "./history-sections";

const PAGE_SIZE = 10;
const historyCache = new Map<string, HistoryCacheEntry>();

type FilterKey = "all" | "completed" | "processing" | "failed";

export default function HistoryV2Client() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [activeDownload, setActiveDownload] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const { session } = useAuth();
  const cacheKey = session?.user?.id ?? "";

  useEffect(() => {
    setIsLoaded(true);
  }, []);

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

  const filteredRows = useMemo(() => {
    if (activeFilter === "all") return rows;
    return rows.filter((row) => row.statusTone === activeFilter);
  }, [rows, activeFilter]);

  const summary: HistorySummary = useMemo(() => {
    const completed = rows.filter((row) => row.statusTone === "completed").length;
    const processing = rows.filter((row) => row.statusTone === "processing").length;
    const failed = rows.filter((row) => row.statusTone === "failed").length;
    const downloadable = rows.filter((row) => row.action === "download").length;
    return {
      total: total ?? rows.length,
      completed,
      processing,
      failed,
      downloadable,
    };
  }, [rows, total]);

  const paginationLabel = useMemo(() => {
    if (rows.length === 0) return "No records yet";
    const recordLabel = filteredRows.length === 1 ? "record" : "records";
    if (activeFilter !== "all") {
      return `Showing ${filteredRows.length} ${recordLabel} (${rows.length} loaded)`;
    }
    return `Showing ${rows.length}${total ? ` of ${total}` : ""} ${recordLabel}`;
  }, [rows.length, filteredRows.length, activeFilter, total]);

  const transitionClass = isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6";

  return (
    <DashboardShell>
      <RequireAuth>
        <section className={`${styles.root} relative flex flex-col gap-8 pb-8 lg:px-8`}>
          <HistoryHero transitionClass={transitionClass} />
          <HistoryHighlights transitionClass={transitionClass} summary={summary} loading={loading} />
          <HistoryTableSection
            transitionClass={transitionClass}
            rows={filteredRows}
            totalRows={rows.length}
            loading={loading}
            loadingMore={loadingMore}
            refreshing={refreshing}
            error={error}
            downloadError={downloadError}
            activeDownload={activeDownload}
            canLoadMore={canLoadMore}
            paginationLabel={paginationLabel}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onRefresh={handleRefresh}
            onLoadMore={() => fetchPage(rows.length, true)}
            onDownload={handleDownload}
          />
        </section>
      </RequireAuth>
    </DashboardShell>
  );
}
