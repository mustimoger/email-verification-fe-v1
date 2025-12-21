import assert from "node:assert";

import {
  aggregateValidationCounts,
  buildIntegrationLabelMap,
  formatOverviewDate,
  mapOverviewTask,
  normalizeOverviewStatus,
  resolveTaskLabel,
  summarizeJobStatus,
} from "../app/overview/utils";
import { OverviewResponse } from "../app/lib/api-client";

function run(name: string, fn: () => void) {
  try {
    fn();
    // eslint-disable-next-line no-console
    console.log(`✓ ${name}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`✗ ${name}`);
    throw error;
  }
}

run("normalizeOverviewStatus maps common states", () => {
  assert.strictEqual(normalizeOverviewStatus("completed"), "Completed");
  assert.strictEqual(normalizeOverviewStatus("processing"), "Running");
  assert.strictEqual(normalizeOverviewStatus("failed"), "Cancelled");
  assert.strictEqual(normalizeOverviewStatus(undefined), "Cancelled");
});

run("formatOverviewDate handles invalid input", () => {
  assert.strictEqual(formatOverviewDate(undefined), "—");
  assert.strictEqual(formatOverviewDate("not-a-date"), "—");
  assert.strictEqual(formatOverviewDate("2024-02-01T00:00:00Z"), "Feb 01, 2024");
});

run("aggregateValidationCounts sums task counts", () => {
  const tasks: OverviewResponse["recent_tasks"] = [
    { task_id: "t1", valid_count: 2, invalid_count: 1, catchall_count: 0 },
    { task_id: "t2", valid_count: 3, invalid_count: 2, catchall_count: 1 },
  ];
  const totals = aggregateValidationCounts(tasks);
  assert.strictEqual(totals.valid, 5);
  assert.strictEqual(totals.invalid, 3);
  assert.strictEqual(totals.catchAll, 1);
  assert.strictEqual(totals.total, 9);
});

run("mapOverviewTask maps task fields safely", () => {
  const labels = buildIntegrationLabelMap([
    { id: "zapier", label: "Zapier", description: "", icon: null, default_name: null },
  ]);
  const task = {
    task_id: "t3",
    status: "processing",
    email_count: 10,
    valid_count: 4,
    invalid_count: 3,
    catchall_count: 1,
    integration: "zapier",
    created_at: "2024-03-03T00:00:00Z",
  };
  const mapped = mapOverviewTask(task, labels);
  assert.strictEqual(mapped.id, "t3");
  assert.strictEqual(mapped.name, "Zapier");
  assert.strictEqual(mapped.emails, 10);
  assert.strictEqual(mapped.valid, 4);
  assert.strictEqual(mapped.invalid, 3);
  assert.strictEqual(mapped.catchAll, 1);
  assert.strictEqual(mapped.status, "Running");
  assert.strictEqual(mapped.date, "Mar 03, 2024");
});

run("resolveTaskLabel prioritizes dashboard and integration labels", () => {
  const labels = buildIntegrationLabelMap([{ id: "n8n", label: "n8n", description: "", icon: null, default_name: null }]);
  assert.strictEqual(resolveTaskLabel(undefined, labels), "Dashboard");
  assert.strictEqual(resolveTaskLabel("dashboard_api", labels), "Dashboard");
  assert.strictEqual(resolveTaskLabel("n8n", labels), "n8n");
});

run("summarizeJobStatus follows priority rule", () => {
  const running = summarizeJobStatus({ pending: 2, processing: 1, completed: 10, failed: 0 });
  assert.strictEqual(running.label, "Processing");
  assert.strictEqual(running.total, 3);
  const failed = summarizeJobStatus({ failed: 4, completed: 20 });
  assert.strictEqual(failed.label, "Failed");
  assert.strictEqual(failed.total, 4);
  const completed = summarizeJobStatus({ completed: 8 });
  assert.strictEqual(completed.label, "Completed");
  assert.strictEqual(completed.total, 8);
  const unknown = summarizeJobStatus(undefined);
  assert.strictEqual(unknown.label, "Unknown");
  assert.strictEqual(unknown.total, 0);
});

// eslint-disable-next-line no-console
console.log("overview mapping tests completed");
