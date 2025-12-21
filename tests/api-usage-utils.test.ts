import assert from "node:assert";

import { ApiKeySummary, UsagePurposeResponse } from "../app/lib/api-client";
import {
  formatPurposeLabel,
  listPurposeOptions,
  mapPurposeSeries,
  resolveDateRange,
  summarizeKeyUsage,
  summarizePurposeUsage,
} from "../app/api/utils";

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

run("summarizeKeyUsage returns total for selected key", () => {
  const keys: ApiKeySummary[] = [
    { id: "k1", total_requests: 3 },
    { id: "k2", total_requests: 5 },
  ];
  const result = summarizeKeyUsage(keys, "k2");
  assert.deepStrictEqual(result, { total: 5, hasData: true });
});

run("summarizeKeyUsage sums totals for all keys", () => {
  const keys: ApiKeySummary[] = [
    { id: "k1", total_requests: 3 },
    { id: "k2", total_requests: 5 },
  ];
  const result = summarizeKeyUsage(keys);
  assert.deepStrictEqual(result, { total: 8, hasData: true });
});

run("summarizeKeyUsage reports missing data when totals are absent", () => {
  const keys: ApiKeySummary[] = [{ id: "k1" }];
  const result = summarizeKeyUsage(keys);
  assert.deepStrictEqual(result, { total: null, hasData: false });
});

run("summarizePurposeUsage uses selected purpose", () => {
  const metrics: UsagePurposeResponse = {
    requests_by_purpose: { zapier: 7, custom: 2 },
    total_requests: 9,
  };
  const result = summarizePurposeUsage(metrics, "custom");
  assert.deepStrictEqual(result, { total: 2, hasData: true });
});

run("summarizePurposeUsage uses total_requests when no purpose selected", () => {
  const metrics: UsagePurposeResponse = {
    requests_by_purpose: { zapier: 7 },
    total_requests: 7,
  };
  const result = summarizePurposeUsage(metrics);
  assert.deepStrictEqual(result, { total: 7, hasData: true });
});

run("summarizePurposeUsage sums when total_requests missing", () => {
  const metrics: UsagePurposeResponse = {
    requests_by_purpose: { zapier: 4, n8n: 6 },
  };
  const result = summarizePurposeUsage(metrics);
  assert.deepStrictEqual(result, { total: 10, hasData: true });
});

run("listPurposeOptions returns available purpose keys", () => {
  const metrics: UsagePurposeResponse = {
    requests_by_purpose: { zapier: 1, "google sheets": 2 },
  };
  const result = listPurposeOptions(metrics);
  assert.deepStrictEqual(result, ["zapier", "google sheets"]);
});

run("formatPurposeLabel normalizes labels", () => {
  assert.strictEqual(formatPurposeLabel("google sheets"), "Google Sheets");
  assert.strictEqual(formatPurposeLabel("custom_api"), "Custom Api");
  assert.strictEqual(formatPurposeLabel("n8n"), "N8n");
});

run("mapPurposeSeries maps total_requests when no purpose selected", () => {
  const result = mapPurposeSeries(
    [
      { date: "2024-02-01", total_requests: 5, requests_by_purpose: { zapier: 3 } },
      { date: "2024-02-02", total_requests: 2, requests_by_purpose: { zapier: 2 } },
    ],
    "",
  );
  assert.deepStrictEqual(result, [
    { date: "2024-02-01", count: 5 },
    { date: "2024-02-02", count: 2 },
  ]);
});

run("mapPurposeSeries maps selected purpose counts", () => {
  const result = mapPurposeSeries(
    [
      { date: "2024-02-01", total_requests: 5, requests_by_purpose: { zapier: 3 } },
      { date: "2024-02-02", total_requests: 2, requests_by_purpose: { zapier: 2 } },
    ],
    "zapier",
  );
  assert.deepStrictEqual(result, [
    { date: "2024-02-01", count: 3 },
    { date: "2024-02-02", count: 2 },
  ]);
});

run("mapPurposeSeries skips points without dates", () => {
  const result = mapPurposeSeries([{ total_requests: 5 }, { date: "2024-02-01", total_requests: 2 }], "");
  assert.deepStrictEqual(result, [{ date: "2024-02-01", count: 2 }]);
});

run("resolveDateRange returns empty when no dates provided", () => {
  const result = resolveDateRange({ from: "", to: "" });
  assert.deepStrictEqual(result, {});
});

run("resolveDateRange rejects invalid start date", () => {
  const result = resolveDateRange({ from: "2025-13-40", to: "2025-01-10" });
  assert.deepStrictEqual(result, { error: "Invalid start date." });
});

run("resolveDateRange rejects invalid end date", () => {
  const result = resolveDateRange({ from: "2025-01-10", to: "2025-02-31" });
  assert.deepStrictEqual(result, { error: "Invalid end date." });
});

run("resolveDateRange rejects partial ranges", () => {
  const missingEnd = resolveDateRange({ from: "2025-01-10", to: "" });
  assert.deepStrictEqual(missingEnd, { error: "End date is required when start date is set." });
  const missingStart = resolveDateRange({ from: "", to: "2025-01-10" });
  assert.deepStrictEqual(missingStart, { error: "Start date is required when end date is set." });
});

run("resolveDateRange rejects start after end", () => {
  const result = resolveDateRange({ from: "2025-01-20", to: "2025-01-10" });
  assert.deepStrictEqual(result, { error: "Start date must be before end date." });
});

run("resolveDateRange returns UTC day boundaries", () => {
  const result = resolveDateRange({ from: "2025-01-02", to: "2025-01-05" });
  assert.deepStrictEqual(result, {
    start: "2025-01-02T00:00:00.000Z",
    end: "2025-01-05T23:59:59.999Z",
  });
});

// eslint-disable-next-line no-console
console.log("api usage utils tests completed");
