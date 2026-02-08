const NEXT_PARAM_KEY = "next";

export const getNextParamKey = () => NEXT_PARAM_KEY;

export const sanitizeNextPath = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/")) {
    console.warn("auth.next_path_invalid", { value: trimmed, reason: "missing_leading_slash" });
    return null;
  }
  if (trimmed.startsWith("//")) {
    console.warn("auth.next_path_invalid", { value: trimmed, reason: "protocol_relative" });
    return null;
  }
  return trimmed;
};

export const resolveNextPath = (params: Pick<URLSearchParams, "get">, fallback: string): string => {
  const raw = params.get(NEXT_PARAM_KEY);
  const sanitized = sanitizeNextPath(raw);
  if (!sanitized) {
    if (raw) {
      console.warn("auth.next_path_rejected", { value: raw });
    }
    return fallback;
  }
  return sanitized;
};

export const buildNextQuery = (value?: string | null): string => {
  const sanitized = sanitizeNextPath(value);
  if (!sanitized) return "";
  const params = new URLSearchParams({ [NEXT_PARAM_KEY]: sanitized });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};
