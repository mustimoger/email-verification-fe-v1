"use client";

import { TaskDetailResponse, TaskEmailJob } from "../lib/api-client";
import { Task } from "../lib/api-client";

export type HistoryStatus = "download" | "pending";

export type HistoryRow = {
  id: string;
  date: string;
  label: string;
  fileName?: string;
  total: number;
  valid: number;
  invalid: number;
  catchAll: number;
  status: HistoryStatus;
};

export const PENDING_STATES = new Set(["pending", "processing", "started", "queued"]);
type DerivedCounts = { total: number; valid: number; invalid: number; catchAll: number };

function fallbackId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `task-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatHistoryDate(input?: string): string {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

function coerceMetricCount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function deriveCountsFromMetrics(metrics?: TaskDetailResponse["metrics"]): DerivedCounts | null {
  if (!metrics) return null;
  const statusCounts = metrics.verification_status;
  const totalFromMetrics = coerceMetricCount(metrics.total_email_addresses);
  if (!statusCounts || typeof statusCounts !== "object") {
    if (totalFromMetrics === null) return null;
    return { total: totalFromMetrics, valid: 0, invalid: 0, catchAll: 0 };
  }
  let valid = 0;
  let invalid = 0;
  let catchAll = 0;
  Object.entries(statusCounts).forEach(([key, raw]) => {
    const count = coerceMetricCount(raw);
    if (count === null) return;
    if (key === "exists") {
      valid += count;
      return;
    }
    if (key === "catchall") {
      catchAll += count;
      return;
    }
    invalid += count;
  });
  const total = totalFromMetrics ?? valid + invalid + catchAll;
  return { total, valid, invalid, catchAll };
}

function hasPendingFromMetrics(metrics?: TaskDetailResponse["metrics"]): boolean {
  const statusCounts = metrics?.job_status;
  if (!statusCounts || typeof statusCounts !== "object") return false;
  const pending = coerceMetricCount(statusCounts.pending) ?? 0;
  const processing = coerceMetricCount(statusCounts.processing) ?? 0;
  return pending + processing > 0;
}

export function deriveCounts(detail: TaskDetailResponse): DerivedCounts {
  const jobs = detail.jobs ?? [];
  let valid = 0;
  let invalid = 0;
  let catchAll = 0;
  jobs.forEach((job: TaskEmailJob) => {
    const status = job.email?.status ?? job.status;
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

export function mapDetailToHistoryRow(detail: TaskDetailResponse): HistoryRow | null {
  const jobCounts = detail.jobs?.length ? deriveCounts(detail) : null;
  const metricCounts = jobCounts ? null : deriveCountsFromMetrics(detail.metrics);
  const counts = jobCounts ?? metricCounts;
  if (!detail.id && !counts) return null;
  const hasPendingFromJobs =
    detail.jobs?.some((job) => {
      const status = (job.status || "").toLowerCase();
      return PENDING_STATES.has(status);
    }) ?? false;
  const hasPending = hasPendingFromJobs || hasPendingFromMetrics(detail.metrics);
  const resolvedCounts = counts ?? { total: 0, valid: 0, invalid: 0, catchAll: 0 };
  return {
    id: detail.id ?? fallbackId(),
    date: formatHistoryDate(detail.created_at),
    label: detail.id ?? "Task",
    fileName: undefined,
    total: resolvedCounts.total,
    valid: resolvedCounts.valid,
    invalid: resolvedCounts.invalid,
    catchAll: resolvedCounts.catchAll,
    status: hasPending ? "pending" : "download",
  };
}

export function mapTaskToHistoryRow(task: Task): HistoryRow | null {
  if (!task.id) return null;
  const hasAnyCounts = [task.email_count, task.valid_count, task.invalid_count, task.catchall_count].some(
    (value) => value !== null && value !== undefined,
  );
  if (!hasAnyCounts) return null;
  const valid = task.valid_count ?? 0;
  const invalid = task.invalid_count ?? 0;
  const catchAll = task.catchall_count ?? 0;
  const total = task.email_count ?? valid + invalid + catchAll;
  const status = (task.status || "").toLowerCase();
  const isPending = status ? PENDING_STATES.has(status) : false;
  return {
    id: task.id,
    date: formatHistoryDate(task.created_at),
    label: task.file_name ?? task.id,
    fileName: task.file_name ?? undefined,
    total,
    valid,
    invalid,
    catchAll,
    status: isPending ? "pending" : "download",
  };
}
