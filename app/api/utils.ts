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

type DateParts = {
  year: number;
  month: number;
  day: number;
};

export type DateRangeInput = {
  from: string;
  to: string;
};

export type DateRangeResult = {
  start?: string;
  end?: string;
  error?: string;
};

function parseDateParts(value: string): DateParts | null {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [yearRaw, monthRaw, dayRaw] = parts;
  if (!yearRaw || !monthRaw || !dayRaw) return null;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + 1 !== month ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function toUtcIso(parts: DateParts, hours: number, minutes: number, seconds: number, ms: number): string {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hours, minutes, seconds, ms)).toISOString();
}

export function resolveDateRange(input: DateRangeInput): DateRangeResult {
  const fromParts = parseDateParts(input.from);
  const toParts = parseDateParts(input.to);

  if (input.from && !fromParts) {
    return { error: "Invalid start date." };
  }
  if (input.to && !toParts) {
    return { error: "Invalid end date." };
  }
  if (!fromParts && !toParts) {
    return {};
  }
  if (fromParts && !toParts) {
    return { error: "End date is required when start date is set." };
  }
  if (!fromParts && toParts) {
    return { error: "Start date is required when end date is set." };
  }

  const start = toUtcIso(fromParts as DateParts, 0, 0, 0, 0);
  const end = toUtcIso(toParts as DateParts, 23, 59, 59, 999);
  if (new Date(start).getTime() > new Date(end).getTime()) {
    return { error: "Start date must be before end date." };
  }

  return { start, end };
}
