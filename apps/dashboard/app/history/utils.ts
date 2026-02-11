"use client";

import { Task, TaskDetailResponse, TaskEmailJob, TaskMetrics } from "../lib/api-client";
import { EXTERNAL_DATA_UNAVAILABLE } from "../lib/messages";
import {
  deriveVerificationMetricCounts,
  resolveVerificationStatusBucket,
  sumVerificationStatusCounts,
} from "../lib/verification-status";

export { EXTERNAL_DATA_UNAVAILABLE };

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
  disposable: number;
  roleBased: number;
  unknown: number;
};

type LabelSource = "task" | "detail";

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

function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function normalizeText(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatRedactedApiKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 6) return trimmed;
  return `${trimmed.slice(0, 3)}...${trimmed.slice(-3)}`;
}

function resolveApiKeyLabel(apiKeyPreview?: string | null, apiKey?: string | null): string | null {
  const preview = normalizeText(apiKeyPreview);
  if (preview) return preview;
  const keyValue = normalizeText(apiKey);
  if (!keyValue) return null;
  return formatRedactedApiKey(keyValue);
}

function resolveTaskLabel({
  taskId,
  fileName,
  apiKeyPreview,
  apiKey,
  source,
}: {
  taskId: string;
  fileName?: string | null;
  apiKeyPreview?: string | null;
  apiKey?: string | null;
  source: LabelSource;
}): { label: string; fileName?: string } {
  const resolvedFileName = normalizeText(fileName);
  if (resolvedFileName) {
    return { label: resolvedFileName, fileName: resolvedFileName };
  }
  const apiKeyLabel = resolveApiKeyLabel(apiKeyPreview, apiKey);
  if (apiKeyLabel) {
    return { label: apiKeyLabel };
  }
  console.info("history.task_label.unavailable", { task_id: taskId, source });
  return { label: EXTERNAL_DATA_UNAVAILABLE };
}

export function deriveCountsFromMetrics(metrics?: TaskMetrics | null): DerivedCounts | null {
  const derived = deriveVerificationMetricCounts(metrics?.verification_status ?? null);
  if (!derived) return null;
  const { counts, unknownKeys } = derived;
  if (unknownKeys.length > 0) {
    console.warn("history.metrics.unknown_statuses", { statuses: unknownKeys });
  }
  const totalFromMetrics = metrics ? coerceCount(metrics.total_email_addresses) : null;
  const total = totalFromMetrics ?? sumVerificationStatusCounts(counts);
  return {
    total,
    valid: counts.valid,
    invalid: counts.invalid,
    catchAll: counts.catchall,
    disposable: counts.disposable_domain,
    roleBased: counts.role_based,
    unknown: counts.unknown,
  };
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

export function deriveCounts(detail: TaskDetailResponse): {
  total: number;
  valid: number;
  invalid: number;
  catchAll: number;
  disposable: number;
  roleBased: number;
  unknown: number;
} {
  const jobs = detail.jobs ?? [];
  let valid = 0;
  let invalid = 0;
  let catchAll = 0;
  let disposable = 0;
  let roleBased = 0;
  let unknown = 0;
  jobs.forEach((job: TaskEmailJob) => {
    const bucket = resolveVerificationStatusBucket({
      status: job.email?.status ?? job.status,
      isRoleBased: coerceBoolean(job.email?.is_role_based),
      isDisposable: coerceBoolean(job.email?.is_disposable),
    });
    switch (bucket) {
      case "valid":
        valid += 1;
        break;
      case "catchall":
        catchAll += 1;
        break;
      case "invalid":
        invalid += 1;
        break;
      case "disposable_domain":
        disposable += 1;
        break;
      case "role_based":
        roleBased += 1;
        break;
      case "pending":
      case "unknown":
      default:
        unknown += 1;
        break;
    }
  });
  if (disposable > 0 || roleBased > 0 || unknown > 0) {
    console.info("history.jobs.secondary_statuses", {
      disposable,
      role_based: roleBased,
      unknown,
      total_jobs: jobs.length,
    });
  }
  return { total: jobs.length, valid, invalid, catchAll, disposable, roleBased, unknown };
}

export function mapDetailToHistoryRow(detail: TaskDetailResponse): HistoryRow | null {
  if (!detail.id && !detail.jobs?.length) return null;
  const resolvedId = detail.id ?? fallbackId();
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
  const { label, fileName } = resolveTaskLabel({
    taskId: resolvedId,
    fileName: detail.file?.filename ?? detail.file_name,
    apiKeyPreview: detail.api_key_preview,
    apiKey: detail.api_key,
    source: "detail",
  });
  return {
    id: resolvedId,
    date: formatHistoryDate(detail.created_at),
    label,
    fileName,
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
  const { label, fileName } = resolveTaskLabel({
    taskId: task.id,
    fileName: task.file?.filename ?? task.file_name,
    apiKeyPreview: task.api_key_preview,
    apiKey: task.api_key,
    source: "task",
  });
  const action: HistoryAction = fileName && statusInfo.tone === "completed" ? "download" : "status";
  return {
    id: task.id,
    date: formatHistoryDate(task.created_at),
    label,
    fileName,
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
