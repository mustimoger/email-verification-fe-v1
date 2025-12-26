import assert from "node:assert";

import { ApiError } from "../app/lib/api-client";
import type {
  BatchFileUploadResponse,
  LatestManualResponse,
  LatestUploadResponse,
  ManualVerificationResult,
  TaskDetailResponse,
} from "../app/lib/api-client";
import {
  buildManualResultsFromDetail,
  buildManualResultsFromStored,
  buildLatestManualResults,
  buildLatestUploadsSummary,
  buildLatestUploadSummary,
  buildUploadSummary,
  createUploadLinks,
  mapTaskDetailToResults,
  mapUploadResultsToLinks,
  resolveApiErrorMessage,
  shouldExpireManualResults,
} from "../app/verify/utils";

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

run("mapTaskDetailToResults returns statuses mapped by email", () => {
  const detail: TaskDetailResponse = {
    jobs: [
      { email_address: "alpha@example.com", status: "completed" },
      { email: { email_address: "beta@example.com", status: "exists" } },
    ],
  };
  const results = mapTaskDetailToResults(["alpha@example.com", "beta@example.com", "gamma@example.com"], detail);
  assert.strictEqual(results.length, 3);
  assert.strictEqual(results[0].status, "completed");
  assert.strictEqual(results[1].status, "exists");
  assert.strictEqual(results[2].status, "pending");
});

run("mapUploadResultsToLinks maps each file to task_id by filename", () => {
  const files = [{ name: "first.csv" }, { name: "second.csv" }] as File[];
  const uploadResults: BatchFileUploadResponse[] = [
    { filename: "second.csv", task_id: "task-2", upload_id: "upload-2" },
    { filename: "first.csv", task_id: "task-1", upload_id: "upload-1" },
  ];
  const { links, unmatched, orphaned } = mapUploadResultsToLinks(files, uploadResults);
  assert.strictEqual(unmatched, 0);
  assert.strictEqual(orphaned.length, 0);
  assert.strictEqual(links[0].fileName, "first.csv");
  assert.strictEqual(links[0].taskId, "task-1");
  assert.strictEqual(links[1].fileName, "second.csv");
  assert.strictEqual(links[1].taskId, "task-2");
});

run("mapUploadResultsToLinks flags missing task_id as unmatched", () => {
  const files = [{ name: "first.csv" }] as File[];
  const uploadResults: BatchFileUploadResponse[] = [{ filename: "first.csv", upload_id: "upload-1" }];
  const { links, unmatched } = mapUploadResultsToLinks(files, uploadResults);
  assert.strictEqual(unmatched, 1);
  assert.strictEqual(links[0].taskId, null);
});

run("buildUploadSummary uses detail jobs for counts when completed", () => {
  const files = [{ name: "first.csv" }] as File[];
  const links = createUploadLinks(files).map((link) => ({ ...link, taskId: "task-1" }));
  const detail: TaskDetailResponse = {
    id: "task-1",
    jobs: [
      { email: { status: "exists" } },
      { email: { status: "catchall" } },
      { email: { status: "not_exists" } },
    ],
  };
  const summary = buildUploadSummary(files, links, new Map([["task-1", detail]]), "2024-03-01T00:00:00Z");
  assert.strictEqual(summary.totalEmails, 3);
  assert.strictEqual(summary.aggregates.valid, 1);
  assert.strictEqual(summary.aggregates.catchAll, 1);
  assert.strictEqual(summary.aggregates.invalid, 1);
  assert.strictEqual(summary.files[0].status, "download");
});

run("buildUploadSummary stays pending when jobs are missing", () => {
  const files = [{ name: "first.csv" }] as File[];
  const links = createUploadLinks(files).map((link) => ({ ...link, taskId: "task-1" }));
  const summary = buildUploadSummary(files, links, new Map(), "2024-03-01T00:00:00Z");
  assert.strictEqual(summary.files[0].status, "pending");
  assert.strictEqual(summary.files[0].totalEmails, null);
});

run("buildLatestUploadSummary uses latest counts when no pending jobs remain", () => {
  const latest: LatestUploadResponse = {
    task_id: "task-1",
    file_name: "upload.csv",
    created_at: "2024-03-01T00:00:00Z",
    status: "completed",
    email_count: 3,
    valid_count: 1,
    invalid_count: 1,
    catchall_count: 1,
    job_status: { completed: 3 },
  };
  const summary = buildLatestUploadSummary(latest);
  assert.strictEqual(summary.files[0].status, "download");
  assert.strictEqual(summary.files[0].valid, 1);
  assert.strictEqual(summary.totalEmails, 3);
});

run("buildLatestUploadSummary stays pending when job_status reports pending work", () => {
  const latest: LatestUploadResponse = {
    task_id: "task-2",
    file_name: "pending.csv",
    created_at: "2024-03-02T00:00:00Z",
    email_count: 2,
    valid_count: 1,
    invalid_count: 1,
    catchall_count: 0,
    job_status: { pending: 1, processing: 1 },
  };
  const summary = buildLatestUploadSummary(latest);
  assert.strictEqual(summary.files[0].status, "pending");
  assert.strictEqual(summary.files[0].valid, null);
  assert.strictEqual(summary.totalEmails, null);
});

run("buildLatestUploadsSummary keeps latest upload totals only", () => {
  const latestUploads: LatestUploadResponse[] = [
    {
      task_id: "task-1",
      file_name: "latest.csv",
      created_at: "2024-03-03T00:00:00Z",
      status: "completed",
      email_count: 4,
      valid_count: 2,
      invalid_count: 1,
      catchall_count: 1,
    },
    {
      task_id: "task-2",
      file_name: "older.csv",
      created_at: "2024-03-02T00:00:00Z",
      status: "completed",
      email_count: 3,
      valid_count: 1,
      invalid_count: 1,
      catchall_count: 1,
    },
  ];
  const summary = buildLatestUploadsSummary(latestUploads);
  assert.strictEqual(summary.files.length, 2);
  assert.strictEqual(summary.aggregates.valid, 2);
  assert.strictEqual(summary.totalEmails, 4);
  assert.strictEqual(summary.files[0].fileName, "latest.csv");
});

run("buildLatestManualResults skips jobs without email addresses", () => {
  const detail: TaskDetailResponse = {
    jobs: [
      { email_address: "alpha@example.com", status: "completed" },
      { status: "pending" },
      { email: { email_address: "beta@example.com", status: "exists" } },
    ],
  };
  const results = buildLatestManualResults(detail);
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].email, "alpha@example.com");
  assert.strictEqual(results[1].email, "beta@example.com");
});

run("buildManualResultsFromDetail uses email list to show pending rows", () => {
  const detail: TaskDetailResponse = { jobs: [] };
  const results = buildManualResultsFromDetail(["alpha@example.com"], detail);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].email, "alpha@example.com");
  assert.strictEqual(results[0].status, "pending");
});

run("buildManualResultsFromDetail falls back to job list when emails are missing", () => {
  const detail: TaskDetailResponse = {
    jobs: [{ email_address: "alpha@example.com", status: "completed" }],
  };
  const results = buildManualResultsFromDetail([], detail);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].email, "alpha@example.com");
});

run("buildManualResultsFromStored maps stored statuses by email order", () => {
  const stored: ManualVerificationResult[] = [
    { email: "beta@example.com", status: "exists", message: "ok" },
  ];
  const results = buildManualResultsFromStored(["alpha@example.com", "beta@example.com"], stored);
  assert.strictEqual(results[0].status, "pending");
  assert.strictEqual(results[1].status, "exists");
});

run("shouldExpireManualResults returns true when finished_at is set", () => {
  const detail: TaskDetailResponse = {
    finished_at: "2024-03-02T00:00:00Z",
  };
  const latest: LatestManualResponse = { task_id: "task-1" };
  assert.strictEqual(shouldExpireManualResults(detail, latest), true);
});

run("shouldExpireManualResults returns false when pending job_status remains", () => {
  const detail: TaskDetailResponse = {
    metrics: { job_status: { pending: 2, processing: 0 } },
  };
  const latest: LatestManualResponse = { task_id: "task-2", job_status: { pending: 2 } };
  assert.strictEqual(shouldExpireManualResults(detail, latest), false);
});

run("resolveApiErrorMessage returns detail string when present", () => {
  const error = new ApiError(402, "Payment Required", { detail: "Insufficient credits" });
  const message = resolveApiErrorMessage(error);
  assert.strictEqual(message, "Insufficient credits");
});

run("resolveApiErrorMessage falls back to ApiError message without detail", () => {
  const error = new ApiError(500, "Internal Server Error");
  const message = resolveApiErrorMessage(error);
  assert.strictEqual(message, "Internal Server Error");
});

// eslint-disable-next-line no-console
console.log("verify mapping tests completed");
