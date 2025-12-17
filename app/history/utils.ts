"use client";

import { TaskDetailResponse, TaskEmailJob } from "../lib/api-client";
import { Task } from "../lib/api-client";

export type HistoryStatus = "download" | "pending";

export type HistoryRow = {
  id: string;
  date: string;
  label: string;
  total: number;
  valid: number;
  invalid: number;
  catchAll: number;
  status: HistoryStatus;
};

export const PENDING_STATES = new Set(["pending", "processing", "started", "queued"]);

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

export function mapDetailToHistoryRow(detail: TaskDetailResponse): HistoryRow | null {
  if (!detail.id && !detail.jobs?.length) return null;
  const counts = deriveCounts(detail);
  const hasPending =
    detail.jobs?.some((job) => {
      const status = (job.status || job.email?.status || "").toLowerCase();
      return PENDING_STATES.has(status);
    }) ?? false;
  return {
    id: detail.id ?? fallbackId(),
    date: formatHistoryDate(detail.created_at),
    label: detail.id ?? "Task",
    total: counts.total,
    valid: counts.valid,
    invalid: counts.invalid,
    catchAll: counts.catchAll,
    status: hasPending ? "pending" : "download",
  };
}

export function mapTaskToHistoryRow(task: Task): HistoryRow | null {
  if (!task.id) return null;
  const valid = task.valid_count ?? 0;
  const invalid = task.invalid_count ?? 0;
  const catchAll = task.catchall_count ?? 0;
  const total = task.email_count ?? valid + invalid + catchAll;
  const status = (task.status || "").toLowerCase();
  const isPending = status ? PENDING_STATES.has(status) : false;
  return {
    id: task.id,
    date: formatHistoryDate(task.created_at),
    label: task.id,
    total,
    valid,
    invalid,
    catchAll,
    status: isPending ? "pending" : "download",
  };
}
