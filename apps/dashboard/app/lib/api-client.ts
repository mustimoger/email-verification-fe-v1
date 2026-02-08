type HttpMethod = "GET" | "POST" | "DELETE" | "PATCH";

import { getSupabaseBrowserClient } from "./supabase-browser";
import { clearVerifyRequestId, getVerifyRequestId } from "./verify-idempotency";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export type VerificationStep = {
  id?: string;
  email_id?: string;
  step?: string;
  status?: string;
  error_message?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  updated_at?: string;
};

export type VerifyEmailResponse = {
  email?: string;
  is_role_based?: boolean;
  message?: string;
  status?: string;
  validated_at?: string;
  verification_steps?: VerificationStep[];
};

export type ManualVerificationResult = {
  email: string;
  status?: string;
  message?: string;
  validated_at?: string;
  is_role_based?: boolean;
  catchall_domain?: boolean;
  email_server?: string;
  disposable_domain?: boolean;
  registered_domain?: boolean;
  mx_record?: string;
};

export type TaskMetrics = {
  job_status?: Record<string, number>;
  last_verification_completed_at?: string;
  last_verification_requested_at?: string;
  progress?: number;
  progress_percent?: number;
  total_email_addresses?: number;
  verification_status?: Record<string, number>;
};

export type TaskFileMetadata = {
  upload_id?: string;
  task_id?: string;
  filename?: string;
  email_count?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

export type TaskResponse = {
  id?: string;
  email_count?: number;
  domain_count?: number;
  user_id?: string;
  webhook_url?: string;
  created_at?: string;
};

export type Task = {
  id?: string;
  user_id?: string;
  api_key_id?: string;
  api_key_preview?: string;
  api_key?: string;
  webhook_url?: string;
  status?: string;
  source?: string;
  is_file_backed?: boolean;
  file?: TaskFileMetadata | null;
  email_count?: number;
  valid_count?: number;
  invalid_count?: number;
  catchall_count?: number;
  job_status?: Record<string, number>;
  metrics?: TaskMetrics;
  integration?: string;
  file_name?: string;
  created_at?: string;
  updated_at?: string;
};

export type TaskJobEmail = {
  id?: string;
  email?: string;
  email_address?: string;
  status?: string;
  is_role_based?: boolean;
  is_disposable?: boolean;
  has_mx_records?: boolean;
  has_reverse_dns?: boolean;
  domain_name?: string;
  host_name?: string;
  server_type?: string;
  is_catchall?: boolean;
  validated_at?: string;
  unknown_reason?: string | null;
  needs_physical_verify?: boolean;
};

export type TaskEmailJob = {
  id?: string;
  email?: TaskJobEmail;
  email_address?: string;
  email_id?: string;
  status?: string;
  task_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type TaskDetailResponse = {
  id?: string;
  user_id?: string;
  api_key_id?: string;
  api_key_preview?: string;
  api_key?: string;
  file_name?: string;
  source?: string;
  is_file_backed?: boolean;
  file?: TaskFileMetadata | null;
  created_at?: string;
  started_at?: string;
  finished_at?: string;
  updated_at?: string;
  jobs?: TaskEmailJob[];
  metrics?: TaskMetrics;
};

export type TaskListResponse = {
  count?: number;
  limit?: number;
  offset?: number;
  tasks?: Task[];
};

export type TaskJobsResponse = {
  jobs?: TaskEmailJob[];
  count?: number;
  limit?: number;
  offset?: number;
};

export type BatchFileUploadResponse = {
  filename?: string;
  message?: string;
  status?: string;
  task_id?: string;
  upload_id?: string;
  uploaded_at?: string;
  email_count?: number;
};

export type LatestUploadResponse = {
  task_id: string;
  file_name: string;
  created_at?: string;
  status?: string;
  email_count?: number;
  valid_count?: number;
  invalid_count?: number;
  catchall_count?: number;
  job_status?: Record<string, number>;
};

export type UploadFileMetadata = {
  file_name: string;
  email_column: string;
  first_row_has_labels: boolean;
  remove_duplicates: boolean;
};

export type LimitsResponse = {
  manual_max_emails: number;
  upload_max_mb: number;
};

export type ApiKeySummary = {
  id?: string;
  name?: string;
  created_at?: string;
  is_active?: boolean;
  last_used_at?: string;
  purpose?: string;
  total_requests?: number;
  integration?: string;
  key_preview?: string;
  key?: string;
};

export type ListApiKeysResponse = {
  count?: number;
  keys?: ApiKeySummary[];
};

export type CreateApiKeyResponse = {
  id?: string;
  name?: string;
  key?: string;
  user_id?: string;
  created_at?: string;
  integration?: string;
};

export type RevokeApiKeyResponse = {
  message?: string;
};

export type Profile = {
  user_id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
};

export type Credits = {
  credits_remaining: number | null;
};

export type Purchase = {
  transaction_id: string;
  event_id?: string;
  event_type: string;
  price_ids?: string[];
  credits_granted: number;
  amount?: number;
  currency?: string;
  checkout_email?: string;
  invoice_id?: string;
  invoice_number?: string;
  purchased_at?: string;
  created_at?: string;
};

export type PurchaseListResponse = {
  items: Purchase[];
};

export type UsageEntry = {
  id: string;
  user_id: string;
  api_key_id?: string;
  path?: string;
  count: number;
  period_start?: string;
  period_end?: string;
  created_at?: string;
};

export type UsageResponse = {
  items: UsageEntry[];
};

export type UsageSummaryPoint = {
  date: string;
  count: number;
};

export type UsagePurposeSeriesPoint = {
  date?: string;
  total_requests?: number;
  requests_by_purpose?: Record<string, number>;
};

export type UsageSummaryResponse = {
  source: string;
  total: number | null;
  series: UsageSummaryPoint[];
  api_key_id?: string | null;
};

export type UsagePurposeResponse = {
  api_keys_by_purpose?: Record<string, number>;
  last_used_at?: string;
  requests_by_purpose?: Record<string, number>;
  series?: UsagePurposeSeriesPoint[];
  total_api_keys?: number;
  total_requests?: number;
  user_id?: string;
};

export type ApiKeyUsageSeriesPoint = {
  date?: string;
  usage_count?: number;
};

export type ApiKeyUsageResponse = {
  id?: string;
  name?: string;
  created_at?: string;
  is_active?: boolean;
  last_used_at?: string;
  purpose?: string;
  usage_count?: number;
  series?: ApiKeyUsageSeriesPoint[];
};

export type ExternalCreditBalanceResponse = {
  user_id?: string;
  balance?: number | null;
};

export type VerificationMetricsSeriesPoint = {
  date?: string;
  total_verifications?: number;
  total_tasks?: number;
  unique_email_addresses?: number;
  job_status?: Record<string, number>;
  verification_status?: Record<string, number>;
  total_catchall?: number;
  total_role_based?: number;
  total_disposable_domain_emails?: number;
};

export type VerificationMetricsResponse = {
  job_status?: Record<string, number>;
  last_verification_completed_at?: string;
  last_verification_requested_at?: string;
  total_catchall?: number;
  total_disposable_domain_emails?: number;
  total_role_based?: number;
  total_tasks?: number;
  total_verifications?: number;
  unique_email_addresses?: number;
  user_id?: string;
  verification_status?: Record<string, number>;
  series?: VerificationMetricsSeriesPoint[];
};

export type IntegrationOption = {
  id: string;
  label: string;
  description: string;
  icon?: string | null;
  default_name?: string | null;
  external_purpose?: string | null;
};

export type PlanPrice = {
  price_id: string;
  metadata?: Record<string, unknown>;
  quantity?: number;
  amount?: number;
  currency_code?: string;
};

export type Plan = {
  name: string;
  product_id: string;
  metadata?: Record<string, unknown>;
  prices: Record<string, PlanPrice>;
};

export type PlansResponse = {
  status: string;
  checkout_enabled: boolean;
  checkout_script?: string | null;
  client_side_token?: string | null;
  seller_id?: string | null;
  plans: Plan[];
};

export type PricingModeV2 = "payg" | "subscription";
export type PricingIntervalV2 = "one_time" | "month" | "year";

export type PricingConfigV2 = {
  currency: string;
  min_volume: number;
  max_volume: number;
  step_size: number;
  free_trial_credits?: number | null;
  rounding_rule?: string | null;
  metadata?: Record<string, unknown>;
};

export type PricingConfigV2Response = {
  status: string;
  checkout_enabled: boolean;
  checkout_script?: string | null;
  client_side_token?: string | null;
  seller_id?: string | null;
  pricing: PricingConfigV2;
};

export type PricingTierV2 = {
  mode: PricingModeV2;
  interval: PricingIntervalV2;
  min_quantity: number;
  max_quantity?: number | null;
  unit_amount: string;
  currency: string;
  credits_per_unit: number;
  paddle_price_id: string;
};

export type PricingQuoteV2Response = {
  quantity: number;
  units: number;
  mode: PricingModeV2;
  interval: PricingIntervalV2;
  currency: string;
  unit_amount: string;
  raw_total: string;
  rounded_total: string;
  paddle_total: string;
  rounding_adjustment: string;
  rounding_adjustment_cents: number;
  tier: PricingTierV2;
};

export type CreateTransactionResponse = {
  id: string;
  status?: string;
  customer_id?: string;
  address_id?: string;
  created_at?: string;
};

export type ConfirmedEmailResponse = {
  confirmed: boolean;
};

export type SignupBonusResponse = {
  status: string;
  credits_granted?: number | null;
};

export type TrialBonusResponse = SignupBonusResponse;

const trimTrailingSlash = (value: string) => (value.endsWith("/") ? value.slice(0, -1) : value);

const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!rawBase) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is required for API client");
}
const API_BASE = trimTrailingSlash(rawBase);

const rawExternalBase = process.env.NEXT_PUBLIC_EMAIL_API_BASE_URL;
const EXTERNAL_API_BASE = rawExternalBase ? trimTrailingSlash(rawExternalBase) : null;

async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("auth.get_session_failed", error);
      return null;
    }
    return data.session?.access_token ?? null;
  } catch (err) {
    console.error("auth.token_lookup_error", err);
    return null;
  }
}

async function request<T>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
    isForm?: boolean;
    suppressErrorLog?: boolean;
    suppressThrow?: boolean;
  } = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    isForm = false,
    suppressErrorLog = false,
    suppressThrow = false,
  } = options;
  const url = `${API_BASE}${path}`;
  const finalHeaders: Record<string, string> = { ...headers };
  let payload: BodyInit | undefined;

  if (body !== undefined && body !== null) {
    if (isForm) {
      payload = body as BodyInit;
    } else {
      finalHeaders["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  const token = await getAccessToken();
  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: payload,
    credentials: "include",
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // leave data as raw text
      data = text;
    }
  }

  if (!res.ok) {
    const detail = (data as { detail?: unknown })?.detail;
    const message = typeof detail === "string" && detail.trim().length > 0 ? detail : res.statusText;
    if (!suppressErrorLog) {
      console.error("api.request_failed", { path, status: res.status, message, details: data });
    }
    if (suppressThrow) {
      return data as T;
    }
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

const extractErrorMessage = (data: unknown, fallback: string) => {
  if (!data || typeof data !== "object") return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail;
  }
  const errorMessage = (data as { error?: { message?: unknown } }).error?.message;
  if (typeof errorMessage === "string" && errorMessage.trim().length > 0) {
    return errorMessage;
  }
  return fallback;
};

const getExternalApiBase = () => {
  if (!EXTERNAL_API_BASE) {
    console.error("external_api_base_missing", { env: "NEXT_PUBLIC_EMAIL_API_BASE_URL" });
    throw new ApiError(500, "External API base URL is not configured.");
  }
  return EXTERNAL_API_BASE;
};

async function externalRequest<T>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
    isForm?: boolean;
    suppressErrorLog?: boolean;
    suppressThrow?: boolean;
  } = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    isForm = false,
    suppressErrorLog = false,
    suppressThrow = false,
  } = options;
  const url = `${getExternalApiBase()}${path}`;
  const finalHeaders: Record<string, string> = { ...headers };
  let payload: BodyInit | undefined;

  if (body !== undefined && body !== null) {
    if (isForm) {
      payload = body as BodyInit;
    } else {
      finalHeaders["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  const token = await getAccessToken();
  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: payload,
    credentials: "omit",
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message = extractErrorMessage(data, res.statusText);
    if (!suppressErrorLog) {
      console.error("external_api.request_failed", { path, status: res.status, message, details: data });
    }
    if (suppressThrow) {
      return data as T;
    }
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

const extractFilename = (value: string | null): string | null => {
  if (!value) return null;
  const parts = value.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.toLowerCase().startsWith("filename="));
  if (!match) return null;
  const raw = match.split("=").slice(1).join("=").trim();
  if (!raw) return null;
  if (raw.startsWith("\"") && raw.endsWith("\"")) {
    return raw.slice(1, -1);
  }
  return raw;
};

const downloadFile = async (path: string, fallbackFileName: string) => {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {};
  const token = await getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    const detail = (data as { detail?: unknown })?.detail;
    const message = typeof detail === "string" && detail.trim().length > 0 ? detail : res.statusText;
    console.error("api.download_failed", { path, status: res.status, message, details: data });
    throw new ApiError(res.status, message, data);
  }
  const blob = await res.blob();
  const resolvedName = extractFilename(res.headers.get("content-disposition")) || fallbackFileName;
  return { blob, fileName: resolvedName };
};

const downloadExternalFile = async (path: string, fallbackFileName: string) => {
  const url = `${getExternalApiBase()}${path}`;
  const headers: Record<string, string> = {};
  const token = await getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method: "GET",
    headers,
    credentials: "omit",
  });
  if (!res.ok) {
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    const message = extractErrorMessage(data, res.statusText);
    console.error("external_api.download_failed", { path, status: res.status, message, details: data });
    throw new ApiError(res.status, message, data);
  }
  const blob = await res.blob();
  const resolvedName = extractFilename(res.headers.get("content-disposition")) || fallbackFileName;
  return { blob, fileName: resolvedName };
};

type VerifyEmailOptions = {
  requestId?: string;
  batchId?: string;
  batchEmails?: string[];
};

export const apiClient = {
  verifyEmail: async (email: string, options?: string | VerifyEmailOptions) => {
    const requestId = typeof options === "string" ? options : options?.requestId;
    const resolvedRequestId = requestId ?? getVerifyRequestId(email);
    const payload: Record<string, unknown> = { email, request_id: resolvedRequestId };
    if (options && typeof options === "object") {
      if (options.batchId) payload.batch_id = options.batchId;
      if (options.batchEmails) payload.batch_emails = options.batchEmails;
    }
    const result = await request<VerifyEmailResponse>("/verify", {
      method: "POST",
      body: payload,
    });
    if (!requestId) {
      clearVerifyRequestId(email);
    }
    return result;
  },
  createTask: (emails: string[], webhook_url?: string) =>
    request<TaskResponse>("/tasks", { method: "POST", body: { emails, webhook_url } }),
  listTasks: (limit = 10, offset = 0, apiKeyId?: string, refresh?: boolean) => {
    const params = new URLSearchParams({ limit: `${limit}`, offset: `${offset}` });
    if (apiKeyId) params.append("api_key_id", apiKeyId);
    if (refresh) params.append("refresh", "true");
    return request<TaskListResponse>(`/tasks?${params.toString()}`, { method: "GET" });
  },
  getTask: (taskId: string, apiKeyId?: string) =>
    request<TaskDetailResponse>(
      `/tasks/${taskId}${apiKeyId ? `?api_key_id=${encodeURIComponent(apiKeyId)}` : ""}`,
      { method: "GET" },
    ),
  getTaskJobs: (taskId: string, limit = 10, offset = 0) => {
    const params = new URLSearchParams({ limit: `${limit}`, offset: `${offset}` });
    return request<TaskJobsResponse>(`/tasks/${taskId}/jobs?${params.toString()}`, { method: "GET" });
  },
  getLatestUpload: () => request<LatestUploadResponse | null>("/tasks/latest-upload", { method: "GET" }),
  getLatestUploads: (limit?: number) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append("limit", `${limit}`);
    const qs = params.toString();
    return request<LatestUploadResponse[] | null>(`/tasks/latest-uploads${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  uploadTaskFiles: (files: File[], metadata: UploadFileMetadata[], webhook_url?: string) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    form.append("file_metadata", JSON.stringify(metadata));
    if (webhook_url) form.append("webhook_url", webhook_url);
    return request<BatchFileUploadResponse[]>("/tasks/upload", { method: "POST", body: form, isForm: true });
  },
  getEmail: (address: string) => request(`/emails/${encodeURIComponent(address)}`, { method: "GET" }),
  listApiKeys: (includeInternal = false, start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (includeInternal) params.append("include_internal", "true");
    if (start) params.append("from", start);
    if (end) params.append("to", end);
    const qs = params.toString();
    return request<ListApiKeysResponse>(`/api-keys${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  createApiKey: (name: string, integration: string) =>
    request<CreateApiKeyResponse>("/api-keys", { method: "POST", body: { name, integration } }),
  revokeApiKey: (id: string) => request<RevokeApiKeyResponse>(`/api-keys/${id}`, { method: "DELETE" }),
  getProfile: () => request<Profile>("/account/profile", { method: "GET" }),
  updateProfile: (payload: Partial<Profile>) => request<Profile>("/account/profile", { method: "PATCH", body: payload }),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Profile>("/account/avatar", { method: "POST", body: form, isForm: true });
  },
  getCredits: () => request<Credits>("/account/credits", { method: "GET" }),
  getPurchases: (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append("limit", `${limit}`);
    if (offset !== undefined) params.append("offset", `${offset}`);
    const qs = params.toString();
    return request<PurchaseListResponse>(`/account/purchases${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  getUsage: (start?: string, end?: string, apiKeyId?: string) => {
    const params = new URLSearchParams();
    if (start) params.append("start", start);
    if (end) params.append("end", end);
    if (apiKeyId) params.append("api_key_id", apiKeyId);
    const qs = params.toString();
    return request<UsageResponse>(`/usage${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  getUsageSummary: (start?: string, end?: string, apiKeyId?: string) => {
    const params = new URLSearchParams();
    if (start) params.append("start", start);
    if (end) params.append("end", end);
    if (apiKeyId) params.append("api_key_id", apiKeyId);
    const qs = params.toString();
    return request<UsageSummaryResponse>(`/usage/summary${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  getUsagePurpose: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append("from", start);
    if (end) params.append("to", end);
    const qs = params.toString();
    return request<UsagePurposeResponse>(`/usage/purpose${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  listIntegrations: () => request<IntegrationOption[]>("/integrations", { method: "GET" }),
  getLimits: () => request<LimitsResponse>("/limits", { method: "GET" }),
  downloadTaskResults: (taskId: string, fallbackFileName: string) =>
    downloadFile(`/tasks/${encodeURIComponent(taskId)}/download`, fallbackFileName),
  requireConfirmedEmail: () =>
    request<ConfirmedEmailResponse>("/auth/confirmed", {
      method: "GET",
      suppressErrorLog: true,
    }),
  claimSignupBonus: () =>
    request<SignupBonusResponse>("/credits/signup-bonus", {
      method: "POST",
      suppressErrorLog: true,
    }),
  claimTrialBonus: () =>
    request<TrialBonusResponse>("/credits/trial-bonus", {
      method: "POST",
      suppressErrorLog: true,
    }),
};

export type ApiClient = typeof apiClient;

export const externalApiClient = {
  listApiKeys: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append("from", start);
    if (end) params.append("to", end);
    const qs = params.toString();
    return externalRequest<ListApiKeysResponse>(`/api-keys${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  createApiKey: (name: string, purpose: string) =>
    externalRequest<CreateApiKeyResponse>("/api-keys", { method: "POST", body: { name, purpose } }),
  revokeApiKey: (id: string) =>
    externalRequest<RevokeApiKeyResponse>(`/api-keys/${encodeURIComponent(id)}`, { method: "DELETE" }),
  getApiUsageMetrics: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append("from", start);
    if (end) params.append("to", end);
    const qs = params.toString();
    return externalRequest<UsagePurposeResponse>(`/api-keys/usage${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  getApiKeyUsage: (apiKeyId: string, start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append("from", start);
    if (end) params.append("to", end);
    const qs = params.toString();
    return externalRequest<ApiKeyUsageResponse>(
      `/api-keys/${encodeURIComponent(apiKeyId)}/usage${qs ? `?${qs}` : ""}`,
      { method: "GET" },
    );
  },
  getCreditBalance: () => externalRequest<ExternalCreditBalanceResponse>("/credits/balance", { method: "GET" }),
  getVerificationMetrics: (params?: { from?: string; to?: string }) => {
    const search = new URLSearchParams();
    if (params?.from) search.append("from", params.from);
    if (params?.to) search.append("to", params.to);
    const qs = search.toString();
    return externalRequest<VerificationMetricsResponse>(`/metrics/verifications${qs ? `?${qs}` : ""}`, {
      method: "GET",
    });
  },
  listTasks: (limit = 10, offset = 0, isFileBacked?: boolean) => {
    const params = new URLSearchParams({ limit: `${limit}`, offset: `${offset}` });
    if (typeof isFileBacked === "boolean") {
      params.append("is_file_backed", isFileBacked ? "true" : "false");
    }
    return externalRequest<TaskListResponse>(`/tasks?${params.toString()}`, { method: "GET" });
  },
  createTask: (emails: string[], webhook_url?: string) =>
    externalRequest<TaskResponse>("/tasks", { method: "POST", body: { emails, webhook_url } }),
  getTaskJobs: (taskId: string, limit = 10, offset = 0) => {
    const params = new URLSearchParams({ limit: `${limit}`, offset: `${offset}` });
    return externalRequest<TaskJobsResponse>(`/tasks/${encodeURIComponent(taskId)}/jobs?${params.toString()}`, {
      method: "GET",
    });
  },
  getTaskDetail: (taskId: string) =>
    externalRequest<TaskDetailResponse>(`/tasks/${encodeURIComponent(taskId)}`, { method: "GET" }),
  uploadBatchFile: (file: File, options?: { webhookUrl?: string; emailColumn?: string }) => {
    const form = new FormData();
    form.append("file", file);
    if (options?.webhookUrl) {
      form.append("webhook_url", options.webhookUrl);
    }
    if (options?.emailColumn) {
      form.append("email_column", options.emailColumn);
    }
    return externalRequest<BatchFileUploadResponse>("/tasks/batch/upload", {
      method: "POST",
      body: form,
      isForm: true,
    });
  },
  downloadTaskResults: (taskId: string, fallbackFileName: string) =>
    downloadExternalFile(`/tasks/${encodeURIComponent(taskId)}/download`, fallbackFileName),
};

export const billingApi = {
  listPlans: () => request<PlansResponse>("/billing/plans", { method: "GET" }),
  createTransaction: (payload: { price_id: string; quantity?: number; custom_data?: Record<string, unknown> }) =>
    request<CreateTransactionResponse>("/billing/transactions", { method: "POST", body: payload }),
  getPricingConfigV2: () => request<PricingConfigV2Response>("/billing/v2/config", { method: "GET" }),
  getQuoteV2: (payload: { quantity: number; mode: PricingModeV2; interval: PricingIntervalV2 }) =>
    request<PricingQuoteV2Response>("/billing/v2/quote", { method: "POST", body: payload }),
  createTransactionV2: (payload: {
    quantity: number;
    mode: PricingModeV2;
    interval: PricingIntervalV2;
    price_id?: string;
    custom_data?: Record<string, unknown>;
  }) => request<CreateTransactionResponse>("/billing/v2/transactions", { method: "POST", body: payload }),
};
