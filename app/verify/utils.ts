"use client";

import { Task, TaskDetailResponse, TaskEmailJob } from "../lib/api-client";
import { PENDING_STATES, formatHistoryDate } from "../history/utils";

export type VerificationResult = {
  email: string;
  status: string;
  message: string;
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

export function mapVerifyFallbackResults(emails: string[], taskId?: string | null): VerificationResult[] {
  return emails.map((email) => ({
    email,
    status: "pending",
    message: taskId ? `Task ${taskId}` : "Task queued",
  }));
}

function parseDate(value?: string): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function selectTasksForUpload(tasks: Task[], uploadStartedAt?: string): Task[] {
  const startMs = parseDate(uploadStartedAt);
  if (startMs === null) {
    return tasks;
  }
  const recent = tasks.filter((task) => {
    const createdMs = parseDate(task.created_at);
    return createdMs !== null && createdMs >= startMs;
  });
  return recent.length ? recent : tasks;
}

function extractCounts(task: Task): {
  total: number | null;
  valid: number | null;
  invalid: number | null;
  catchAll: number | null;
} {
  const valid = task.valid_count ?? null;
  const invalid = task.invalid_count ?? null;
  const catchAll = task.catchall_count ?? null;
  if (task.email_count !== undefined && task.email_count !== null) {
    return { total: task.email_count, valid, invalid, catchAll };
  }
  if (valid !== null && invalid !== null && catchAll !== null) {
    return { total: valid + invalid + catchAll, valid, invalid, catchAll };
  }
  return { total: null, valid, invalid, catchAll };
}

export function buildUploadSummary(
  files: File[],
  tasks: Task[],
  uploadStartedAt?: string,
): { summary: UploadSummary; unmatched: number } {
  const candidates = selectTasksForUpload(tasks, uploadStartedAt);
  const matchedTasks = candidates.slice(0, files.length);
  const unmatched = files.length - matchedTasks.length;
  const fileRows = files.map((file, index) => {
    const task = matchedTasks[index];
    if (!task) {
      return {
        fileName: file.name,
        totalEmails: null,
        valid: null,
        catchAll: null,
        invalid: null,
        status: "pending" as const,
        taskId: null,
      };
    }
    const counts = extractCounts(task);
    const statusRaw = (task.status || "").toLowerCase();
    const status: FileVerificationStatus = statusRaw && PENDING_STATES.has(statusRaw) ? "pending" : "download";
    return {
      fileName: file.name,
      totalEmails: counts.total,
      valid: counts.valid,
      catchAll: counts.catchAll,
      invalid: counts.invalid,
      status,
      taskId: task.id ?? null,
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
    summary: {
      totalEmails: hasTotals ? totalEmails : null,
      uploadDate,
      files: fileRows,
      aggregates: {
        valid: hasTotals ? totalValid : null,
        catchAll: hasTotals ? totalCatchAll : null,
        invalid: hasTotals ? totalInvalid : null,
      },
    },
    unmatched,
  };
}
