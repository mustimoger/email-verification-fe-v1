import { ApiKeySummary, UsagePurposeResponse } from "../lib/api-client";

export type UsageTotal = {
  total: number | null;
  hasData: boolean;
};

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function summarizeKeyUsage(keys: ApiKeySummary[] | null | undefined, selectedKeyId?: string): UsageTotal {
  if (!keys || keys.length === 0) {
    return { total: null, hasData: false };
  }

  if (selectedKeyId) {
    const match = keys.find((key) => key.id === selectedKeyId);
    if (match && isNumber(match.total_requests)) {
      return { total: match.total_requests, hasData: true };
    }
    return { total: null, hasData: false };
  }

  const totals = keys.map((key) => key.total_requests).filter(isNumber);
  if (totals.length === 0) {
    return { total: null, hasData: false };
  }
  const total = totals.reduce((sum, value) => sum + value, 0);
  return { total, hasData: true };
}

export function summarizePurposeUsage(
  metrics: UsagePurposeResponse | null | undefined,
  selectedPurpose?: string,
): UsageTotal {
  if (!metrics) {
    return { total: null, hasData: false };
  }

  const requests = metrics.requests_by_purpose ?? {};
  if (selectedPurpose) {
    const value = requests[selectedPurpose];
    if (isNumber(value)) {
      return { total: value, hasData: true };
    }
    return { total: null, hasData: false };
  }

  if (isNumber(metrics.total_requests)) {
    return { total: metrics.total_requests, hasData: true };
  }

  const totals = Object.values(requests).filter(isNumber);
  if (totals.length === 0) {
    return { total: null, hasData: false };
  }
  const total = totals.reduce((sum, value) => sum + value, 0);
  return { total, hasData: true };
}

export function listPurposeOptions(metrics: UsagePurposeResponse | null | undefined): string[] {
  if (!metrics?.requests_by_purpose) {
    return [];
  }
  return Object.keys(metrics.requests_by_purpose).filter((value) => value.trim().length > 0);
}

export function formatPurposeLabel(purpose: string): string {
  const normalized = purpose.replace("_", " ").replace("-", " ");
  const words = normalized.split(" ").filter((word) => word.trim().length > 0);
  if (words.length === 0) {
    return purpose;
  }
  return words
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}
