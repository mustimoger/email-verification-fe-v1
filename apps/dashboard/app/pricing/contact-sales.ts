import type { SalesContactRequestPayload } from "../lib/api-client";

export type SalesContactFallbackType = "crisp" | "scheduler" | "mailto";

export type SalesContactFallbackAction = {
  type: SalesContactFallbackType;
  targetUrl?: string;
};

type CrispWindow = Window & { $crisp?: unknown[] };

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

const toNormalizedUrl = (value: string | undefined | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

export const buildSalesContactIdempotencyKey = (payload: SalesContactRequestPayload): string => {
  const key = [
    payload.source.trim().toLowerCase(),
    payload.plan,
    String(payload.quantity),
    payload.contactRequired ? "1" : "0",
    payload.page.trim().toLowerCase(),
  ].join(":");
  return key.slice(0, MAX_IDEMPOTENCY_KEY_LENGTH);
};

export const resolveQuantityBucket = (quantity: number, minQuantity: number, maxQuantity: number): string => {
  if (!Number.isFinite(quantity) || !Number.isFinite(minQuantity) || !Number.isFinite(maxQuantity)) {
    return "unknown";
  }
  if (maxQuantity <= minQuantity) {
    return "default";
  }
  const normalized = Math.min(Math.max(quantity, minQuantity), maxQuantity);
  const ratio = (normalized - minQuantity) / (maxQuantity - minQuantity);
  if (ratio < 0.25) return "q1";
  if (ratio < 0.5) return "q2";
  if (ratio < 0.75) return "q3";
  return "q4";
};

export const buildSalesContactMailtoUrl = ({
  recipient,
  payload,
  requestId,
}: {
  recipient?: string | null;
  payload: SalesContactRequestPayload;
  requestId?: string | null;
}): string => {
  const to = recipient?.trim() ?? "";
  const subject = `Sales contact request (${payload.plan})`;
  const lines = [
    "Hello sales team,",
    "",
    `Plan: ${payload.plan}`,
    `Quantity: ${payload.quantity}`,
    `Page: ${payload.page}`,
    `Source: ${payload.source}`,
  ];
  if (requestId && requestId.trim()) {
    lines.push(`Reference: ${requestId.trim()}`);
  }
  lines.push("", "Please contact me with enterprise pricing details.");
  const params = new URLSearchParams({
    subject,
    body: lines.join("\n"),
  });
  return `mailto:${to}?${params.toString()}`;
};

export const resolveSalesContactFallbackAction = ({
  windowRef,
  schedulerUrl,
  mailtoRecipient,
  payload,
  requestId,
}: {
  windowRef: Window;
  schedulerUrl?: string | null;
  mailtoRecipient?: string | null;
  payload: SalesContactRequestPayload;
  requestId?: string | null;
}): SalesContactFallbackAction => {
  const crisp = (windowRef as CrispWindow).$crisp;
  if (Array.isArray(crisp)) {
    return { type: "crisp" };
  }

  const scheduler = toNormalizedUrl(schedulerUrl);
  if (scheduler) {
    return { type: "scheduler", targetUrl: scheduler };
  }

  return {
    type: "mailto",
    targetUrl: buildSalesContactMailtoUrl({
      recipient: mailtoRecipient,
      payload,
      requestId,
    }),
  };
};

export const executeSalesContactFallbackAction = (
  action: SalesContactFallbackAction,
  windowRef: Window,
): boolean => {
  if (action.type === "crisp") {
    const crisp = (windowRef as CrispWindow).$crisp;
    if (!Array.isArray(crisp)) {
      return false;
    }
    crisp.push(["do", "chat:open"]);
    crisp.push(["do", "chat:show"]);
    return true;
  }

  if (!action.targetUrl || typeof windowRef.open !== "function") {
    return false;
  }

  const target = action.type === "mailto" ? "_self" : "_blank";
  const openedWindow = windowRef.open(action.targetUrl, target, "noopener,noreferrer");
  return openedWindow !== null || action.type === "mailto";
};

export const describeFallbackAction = (action: SalesContactFallbackAction): string => {
  switch (action.type) {
    case "crisp":
      return "live chat";
    case "scheduler":
      return "scheduler";
    case "mailto":
      return "email client";
    default:
      return "contact channel";
  }
};
