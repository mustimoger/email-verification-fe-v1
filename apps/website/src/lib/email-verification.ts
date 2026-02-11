export type ExternalVerificationStatus =
  | "valid"
  | "invalid"
  | "catchall"
  | "invalid_syntax"
  | "disposable_domain"
  | "role_based"
  | "unknown";

export type PopupVerificationStatus =
  | "valid"
  | "invalid"
  | "catchall"
  | "invalid_syntax"
  | "disposable_domain"
  | "role_based"
  | "unknown";

export type ExternalVerificationResponse = {
  id?: string;
  email?: string;
  status?: string;
  is_role_based?: boolean;
  is_disposable?: boolean;
  has_mx_records?: boolean;
  has_reverse_dns?: boolean;
  domain_name?: string;
  host_name?: string;
  server_type?: string;
  is_catchall?: boolean;
  message?: string;
  unknown_reason?: string;
  needs_physical_verify?: boolean;
  validated_at?: string;
  did_you_mean?: string;
};

export type PopupVerificationResult = {
  id?: string;
  email: string;
  status: PopupVerificationStatus;
  syntax_valid?: boolean;
  mx_found?: boolean;
  domain?: string;
  is_role?: boolean;
  is_disposable?: boolean;
  is_catchall?: boolean;
  is_free?: boolean;
  did_you_mean?: string;
  message?: string;
  unknown_reason?: string;
  validated_at?: string;
};

const STATUS_ALIASES: Record<string, PopupVerificationStatus> = {
  valid: "valid",
  invalid: "invalid",
  catchall: "catchall",
  "catch-all": "catchall",
  invalid_syntax: "invalid_syntax",
  "invalid-syntax": "invalid_syntax",
  disposable_domain: "disposable_domain",
  disposable: "disposable_domain",
  role_based: "role_based",
  "role-based": "role_based",
  unknown: "unknown",
};

function normalizeStatus(value: unknown): PopupVerificationStatus {
  if (typeof value !== "string") {
    return "unknown";
  }
  const normalized = STATUS_ALIASES[value.trim().toLowerCase()];
  return normalized ?? "unknown";
}

function extractDomain(email: string): string | undefined {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) {
    return undefined;
  }
  return email.slice(at + 1);
}

export function normalizeVerificationResult(
  raw: ExternalVerificationResponse,
  requestedEmail: string,
): PopupVerificationResult {
  const resultEmail =
    typeof raw.email === "string" && raw.email.trim().length > 0
      ? raw.email.trim()
      : requestedEmail;

  const normalizedStatus = normalizeStatus(raw.status);

  let popupStatus = normalizedStatus;
  if (popupStatus === "valid") {
    if (raw.is_disposable) {
      popupStatus = "disposable_domain";
    } else if (raw.is_role_based) {
      popupStatus = "role_based";
    } else if (raw.is_catchall) {
      popupStatus = "catchall";
    }
  }

  const syntaxValid = popupStatus === "invalid_syntax" ? false : undefined;

  return {
    id: raw.id,
    email: resultEmail,
    status: popupStatus,
    syntax_valid: syntaxValid,
    mx_found: raw.has_mx_records,
    domain: raw.domain_name ?? extractDomain(resultEmail),
    is_role: raw.is_role_based,
    is_disposable: raw.is_disposable,
    is_catchall: raw.is_catchall,
    did_you_mean:
      typeof raw.did_you_mean === "string" && raw.did_you_mean.trim().length > 0
        ? raw.did_you_mean.trim()
        : undefined,
    message: raw.message,
    unknown_reason: raw.unknown_reason,
    validated_at: raw.validated_at,
  };
}
