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
  webhook_url?: string;
  status?: string;
  email_count?: number;
  valid_count?: number;
  invalid_count?: number;
  catchall_count?: number;
  job_status?: Record<string, number>;
  integration?: string;
  file_name?: string;
  created_at?: string;
  updated_at?: string;
};

export type TaskEmailJob = {
  id?: string;
  email?: {
    email_address?: string;
    status?: string;
  };
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
  created_at?: string;
  started_at?: string;
  finished_at?: string;
  updated_at?: string;
  jobs?: TaskEmailJob[];
  metrics?: {
    total_email_addresses?: number;
    verification_status?: Record<string, number>;
  };
};

export type TaskListResponse = {
  count?: number;
  limit?: number;
  offset?: number;
  tasks?: Task[];
};

export type BatchFileUploadResponse = {
  filename?: string;
  message?: string;
  status?: string;
  task_id?: string;
  upload_id?: string;
  uploaded_at?: string;
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

export type LatestManualResponse = {
  task_id: string;
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

export type BootstrapKeyResponse = {
  key_id?: string | null;
  name?: string;
  created?: boolean;
  skipped?: boolean;
  error?: unknown;
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
  credits_remaining: number;
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
  total: number;
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

export type IntegrationOption = {
  id: string;
  label: string;
  description: string;
  icon?: string | null;
  default_name?: string | null;
};

export type OverviewResponse = {
  profile: Profile;
  credits_remaining: number;
  usage_total: number;
  usage_series: { date: string; count: number }[];
  task_counts: Record<string, number>;
  recent_tasks: {
    task_id: string;
    status?: string | null;
    email_count?: number | null;
    valid_count?: number | null;
    invalid_count?: number | null;
    catchall_count?: number | null;
    job_status?: Record<string, number> | null;
    integration?: string | null;
    created_at?: string | null;
  }[];
  verification_totals?: {
    total?: number | null;
    valid?: number | null;
    invalid?: number | null;
    catchall?: number | null;
  } | null;
  current_plan?: {
    label?: string | null;
    plan_names: string[];
    price_ids: string[];
    purchased_at?: string | null;
  } | null;
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

const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!rawBase) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is required for API client");
}
const API_BASE = rawBase.replace(/\/$/, "");

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

export const apiClient = {
  verifyEmail: async (email: string, requestId?: string) => {
    const resolvedRequestId = requestId ?? getVerifyRequestId(email);
    const result = await request<VerifyEmailResponse>("/verify", {
      method: "POST",
      body: { email, request_id: resolvedRequestId },
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
  getLatestUpload: () => request<LatestUploadResponse | null>("/tasks/latest-upload", { method: "GET" }),
  getLatestUploads: (limit?: number) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append("limit", `${limit}`);
    const qs = params.toString();
    return request<LatestUploadResponse[] | null>(`/tasks/latest-uploads${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  getLatestManual: () => request<LatestManualResponse | null>("/tasks/latest-manual", { method: "GET" }),
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
  bootstrapDashboardKey: () =>
    request<BootstrapKeyResponse>("/api-keys/bootstrap", {
      method: "POST",
      suppressErrorLog: true,
      suppressThrow: true,
    }),
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
  getOverview: () => request<OverviewResponse>("/overview", { method: "GET" }),
  listIntegrations: () => request<IntegrationOption[]>("/integrations", { method: "GET" }),
  getLimits: () => request<LimitsResponse>("/limits", { method: "GET" }),
  downloadTaskResults: (taskId: string, fallbackFileName: string) =>
    downloadFile(`/tasks/${encodeURIComponent(taskId)}/download`, fallbackFileName),
  requireConfirmedEmail: () =>
    request<ConfirmedEmailResponse>("/auth/confirmed", {
      method: "GET",
      suppressErrorLog: true,
    }),
};

export type ApiClient = typeof apiClient;

export const billingApi = {
  listPlans: () => request<PlansResponse>("/billing/plans", { method: "GET" }),
  createTransaction: (payload: { price_id: string; quantity?: number; custom_data?: Record<string, unknown> }) =>
    request<CreateTransactionResponse>("/billing/transactions", { method: "POST", body: payload }),
};
