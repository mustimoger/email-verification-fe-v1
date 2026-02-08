"use client";

type RequestIdOptions = {
  forceNew?: boolean;
};

const requestIdCache = new Map<string, string>();

const normalizeEmailKey = (email: string) => email.trim().toLowerCase();

const generateRequestId = (): string => {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function") {
    return randomUUID.call(globalThis.crypto);
  }
  const error = new Error("crypto.randomUUID is required to create verify request_id");
  console.error("verify.request_id.unavailable", { error: error.message });
  throw error;
};

export const getVerifyRequestId = (email: string, options?: RequestIdOptions): string => {
  const key = normalizeEmailKey(email);
  if (!key) {
    const error = new Error("email is required to create verify request_id");
    console.error("verify.request_id.missing_email", { error: error.message });
    throw error;
  }
  if (options?.forceNew) {
    const next = generateRequestId();
    requestIdCache.set(key, next);
    return next;
  }
  const existing = requestIdCache.get(key);
  if (existing) return existing;
  const next = generateRequestId();
  requestIdCache.set(key, next);
  return next;
};

export const clearVerifyRequestId = (email: string): void => {
  const key = normalizeEmailKey(email);
  if (!key) return;
  requestIdCache.delete(key);
};
