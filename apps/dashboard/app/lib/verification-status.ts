export type VerificationPrimaryStatus =
  | "valid"
  | "invalid"
  | "catchall"
  | "disposable_domain"
  | "role_based";

export type VerificationStatusBucket = VerificationPrimaryStatus | "unknown" | "pending";

export type VerificationStatusCounts = {
  valid: number;
  invalid: number;
  catchall: number;
  disposable_domain: number;
  role_based: number;
  unknown: number;
};

const PENDING_STATUS_ALIASES = new Set(["pending", "processing", "started", "queued", "running"]);

const STATUS_ALIASES: Record<string, VerificationStatusBucket> = {
  valid: "valid",
  exists: "valid",
  invalid: "invalid",
  not_exists: "invalid",
  invalid_syntax: "invalid",
  catchall: "catchall",
  "catch-all": "catchall",
  catch_all: "catchall",
  disposable_domain: "disposable_domain",
  "disposable-domain": "disposable_domain",
  disposable: "disposable_domain",
  disposable_domain_emails: "disposable_domain",
  role_based: "role_based",
  "role-based": "role_based",
  rolebased: "role_based",
  unknown: "unknown",
};

const METRIC_RECOGNIZED_KEYS = new Set<string>([
  "valid",
  "exists",
  "invalid",
  "not_exists",
  "invalid_syntax",
  "catchall",
  "catch_all",
  "catch-all",
  "disposable_domain",
  "disposable-domain",
  "disposable",
  "disposable_domain_emails",
  "role_based",
  "role-based",
  "rolebased",
  "unknown",
]);

const coerceCount = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return null;
};

const normalizedStatus = (status?: string | null): string => {
  if (typeof status !== "string") return "";
  return status.trim().toLowerCase();
};

const firstMetricCount = (metrics: Record<string, unknown>, keys: string[]): number => {
  for (const key of keys) {
    const count = coerceCount(metrics[key]);
    if (count !== null) {
      return count;
    }
  }
  return 0;
};

export const createEmptyVerificationStatusCounts = (): VerificationStatusCounts => ({
  valid: 0,
  invalid: 0,
  catchall: 0,
  disposable_domain: 0,
  role_based: 0,
  unknown: 0,
});

export const normalizeVerificationStatus = (status?: string | null): VerificationStatusBucket => {
  const normalized = normalizedStatus(status);
  if (!normalized) return "unknown";
  if (PENDING_STATUS_ALIASES.has(normalized)) return "pending";
  return STATUS_ALIASES[normalized] ?? "unknown";
};

export const resolveVerificationStatusBucket = ({
  status,
  isRoleBased,
  isDisposable,
}: {
  status?: string | null;
  isRoleBased?: boolean | null;
  isDisposable?: boolean | null;
}): VerificationStatusBucket => {
  const base = normalizeVerificationStatus(status);
  if (base === "pending") return "pending";
  if (isDisposable === true) return "disposable_domain";
  if (isRoleBased === true) return "role_based";
  return base;
};

export const deriveVerificationMetricCounts = (
  statusCounts?: Record<string, unknown> | null,
): { counts: VerificationStatusCounts; unknownKeys: string[] } | null => {
  if (!statusCounts || typeof statusCounts !== "object") return null;
  const normalized: Record<string, unknown> = {};
  Object.entries(statusCounts).forEach(([key, value]) => {
    const keyValue = key.trim().toLowerCase();
    if (!keyValue) return;
    normalized[keyValue] = value;
  });

  const counts = createEmptyVerificationStatusCounts();
  counts.valid = firstMetricCount(normalized, ["valid", "exists"]);
  counts.invalid =
    firstMetricCount(normalized, ["invalid"]) +
    firstMetricCount(normalized, ["not_exists"]) +
    firstMetricCount(normalized, ["invalid_syntax"]);
  counts.catchall = firstMetricCount(normalized, ["catchall", "catch_all", "catch-all"]);
  counts.disposable_domain = firstMetricCount(normalized, [
    "disposable_domain",
    "disposable-domain",
    "disposable",
    "disposable_domain_emails",
  ]);
  counts.role_based = firstMetricCount(normalized, ["role_based", "role-based", "rolebased"]);
  counts.unknown = firstMetricCount(normalized, ["unknown"]);

  const unknownKeys: string[] = [];
  Object.keys(normalized).forEach((key) => {
    if (!METRIC_RECOGNIZED_KEYS.has(key)) {
      unknownKeys.push(key);
    }
  });

  return { counts, unknownKeys };
};

export const sumVerificationStatusCounts = (counts: VerificationStatusCounts): number =>
  counts.valid +
  counts.invalid +
  counts.catchall +
  counts.disposable_domain +
  counts.role_based +
  counts.unknown;
