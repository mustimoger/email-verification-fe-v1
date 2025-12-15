"use client";

import { useEffect, useState } from "react";

import { DashboardShell } from "../components/dashboard-shell";
import { apiClient, TaskDetailResponse, TaskListResponse } from "../lib/api-client";

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
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const tasks: TaskListResponse = await apiClient.listTasks(10, 0);
        const items = tasks.tasks ?? [];
        const details = await Promise.all(items.map((task) => (task.id ? apiClient.getTask(task.id) : null)));
        const nextRows: HistoryRow[] = details
          .filter((d): d is TaskDetailResponse => Boolean(d && d.id))
          .map((detail) => {
            const counts = deriveCounts(detail);
            const status =
              detail.jobs?.some((j) => j.status === "pending" || j.status === "processing") ?? false
                ? "pending"
                : "download";
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
              status,
            };
          });
        setRows(nextRows);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load history";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <DashboardShell>
      <section className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200 lg:p-6">
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
        <div className="mt-4 text-sm font-semibold text-slate-600">
          {rows.length > 0 ? `Showing ${rows.length} record${rows.length === 1 ? "" : "s"}` : "No records yet"}
        </div>
      </section>
    </DashboardShell>
  );
}
