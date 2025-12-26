"use client";

import Papa from "papaparse";
import {
  ApiError,
  BatchFileUploadResponse,
  LatestUploadResponse,
  LatestManualResponse,
  ManualVerificationResult,
  TaskDetailResponse,
  TaskEmailJob,
} from "../lib/api-client";
import { PENDING_STATES, deriveCounts, formatHistoryDate } from "../history/utils";

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

export function mapTaskDetailToResults(emails: string[], detail: TaskDetailResponse): VerificationResult[] {
  const jobs = detail.jobs ?? [];
  const jobMap = new Map<string, TaskEmailJob>();
  jobs.forEach((job) => {
    const address = (job.email_address || job.email?.email_address || "").trim();
    if (!address) return;
    jobMap.set(address.toLowerCase(), job);
  });

  return emails.map((email) => {
    const job = jobMap.get(email.toLowerCase());
    const status = job?.email?.status || job?.status || "pending";
    const message = job ? `Status: ${status}` : "Awaiting verification";
    return { email, status, message };
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

export function buildManualResultsFromStored(
  emails: string[] | null | undefined,
  storedResults: ManualVerificationResult[] | null | undefined,
): VerificationResult[] {
  const results = Array.isArray(storedResults) ? storedResults : [];
  const map = new Map<string, ManualVerificationResult>();
  results.forEach((item) => {
    const address = item.email?.trim();
    if (!address) return;
    map.set(address.toLowerCase(), item);
  });

  const fallbackEmailList = emails && emails.length > 0 ? emails : results.map((item) => item.email);
  return fallbackEmailList.map((email) => {
    const address = email.trim();
    const match = map.get(address.toLowerCase());
    if (!match) {
      return { email: address, status: "pending", message: "Awaiting verification" };
    }
    const status = match.status || "unknown";
    const message = match.message || `Status: ${status}`;
    return {
      email: address,
      status,
      message,
      validatedAt: match.validated_at,
      isRoleBased: match.is_role_based,
      catchallDomain: match.catchall_domain,
      emailServer: match.email_server,
      disposableDomain: match.disposable_domain,
      registeredDomain: match.registered_domain,
      mxRecord: match.mx_record,
    };
  });
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

const formatBoolean = (value: boolean | undefined): string => {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
};

const formatString = (value: string | undefined | null): string => {
  if (!value) return "";
  return value.trim();
};

export function buildManualExportRows(results: VerificationResult[]): ManualExportRow[] {
  return results
    .filter((item) => Boolean(item.email && item.email.trim()))
    .map((item) => ({
      Email: item.email.trim(),
      Status: formatString(item.status),
      "Role-based": formatBoolean(item.isRoleBased),
      "Catchall Domain": formatBoolean(item.catchallDomain),
      "Email Server": formatString(item.emailServer),
      "Disposable Domain": formatBoolean(item.disposableDomain),
      "Registered Domain": formatBoolean(item.registeredDomain),
      "MX Record": formatString(item.mxRecord),
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
    const metricsTotal = detail?.metrics?.total_email_addresses;
    if (metricsTotal !== undefined && metricsTotal !== null) {
      totalEmails = metricsTotal;
    }
    const status: FileVerificationStatus = detail && jobs.length > 0 && !hasPending ? "download" : "pending";
    return {
      fileName: file.name,
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

export function buildLatestManualResults(detail: TaskDetailResponse): VerificationResult[] {
  const jobs = detail.jobs ?? [];
  if (!jobs.length) return [];
  return jobs
    .map((job) => {
      const address = (job.email_address || job.email?.email_address || "").trim();
      if (!address) {
        console.warn("verify.manual.job_missing_email", { job_id: job.id, email_id: job.email_id });
        return null;
      }
      const status = job.email?.status || job.status;
      if (!status) {
        console.warn("verify.manual.job_missing_status", { job_id: job.id, email_id: job.email_id });
        return null;
      }
      return {
        email: address,
        status,
        message: `Status: ${status}`,
      };
    })
    .filter((entry): entry is VerificationResult => Boolean(entry));
}

export function shouldExpireManualResults(
  detail: TaskDetailResponse,
  latest?: LatestManualResponse | null,
): boolean {
  if (detail.finished_at) return true;
  if (detail.metrics?.progress_percent !== undefined && detail.metrics?.progress_percent !== null) {
    return detail.metrics.progress_percent >= 100;
  }
  if (detail.metrics?.progress !== undefined && detail.metrics?.progress !== null) {
    return detail.metrics.progress >= 1;
  }
  const jobStatus = detail.metrics?.job_status ?? latest?.job_status ?? null;
  if (jobStatus && typeof jobStatus === "object") {
    const pending = Number(jobStatus.pending ?? 0);
    const processing = Number(jobStatus.processing ?? 0);
    if (pending + processing === 0) return true;
  }
  const statusValue = (latest?.status || "").toLowerCase();
  return statusValue.length > 0 && !PENDING_STATES.has(statusValue);
}
