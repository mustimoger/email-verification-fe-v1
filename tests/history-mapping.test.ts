import assert from "node:assert";

import { TaskDetailResponse, Task } from "../app/lib/api-client";
import { deriveCounts, mapDetailToHistoryRow, mapTaskToHistoryRow, PENDING_STATES, formatHistoryDate } from "../app/history/utils";

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

run("deriveCounts tallies valid/invalid/catchall from jobs", () => {
  const detail: TaskDetailResponse = {
    id: "t1",
    jobs: [
      { status: "exists" },
      { status: "catchall" },
      { status: "not_exists" },
      { email: { status: "exists" } },
      { email: { status: "invalid_syntax" } },
    ],
  };
  const counts = deriveCounts(detail);
  assert.strictEqual(counts.total, 5);
  assert.strictEqual(counts.valid, 2);
  assert.strictEqual(counts.catchAll, 1);
  assert.strictEqual(counts.invalid, 2);
});

run("mapDetailToHistoryRow maps completed task to status label with formatted date", () => {
  const detail: TaskDetailResponse = {
    id: "t2",
    created_at: "2024-02-01T00:00:00Z",
    jobs: [
      { status: "exists" },
      { status: "catchall" },
      { status: "not_exists" },
    ],
  };
  const row = mapDetailToHistoryRow(detail);
  assert(row, "row should not be null");
  assert.strictEqual(row?.id, "t2");
  assert.strictEqual(row?.label, "t2");
  assert.strictEqual(row?.action, "status");
  assert.strictEqual(row?.statusTone, "completed");
  assert.strictEqual(row?.statusLabel, "Completed");
  assert.strictEqual(row?.date, "Feb 01, 2024");
  assert.strictEqual(row?.total, 3);
  assert.strictEqual(row?.valid, 1);
  assert.strictEqual(row?.catchAll, 1);
  assert.strictEqual(row?.invalid, 1);
});

run("mapDetailToHistoryRow marks pending when any job is in pending states", () => {
  const detail: TaskDetailResponse = {
    id: "t3",
    created_at: "2024-02-02T00:00:00Z",
    jobs: [
      { status: "exists" },
      { status: "processing" },
      { email: { status: "queued" } },
    ],
  };
  const row = mapDetailToHistoryRow(detail);
  assert(row, "row should not be null");
  assert.strictEqual(row?.statusTone, "processing");
  assert.strictEqual(row?.statusLabel, "Processing");
  assert.ok(PENDING_STATES.has("processing"));
});

run("formatHistoryDate returns placeholder for invalid dates", () => {
  assert.strictEqual(formatHistoryDate(undefined), "—");
  assert.strictEqual(formatHistoryDate("not-a-date"), "—");
});

run("mapTaskToHistoryRow uses counts/status without detail fetch", () => {
  const task: Task = {
    id: "t4",
    created_at: "2024-03-03T00:00:00Z",
    status: "processing",
    valid_count: 5,
    invalid_count: 2,
    catchall_count: 1,
    file_name: "upload.csv",
  };
  const row = mapTaskToHistoryRow(task);
  assert(row, "row should not be null");
  assert.strictEqual(row?.id, "t4");
  assert.strictEqual(row?.total, 8);
  assert.strictEqual(row?.action, "status");
  assert.strictEqual(row?.statusTone, "processing");
  assert.strictEqual(row?.statusLabel, "Processing");
  assert.strictEqual(row?.fileName, "upload.csv");
  assert.strictEqual(row?.label, "upload.csv");
});

run("mapTaskToHistoryRow exposes download action for completed file tasks", () => {
  const task: Task = {
    id: "t5",
    created_at: "2024-03-04T00:00:00Z",
    status: "completed",
    valid_count: 3,
    invalid_count: 1,
    catchall_count: 0,
    file_name: "results.csv",
  };
  const row = mapTaskToHistoryRow(task);
  assert(row, "row should not be null");
  assert.strictEqual(row?.action, "download");
  assert.strictEqual(row?.statusTone, "completed");
  assert.strictEqual(row?.statusLabel, "Completed");
});

// eslint-disable-next-line no-console
console.log("history mapping tests completed");
