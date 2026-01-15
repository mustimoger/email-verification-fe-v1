"use client";

import { Task, TaskDetailResponse, TaskEmailJob, TaskMetrics } from "../lib/api-client";
import { EXTERNAL_DATA_UNAVAILABLE } from "../lib/messages";

export type HistoryAction = "download" | "status";
export type HistoryStatusTone = "completed" | "processing" | "failed" | "unknown";

export type HistoryRow = {
  id: string;
  date: string;
  label: string;
  fileName?: string;
  total: number;
  valid: number;
  invalid: number;
  catchAll: number;
  action: HistoryAction;
  statusTone: HistoryStatusTone;
  statusLabel: string;
};

export const PENDING_STATES = new Set(["pending", "processing", "started", "queued"]);
const COMPLETED_STATES = new Set(["completed", "complete", "success", "succeeded", "done"]);
const FAILED_STATES = new Set(["failed", "error", "errored", "cancelled", "canceled"]);

type DerivedCounts = {
  total: number;
  valid: number;
  invalid: number;
  catchAll: number;
};

function coerceCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

export function deriveCountsFromMetrics(metrics?: TaskMetrics | null): DerivedCounts | null {
  if (!metrics?.verification_status) return null;
  const statusCounts = metrics.verification_status;
  if (typeof statusCounts !== "object" || !statusCounts) return null;
  const valid = coerceCount(statusCounts.exists) ?? 0;
  const catchAll = coerceCount(statusCounts.catchall) ?? 0;
  let invalid = 0;
  const unknownStatuses: string[] = [];
  Object.entries(statusCounts).forEach(([key, raw]) => {
    if (key === "exists" || key === "catchall") return;
    const count = coerceCount(raw);
    if (count === null) return;
    invalid += count;
    if (key !== "not_exists" && key !== "invalid_syntax" && key !== "unknown") {
      unknownStatuses.push(key);
    }
  });
  if (unknownStatuses.length > 0) {
    console.warn("history.metrics.unknown_statuses", { statuses: unknownStatuses });
  }
  const totalFromMetrics = coerceCount(metrics.total_email_addresses);
  const total = totalFromMetrics ?? valid + invalid + catchAll;
  return { total, valid, invalid, catchAll };
}

function normalizeJobStatus(jobStatus?: Record<string, number> | null): Record<string, number> | null {
  if (!jobStatus || typeof jobStatus !== "object") return null;
  const normalized: Record<string, number> = {};
  Object.entries(jobStatus).forEach(([key, raw]) => {
    const count = coerceCount(raw);
    if (count === null) return;
    normalized[key.toLowerCase()] = count;
  });
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function deriveStatusFromJobStatus(
  status: string | undefined,
  jobStatus: Record<string, number> | null,
): string | undefined {
  const normalized = normalizeJobStatus(jobStatus);
  if (!normalized) return status;
  const pending = normalized.pending ?? 0;
  const processing = normalized.processing ?? 0;
  const completed = normalized.completed ?? 0;
  const failed = normalized.failed ?? 0;
  let derived: string | undefined;
  if (pending + processing > 0) {
    derived = "processing";
  } else if (completed > 0) {
    derived = "completed";
  } else if (failed > 0) {
    derived = "failed";
  }
  if (!derived) return status;
  const current = (status ?? "").trim().toLowerCase();
  if (!current || PENDING_STATES.has(current)) {
    return derived;
  }
  return status;
}

function hasPendingFromJobStatus(jobStatus?: Record<string, number> | null): boolean {
  const normalized = normalizeJobStatus(jobStatus);
  if (!normalized) return false;
  return Object.entries(normalized).some(([key, value]) => value > 0 && PENDING_STATES.has(key));
}

function capitalizeStatus(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function deriveStatusInfo(status: string | undefined, hasPending: boolean, hasResults: boolean) {
  const normalized = (status ?? "").toLowerCase();
  if (hasPending) {
    return { tone: "processing" as const, label: "Processing" };
  }
  if (FAILED_STATES.has(normalized)) {
    return {
      tone: "failed" as const,
      label: normalized === "cancelled" || normalized === "canceled" ? "Cancelled" : "Failed",
    };
  }
  if (COMPLETED_STATES.has(normalized) || (!normalized && hasResults)) {
    return { tone: "completed" as const, label: "Completed" };
  }
  if (normalized) {
    return { tone: "unknown" as const, label: capitalizeStatus(normalized) };
  }
  return { tone: "unknown" as const, label: "Unknown" };
}

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

export function deriveCounts(detail: TaskDetailResponse): { total: number; valid: number; invalid: number; catchAll: number } {
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
  if (!detail.id && !detail.jobs?.length) return null;
  const counts = deriveCountsFromMetrics(detail.metrics) ?? deriveCounts(detail);
  const jobs = detail.jobs ?? [];
  const hasPending =
    jobs.some((job) => {
      const status = (job.status || "").toLowerCase();
      return PENDING_STATES.has(status);
    }) ?? false;
  const jobStatus = detail.metrics?.job_status ?? null;
  const normalizedStatus = deriveStatusFromJobStatus(undefined, jobStatus);
  const statusRaw = (normalizedStatus ?? "").toLowerCase();
  const pendingFromJobStatus = hasPendingFromJobStatus(jobStatus);
  const statusInfo = deriveStatusInfo(statusRaw, hasPending || pendingFromJobStatus, counts.total > 0);
  return {
    id: detail.id ?? fallbackId(),
    date: formatHistoryDate(detail.created_at),
    label: "Manual verification",
    fileName: undefined,
    total: counts.total,
    valid: counts.valid,
    invalid: counts.invalid,
    catchAll: counts.catchAll,
    action: "status",
    statusTone: statusInfo.tone,
    statusLabel: statusInfo.label,
  };
}

export function mapTaskToHistoryRow(task: Task): HistoryRow | null {
  if (!task.id) return null;
  const countsFromMetrics = deriveCountsFromMetrics(task.metrics);
  const valid = countsFromMetrics?.valid ?? coerceCount(task.valid_count) ?? 0;
  const invalid = countsFromMetrics?.invalid ?? coerceCount(task.invalid_count) ?? 0;
  const catchAll = countsFromMetrics?.catchAll ?? coerceCount(task.catchall_count) ?? 0;
  const total =
    countsFromMetrics?.total ??
    coerceCount(task.email_count) ??
    coerceCount(task.metrics?.total_email_addresses) ??
    valid + invalid + catchAll;
  const jobStatus = task.job_status ?? task.metrics?.job_status ?? null;
  const normalizedStatus = deriveStatusFromJobStatus(task.status, jobStatus);
  const statusRaw = (normalizedStatus ?? "").toLowerCase();
  const hasPending = (statusRaw ? PENDING_STATES.has(statusRaw) : false) || hasPendingFromJobStatus(jobStatus);
  const statusInfo = deriveStatusInfo(statusRaw, hasPending, total > 0);
  const fileName = typeof task.file_name === "string" && task.file_name.trim().length > 0 ? task.file_name : null;
  if (!fileName) {
    console.info("history.file_name.unavailable", { task_id: task.id });
  }
  const action: HistoryAction = fileName && statusInfo.tone === "completed" ? "download" : "status";
  return {
    id: task.id,
    date: formatHistoryDate(task.created_at),
    label: fileName ?? EXTERNAL_DATA_UNAVAILABLE,
    fileName: fileName ?? undefined,
    total,
    valid,
    invalid,
    catchAll,
    action,
    statusTone: statusInfo.tone,
    statusLabel: statusInfo.label,
  };
}

export type HistoryCacheEntry = {
  rows: HistoryRow[];
  total: number | null;
};

export function shouldUseHistoryCache(entry: HistoryCacheEntry | undefined, hasSession: boolean): boolean {
  return Boolean(hasSession && entry && entry.rows.length > 0);
}

export function shouldRefreshHistory(loading: boolean, loadingMore: boolean, refreshing: boolean): boolean {
  return !loading && !loadingMore && !refreshing;
}
