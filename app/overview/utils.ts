import { IntegrationOption, OverviewResponse, Task } from "../lib/api-client";
import { formatPurposeLabel } from "../api/utils";

export type TaskStatus = "Completed" | "Running" | "Cancelled";

export type OverviewTask = {
  id: string;
  name: string;
  emails: number;
  date: string;
  valid: number;
  invalid: number;
  catchAll: number;
  status: TaskStatus;
};

const RUNNING_STATUSES = new Set(["processing", "pending", "started", "queued", "running"]);
const COMPLETED_STATUSES = new Set(["completed", "finished", "done", "success"]);
const CANCELLED_STATUSES = new Set(["cancelled", "failed", "error"]);
const DASHBOARD_INTEGRATIONS = new Set(["dashboard", "dashboard_api"]);
const DEFAULT_DASHBOARD_LABEL = "Dashboard";

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

export function buildIntegrationLabelMap(options: IntegrationOption[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  (options ?? []).forEach((option) => {
    const id = option.id?.trim();
    const label = option.label?.trim();
    if (id) {
      map.set(id.toLowerCase(), label || id);
    }
    if (label) {
      map.set(label.toLowerCase(), label);
    }
  });
  return map;
}

export function resolveTaskLabel(
  rawIntegration: string | null | undefined,
  labels: Map<string, string>,
  dashboardLabel: string = DEFAULT_DASHBOARD_LABEL,
): string {
  const value = (rawIntegration ?? "").trim();
  if (!value) return dashboardLabel;
  const normalized = value.toLowerCase();
  if (DASHBOARD_INTEGRATIONS.has(normalized)) {
    return dashboardLabel;
  }
  const mapped = labels.get(normalized);
  if (mapped) {
    return mapped;
  }
  console.warn("overview.task.integration_unmapped", { integration: value });
  return formatPurposeLabel(value);
}

export function mapOverviewTask(
  task: OverviewResponse["recent_tasks"][number],
  integrationLabels: Map<string, string>,
): OverviewTask {
  const status = normalizeOverviewStatus(task.status);
  return {
    id: task.task_id,
    name: resolveTaskLabel(task.integration, integrationLabels),
    emails: task.email_count ?? 0,
    date: formatOverviewDate(task.created_at),
    valid: task.valid_count ?? 0,
    invalid: task.invalid_count ?? 0,
    catchAll: task.catchall_count ?? 0,
    status,
  };
}

export function mapTaskToOverviewTask(
  task: Task,
  integrationLabels: Map<string, string>,
): OverviewTask | null {
  if (!task.id) {
    console.warn("overview.task.missing_id", { task });
    return null;
  }
  const valid = task.valid_count ?? 0;
  const invalid = task.invalid_count ?? 0;
  const catchAll = task.catchall_count ?? 0;
  const emails = task.email_count ?? valid + invalid + catchAll;
  const status = normalizeOverviewStatus(task.status);
  return {
    id: task.id,
    name: resolveTaskLabel(task.integration, integrationLabels),
    emails,
    date: formatOverviewDate(task.created_at),
    valid,
    invalid,
    catchAll,
    status,
  };
}
