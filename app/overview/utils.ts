import { OverviewResponse, Task } from "../lib/api-client";

export type TaskStatus = "Completed" | "Running" | "Cancelled";

const RUNNING_STATUSES = new Set(["processing", "pending", "started", "queued", "running"]);
const COMPLETED_STATUSES = new Set(["completed", "finished", "done", "success"]);
const CANCELLED_STATUSES = new Set(["cancelled", "failed", "error"]);

export function normalizeOverviewStatus(status?: string | null): TaskStatus {
  const value = (status || "").toLowerCase();
  if (COMPLETED_STATUSES.has(value)) return "Completed";
  if (RUNNING_STATUSES.has(value)) return "Running";
  if (CANCELLED_STATUSES.has(value)) return "Cancelled";
  return "Cancelled";
}

export function formatOverviewDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function aggregateValidationCounts(tasks: OverviewResponse["recent_tasks"] | undefined) {
  let valid = 0;
  let invalid = 0;
  let catchAll = 0;
  for (const task of tasks ?? []) {
    valid += task.valid_count ?? 0;
    invalid += task.invalid_count ?? 0;
    catchAll += task.catchall_count ?? 0;
  }
  const total = valid + invalid + catchAll;
  return { valid, invalid, catchAll, total };
}

export function mapOverviewTask(task: OverviewResponse["recent_tasks"][number]): Task {
  const status = normalizeOverviewStatus(task.status);
  return {
    id: task.task_id,
    name: task.integration || "Task",
    emails: task.email_count ?? 0,
    date: formatOverviewDate(task.created_at),
    valid: task.valid_count ?? 0,
    invalid: task.invalid_count ?? 0,
    status,
  };
}
