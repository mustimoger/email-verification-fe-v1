import assert from "node:assert";

import { ApiError } from "../app/lib/api-client";
import type { BatchFileUploadResponse, TaskDetailResponse } from "../app/lib/api-client";
import {
  buildUploadSummary,
  createUploadLinks,
  mapTaskDetailToResults,
  mapUploadResultsToLinks,
  resolveApiErrorMessage,
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
