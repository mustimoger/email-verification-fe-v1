"use client";

import { TaskDetailResponse, TaskEmailJob } from "../lib/api-client";
import { Task } from "../lib/api-client";

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
  const counts = deriveCounts(detail);
  const jobs = detail.jobs ?? [];
  const hasPending =
    jobs.some((job) => {
      const status = (job.status || "").toLowerCase();
      return PENDING_STATES.has(status);
    }) ?? false;
  const statusInfo = deriveStatusInfo(undefined, hasPending, counts.total > 0);
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
  const valid = task.valid_count ?? 0;
  const invalid = task.invalid_count ?? 0;
  const catchAll = task.catchall_count ?? 0;
  const total = task.email_count ?? valid + invalid + catchAll;
  const statusRaw = (task.status || "").toLowerCase();
  const jobStatus = task.job_status ?? {};
  const hasPending =
    (statusRaw ? PENDING_STATES.has(statusRaw) : false) ||
    Object.entries(jobStatus).some(([key, value]) => {
      if (!value) return false;
      return PENDING_STATES.has(key.toLowerCase());
    });
  const statusInfo = deriveStatusInfo(statusRaw, hasPending, total > 0);
  const hasFile = Boolean(task.file_name);
  const isManual = !hasFile && task.id;
  const action: HistoryAction =
    hasFile && statusInfo.tone === "completed" ? "download" : "status";
  return {
    id: task.id,
    date: formatHistoryDate(task.created_at),
    label: hasFile ? task.file_name ?? task.id : isManual ? "Manual verification" : task.id,
    fileName: task.file_name ?? undefined,
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
