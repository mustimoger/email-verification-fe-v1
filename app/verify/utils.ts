"use client";

import Papa from "papaparse";
import {
  ApiError,
  BatchFileUploadResponse,
  LatestUploadResponse,
  Task,
  TaskDetailResponse,
  TaskEmailJob,
} from "../lib/api-client";
import {
  EXTERNAL_DATA_UNAVAILABLE,
  PENDING_STATES,
  deriveCounts,
  deriveCountsFromMetrics,
  formatHistoryDate,
} from "../history/utils";

export type VerificationResult = {
  email: string;
  status: string;
  message: string;
  validatedAt?: string;
  isRoleBased?: boolean;
  catchallDomain?: boolean;
  emailServer?: string;
  disposableDomain?: boolean;
  registeredDomain?: boolean;
  mxRecord?: string;
};

export type FileVerificationStatus = "download" | "pending";

export type FileVerification = {
  fileName: string;
  downloadName?: string | null;
  totalEmails: number | null;
  valid: number | null;
  catchAll: number | null;
  invalid: number | null;
  status: FileVerificationStatus;
  taskId: string | null;
};

export type UploadSummary = {
  totalEmails: number | null;
  uploadDate: string;
  files: FileVerification[];
  aggregates: {
    valid: number | null;
    catchAll: number | null;
    invalid: number | null;
  };
};

export type UploadTaskLink = {
  fileName: string;
  taskId: string | null;
  uploadId: string | null;
};

type ApiErrorDetails = { detail?: unknown };

const extractDetailMessage = (details: unknown): string | null => {
  if (typeof details === "string") {
    const trimmed = details.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!details || typeof details !== "object") return null;
  const detail = (details as ApiErrorDetails).detail;
  if (typeof detail !== "string") return null;
  const trimmed = detail.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const serializeUnknownError = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized.length > 0) return serialized;
  } catch {
    // fall through to string conversion
  }
  return String(error);
};

export const resolveApiErrorMessage = (error: unknown, context?: string): string => {
  if (error instanceof ApiError) {
    const detail = extractDetailMessage(error.details);
    if (detail) return detail;
    if (context) {
      console.warn("verify.api_error_detail_missing", {
        context,
        status: error.status,
        message: error.message,
        details: error.details,
      });
    }
    return error.message || serializeUnknownError(error.details);
  }
  return serializeUnknownError(error);
};

export function normalizeEmails(raw: string): string[] {
  const tokens: string[] = [];
  raw
    .split("\n")
    .map((line) => line.split(","))
    .flat()
    .forEach((piece) => {
      const value = piece.trim();
      if (value) tokens.push(value);
    });
  return Array.from(new Set(tokens));
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat().format(value);
}

export type ManualHydrationGuardState = {
  authLoading: boolean;
  hasSession: boolean;
  manualTaskId: string | null;
  resultsCount: number;
  manualEmailsCount: number;
  inputValue: string;
  alreadyHydrated: boolean;
};

export function shouldHydrateManualState(state: ManualHydrationGuardState): boolean {
  if (state.alreadyHydrated) return false;
  if (state.authLoading || !state.hasSession) return false;
  if (state.manualTaskId) return false;
  if (state.resultsCount > 0) return false;
  if (state.manualEmailsCount > 0) return false;
  if (state.inputValue.trim().length > 0) return false;
  return true;
}

const coerceString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const coerceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  return undefined;
};

const resolveJobEmailAddress = (job: TaskEmailJob): string | null => {
  const emailData = job.email ?? {};
  const address =
    coerceString(job.email_address) ??
    coerceString(emailData.email_address) ??
    coerceString(emailData.email);
  if (!address) {
    console.warn("verify.manual.job_missing_email", { job_id: job.id, email_id: job.email_id });
    return null;
  }
  return address;
};

const resolveJobStatus = (job: TaskEmailJob): string => {
  const emailData = job.email ?? {};
  return coerceString(emailData.status) ?? coerceString(job.status) ?? "pending";
};

const mapJobToVerificationResult = (job: TaskEmailJob): VerificationResult | null => {
  const address = resolveJobEmailAddress(job);
  if (!address) return null;
  const status = resolveJobStatus(job);
  const message = status === "pending" ? "Awaiting verification" : `Status: ${status}`;
  const emailData = job.email ?? {};
  const isRoleBased = coerceBoolean(emailData.is_role_based);
  const disposableDomain = coerceBoolean(emailData.is_disposable);
  const catchallDomain = coerceBoolean(emailData.is_catchall);
  const emailServer = coerceString(emailData.server_type);
  const mxRecord = coerceString(emailData.host_name);
  const validatedAt = coerceString(emailData.validated_at);
  return {
    email: address,
    status,
    message,
    validatedAt,
    isRoleBased,
    catchallDomain,
    emailServer,
    disposableDomain,
    mxRecord,
  };
};

export function mapTaskDetailToResults(emails: string[], detail: TaskDetailResponse): VerificationResult[] {
  const jobs = detail.jobs ?? [];
  const jobMap = new Map<string, TaskEmailJob>();
  jobs.forEach((job) => {
    const address = resolveJobEmailAddress(job);
    if (!address) return;
    jobMap.set(address.toLowerCase(), job);
  });

  return emails.map((email) => {
    const job = jobMap.get(email.toLowerCase());
    if (!job) {
      return { email, status: "pending", message: "Awaiting verification" };
    }
    return mapJobToVerificationResult(job) ?? { email, status: "pending", message: "Awaiting verification" };
  });
}

export function buildManualResultsFromJobs(
  emails: string[] | null | undefined,
  jobs: TaskEmailJob[] | null | undefined,
): VerificationResult[] {
  const resolvedJobs = Array.isArray(jobs) ? jobs : [];
  if (!emails || emails.length === 0) {
    return resolvedJobs
      .map((job) => mapJobToVerificationResult(job))
      .filter((entry): entry is VerificationResult => Boolean(entry));
  }
  const jobMap = new Map<string, TaskEmailJob>();
  resolvedJobs.forEach((job) => {
    const address = resolveJobEmailAddress(job);
    if (!address) return;
    jobMap.set(address.toLowerCase(), job);
  });
  return emails.map((email) => {
    const address = email.trim();
    const job = jobMap.get(address.toLowerCase());
    if (!job) {
      return { email: address, status: "pending", message: "Awaiting verification" };
    }
    return mapJobToVerificationResult(job) ?? { email: address, status: "pending", message: "Awaiting verification" };
  });
}

export function buildManualResultsFromDetail(
  emails: string[] | null | undefined,
  detail: TaskDetailResponse,
): VerificationResult[] {
  if (emails && emails.length > 0) {
    return mapTaskDetailToResults(emails, detail);
  }
  return buildLatestManualResults(detail);
}

export function mapVerifyFallbackResults(emails: string[], taskId?: string | null): VerificationResult[] {
  return emails.map((email) => ({
    email,
    status: "pending",
    message: taskId ? `Task ${taskId}` : "Task queued",
  }));
}

export type ManualExportRow = {
  Email: string;
  Status: string;
  "Role-based": string;
  "Catchall Domain": string;
  "Email Server": string;
  "Disposable Domain": string;
  "Registered Domain": string;
  "MX Record": string;
};

export const MANUAL_EXPORT_COLUMNS: (keyof ManualExportRow)[] = [
  "Email",
  "Status",
  "Role-based",
  "Catchall Domain",
  "Email Server",
  "Disposable Domain",
  "Registered Domain",
  "MX Record",
];

const formatBoolean = (value: boolean | undefined, fallback?: string): string => {
  if (value === true) return "true";
  if (value === false) return "false";
  return fallback ?? "";
};

const formatString = (value: string | undefined | null, fallback?: string): string => {
  if (!value) return fallback ?? "";
  return value.trim();
};

export function buildManualExportRows(results: VerificationResult[]): ManualExportRow[] {
  return results
    .filter((item) => Boolean(item.email && item.email.trim()))
    .map((item) => ({
      Email: item.email.trim(),
      Status: formatString(item.status),
      "Role-based": formatBoolean(item.isRoleBased, EXTERNAL_DATA_UNAVAILABLE),
      "Catchall Domain": formatBoolean(item.catchallDomain, EXTERNAL_DATA_UNAVAILABLE),
      "Email Server": formatString(item.emailServer, EXTERNAL_DATA_UNAVAILABLE),
      "Disposable Domain": formatBoolean(item.disposableDomain, EXTERNAL_DATA_UNAVAILABLE),
      "Registered Domain": formatBoolean(item.registeredDomain, EXTERNAL_DATA_UNAVAILABLE),
      "MX Record": formatString(item.mxRecord, EXTERNAL_DATA_UNAVAILABLE),
    }));
}

export function buildManualExportCsv(results: VerificationResult[]): string {
  const rows = buildManualExportRows(results);
  return Papa.unparse(rows, { columns: MANUAL_EXPORT_COLUMNS });
}

export function createUploadLinks(files: File[]): UploadTaskLink[] {
  return files.map((file) => ({
    fileName: file.name,
    taskId: null,
    uploadId: null,
  }));
}

export function mapUploadResultsToLinks(
  files: File[],
  uploadResults: BatchFileUploadResponse[],
): { links: UploadTaskLink[]; unmatched: number; orphaned: BatchFileUploadResponse[] } {
  const buckets = new Map<string, BatchFileUploadResponse[]>();
  const orphaned: BatchFileUploadResponse[] = [];
  uploadResults.forEach((result) => {
    const name = result.filename;
    if (!name) {
      orphaned.push(result);
      return;
    }
    const list = buckets.get(name) ?? [];
    list.push(result);
    buckets.set(name, list);
  });

  let unmatched = 0;
  const links = files.map((file) => {
    const list = buckets.get(file.name);
    const matched = list?.shift();
    if (!matched) {
      unmatched += 1;
      return { fileName: file.name, taskId: null, uploadId: null };
    }
    const taskId = matched.task_id ?? null;
    if (!taskId) {
      unmatched += 1;
    }
    return {
      fileName: file.name,
      taskId,
      uploadId: matched.upload_id ?? null,
    };
  });

  return { links, unmatched, orphaned };
}

export function buildUploadSummary(
  files: File[],
  links: UploadTaskLink[],
  detailsByTaskId: Map<string, TaskDetailResponse>,
  uploadStartedAt?: string,
): UploadSummary {
  const fileRows = files.map((file, index) => {
    const link = links[index];
    const taskId = link?.taskId ?? null;
    const detail = taskId ? detailsByTaskId.get(taskId) : undefined;
    const jobs = detail?.jobs ?? [];
    const hasPending = jobs.some((job) => {
      const status = (job.status || "").toLowerCase();
      return status ? PENDING_STATES.has(status) : false;
    });
    let totalEmails: number | null = null;
    let valid: number | null = null;
    let invalid: number | null = null;
    let catchAll: number | null = null;
    if (detail && jobs.length > 0 && !hasPending) {
      const counts = deriveCounts(detail);
      totalEmails = counts.total;
      valid = counts.valid;
      invalid = counts.invalid;
      catchAll = counts.catchAll;
    }
    if (detail?.metrics && !hasPending) {
      const metricsCounts = deriveCountsFromMetrics(detail.metrics);
      if (metricsCounts) {
        totalEmails = metricsCounts.total;
        valid = metricsCounts.valid;
        invalid = metricsCounts.invalid;
        catchAll = metricsCounts.catchAll;
      }
    }
    const metricsTotal = detail?.metrics?.total_email_addresses;
    if (metricsTotal !== undefined && metricsTotal !== null) {
      totalEmails = metricsTotal;
    }
    const status: FileVerificationStatus = detail && jobs.length > 0 && !hasPending ? "download" : "pending";
    return {
      fileName: file.name,
      downloadName: file.name,
      totalEmails,
      valid,
      catchAll,
      invalid,
      status,
      taskId,
    };
  });

  let totalValid = 0;
  let totalInvalid = 0;
  let totalCatchAll = 0;
  let totalEmails = 0;
  let hasTotals = false;
  fileRows.forEach((row) => {
    if (
      row.totalEmails !== null &&
      row.valid !== null &&
      row.invalid !== null &&
      row.catchAll !== null
    ) {
      totalEmails += row.totalEmails;
      totalValid += row.valid;
      totalInvalid += row.invalid;
      totalCatchAll += row.catchAll;
      hasTotals = true;
    }
  });

  const uploadDate = formatHistoryDate(uploadStartedAt);
  return {
    totalEmails: hasTotals ? totalEmails : null,
    uploadDate,
    files: fileRows,
    aggregates: {
      valid: hasTotals ? totalValid : null,
      catchAll: hasTotals ? totalCatchAll : null,
      invalid: hasTotals ? totalInvalid : null,
    },
  };
}

const normalizeCount = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const hasPendingJobs = (detail?: TaskDetailResponse | null): boolean | null => {
  const jobs = detail?.jobs;
  if (!jobs || jobs.length === 0) return null;
  return jobs.some((job) => {
    const status = (job.status || "").toLowerCase();
    return status ? PENDING_STATES.has(status) : false;
  });
};

const hasPendingJobStatus = (jobStatus?: Record<string, number>): boolean | null => {
  if (!jobStatus || typeof jobStatus !== "object") return null;
  let sawCount = false;
  for (const [status, raw] of Object.entries(jobStatus)) {
    const count = normalizeCount(raw);
    if (count === null) continue;
    sawCount = true;
    if (count > 0 && PENDING_STATES.has(status.toLowerCase())) {
      return true;
    }
  }
  return sawCount ? false : null;
};

const resolveLatestUploadStatus = (
  latest: LatestUploadResponse,
  detail?: TaskDetailResponse | null,
): FileVerificationStatus => {
  const pendingFromDetail = hasPendingJobs(detail);
  if (pendingFromDetail !== null) {
    return pendingFromDetail ? "pending" : "download";
  }
  const pendingFromJobStatus = hasPendingJobStatus(latest.job_status);
  if (pendingFromJobStatus !== null) {
    return pendingFromJobStatus ? "pending" : "download";
  }
  const statusValue = latest.status ? latest.status.toLowerCase() : "";
  if (statusValue) {
    return PENDING_STATES.has(statusValue) ? "pending" : "download";
  }
  return "pending";
};

const buildLatestUploadRow = (
  latest: LatestUploadResponse,
  detail?: TaskDetailResponse | null,
): FileVerification => {
  const status = resolveLatestUploadStatus(latest, detail);
  const pendingFromDetail = hasPendingJobs(detail);
  const countsFromDetail =
    detail?.jobs && detail.jobs.length > 0 && pendingFromDetail === false ? deriveCounts(detail) : null;
  const validCount = normalizeCount(latest.valid_count);
  const invalidCount = normalizeCount(latest.invalid_count);
  const catchAllCount = normalizeCount(latest.catchall_count);
  const hasAllCounts = [validCount, invalidCount, catchAllCount].every((value) => value !== null);
  const countsFromLatest =
    status === "download" && hasAllCounts && validCount !== null && invalidCount !== null && catchAllCount !== null
      ? {
          total: validCount + invalidCount + catchAllCount,
          valid: validCount,
          invalid: invalidCount,
          catchAll: catchAllCount,
        }
      : null;
  let totalEmails: number | null = countsFromDetail?.total ?? null;
  const metricsTotal = detail?.metrics?.total_email_addresses;
  if (metricsTotal !== undefined && metricsTotal !== null) {
    totalEmails = metricsTotal;
  } else if (totalEmails === null) {
    totalEmails = normalizeCount(latest.email_count) ?? countsFromLatest?.total ?? null;
  }
  const fileCounts = countsFromDetail ?? countsFromLatest;
  return {
    fileName: latest.file_name,
    downloadName: latest.file_name ?? null,
    totalEmails,
    valid: fileCounts?.valid ?? null,
    catchAll: fileCounts?.catchAll ?? null,
    invalid: fileCounts?.invalid ?? null,
    status,
    taskId: latest.task_id,
  };
};

export function buildLatestUploadSummary(
  latest: LatestUploadResponse,
  detail?: TaskDetailResponse | null,
): UploadSummary {
  const fileRow = buildLatestUploadRow(latest, detail);
  const hasTotals =
    fileRow.totalEmails !== null &&
    fileRow.valid !== null &&
    fileRow.invalid !== null &&
    fileRow.catchAll !== null;
  return {
    totalEmails: hasTotals ? fileRow.totalEmails : null,
    uploadDate: formatHistoryDate(latest.created_at),
    files: [fileRow],
    aggregates: {
      valid: hasTotals ? fileRow.valid : null,
      catchAll: hasTotals ? fileRow.catchAll : null,
      invalid: hasTotals ? fileRow.invalid : null,
    },
  };
}

export function buildLatestUploadsSummary(
  latestUploads: LatestUploadResponse[],
  detailsByTaskId?: Map<string, TaskDetailResponse>,
): UploadSummary {
  if (!latestUploads.length) {
    return {
      totalEmails: null,
      uploadDate: "—",
      files: [],
      aggregates: { valid: null, catchAll: null, invalid: null },
    };
  }
  const rows = latestUploads.map((latest) => {
    const detail = detailsByTaskId?.get(latest.task_id) ?? null;
    return buildLatestUploadRow(latest, detail);
  });
  const latestRow = rows[0];
  const hasTotals =
    latestRow.totalEmails !== null &&
    latestRow.valid !== null &&
    latestRow.invalid !== null &&
    latestRow.catchAll !== null;
  return {
    totalEmails: hasTotals ? latestRow.totalEmails : null,
    uploadDate: formatHistoryDate(latestUploads[0].created_at),
    files: rows,
    aggregates: {
      valid: hasTotals ? latestRow.valid : null,
      catchAll: hasTotals ? latestRow.catchAll : null,
      invalid: hasTotals ? latestRow.invalid : null,
    },
  };
}

const resolveTaskStatus = (task: Task, detail?: TaskDetailResponse | null): FileVerificationStatus => {
  const pendingFromDetail = hasPendingJobs(detail);
  if (pendingFromDetail !== null) {
    return pendingFromDetail ? "pending" : "download";
  }
  const jobStatus = task.metrics?.job_status ?? task.job_status ?? null;
  const pendingFromJobStatus = hasPendingJobStatus(jobStatus ?? undefined);
  if (pendingFromJobStatus !== null) {
    return pendingFromJobStatus ? "pending" : "download";
  }
  const progressPercent = normalizeCount(task.metrics?.progress_percent);
  if (progressPercent !== null) {
    return progressPercent >= 100 ? "download" : "pending";
  }
  const progress = normalizeCount(task.metrics?.progress);
  if (progress !== null) {
    return progress >= 1 ? "download" : "pending";
  }
  const statusValue = (task.status || "").toLowerCase();
  if (statusValue) {
    return PENDING_STATES.has(statusValue) ? "pending" : "download";
  }
  return "pending";
};

const buildTaskUploadRow = (task: Task, detail?: TaskDetailResponse | null): FileVerification => {
  const status = resolveTaskStatus(task, detail);
  const pendingFromDetail = hasPendingJobs(detail);
  const countsFromDetail =
    detail?.jobs && detail.jobs.length > 0 && pendingFromDetail === false ? deriveCounts(detail) : null;
  const metricsCounts = deriveCountsFromMetrics(task.metrics ?? detail?.metrics ?? null);
  const validCount = normalizeCount(task.valid_count);
  const invalidCount = normalizeCount(task.invalid_count);
  const catchAllCount = normalizeCount(task.catchall_count);
  const hasTaskCounts = [validCount, invalidCount, catchAllCount].every((value) => value !== null);
  const countsFromTask =
    status === "download" && hasTaskCounts && validCount !== null && invalidCount !== null && catchAllCount !== null
      ? {
          total: validCount + invalidCount + catchAllCount,
          valid: validCount,
          invalid: invalidCount,
          catchAll: catchAllCount,
        }
      : null;
  const countsFromMetrics = status === "download" && metricsCounts ? metricsCounts : null;
  const metricsTotal = detail?.metrics?.total_email_addresses ?? task.metrics?.total_email_addresses;
  let totalEmails: number | null = countsFromDetail?.total ?? null;
  if (metricsTotal !== undefined && metricsTotal !== null) {
    totalEmails = metricsTotal;
  } else if (totalEmails === null) {
    totalEmails =
      normalizeCount(task.email_count) ??
      countsFromMetrics?.total ??
      countsFromTask?.total ??
      null;
  }
  const fileCounts = countsFromDetail ?? countsFromMetrics ?? countsFromTask;
  const rawFileName = typeof task.file_name === "string" ? task.file_name.trim() : "";
  if (!rawFileName) {
    console.info("verify.file_name.unavailable", { task_id: task.id });
  }
  return {
    fileName: rawFileName || EXTERNAL_DATA_UNAVAILABLE,
    downloadName: rawFileName || null,
    totalEmails,
    valid: fileCounts?.valid ?? null,
    catchAll: fileCounts?.catchAll ?? null,
    invalid: fileCounts?.invalid ?? null,
    status,
    taskId: task.id ?? null,
  };
};

export function buildTaskUploadsSummary(
  tasks: Task[],
  detailsByTaskId?: Map<string, TaskDetailResponse>,
): UploadSummary {
  if (!tasks.length) {
    return {
      totalEmails: null,
      uploadDate: "—",
      files: [],
      aggregates: { valid: null, catchAll: null, invalid: null },
    };
  }
  const rows = tasks.map((task) => {
    const detail = task.id ? detailsByTaskId?.get(task.id) ?? null : null;
    return buildTaskUploadRow(task, detail);
  });
  const latestRow = rows[0];
  const hasTotals =
    latestRow.totalEmails !== null &&
    latestRow.valid !== null &&
    latestRow.invalid !== null &&
    latestRow.catchAll !== null;
  return {
    totalEmails: hasTotals ? latestRow.totalEmails : null,
    uploadDate: formatHistoryDate(tasks[0].created_at),
    files: rows,
    aggregates: {
      valid: hasTotals ? latestRow.valid : null,
      catchAll: hasTotals ? latestRow.catchAll : null,
      invalid: hasTotals ? latestRow.invalid : null,
    },
  };
}

export function buildLatestManualResults(detail: TaskDetailResponse): VerificationResult[] {
  const jobs = detail.jobs ?? [];
  if (!jobs.length) return [];
  return jobs.map((job) => mapJobToVerificationResult(job)).filter((entry): entry is VerificationResult => Boolean(entry));
}
