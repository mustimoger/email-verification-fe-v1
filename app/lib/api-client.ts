type HttpMethod = "GET" | "POST" | "DELETE" | "PATCH";

import { getSupabaseBrowserClient } from "./supabase-browser";

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
  webhook_url?: string;
  status?: string;
  email_count?: number;
  valid_count?: number;
  invalid_count?: number;
  catchall_count?: number;
  integration?: string;
  created_at?: string;
  updated_at?: string;
};

export type TaskEmailJob = {
  id?: string;
  email_address?: string;
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
  upload_id?: string;
  uploaded_at?: string;
};

export type ApiKeySummary = {
  id?: string;
  name?: string;
  created_at?: string;
  is_active?: boolean;
  last_used_at?: string;
  integration?: string;
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
  key_id: string;
  name: string;
  created: boolean;
};

export type Profile = {
  user_id: string;
  email?: string;
  display_name?: string;
  created_at?: string;
  updated_at?: string;
};

export type Credits = {
  credits_remaining: number;
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
    integration?: string | null;
    created_at?: string | null;
  }[];
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
    const message = (data && (data as { detail?: string }).detail) || res.statusText;
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

export const apiClient = {
  verifyEmail: (email: string) => request<VerifyEmailResponse>("/verify", { method: "POST", body: { email } }),
  createTask: (emails: string[], webhook_url?: string) =>
    request<TaskResponse>("/tasks", { method: "POST", body: { emails, webhook_url } }),
  listTasks: (limit = 10, offset = 0, apiKeyId?: string) => {
    const params = new URLSearchParams({ limit: `${limit}`, offset: `${offset}` });
    if (apiKeyId) params.append("api_key_id", apiKeyId);
    return request<TaskListResponse>(`/tasks?${params.toString()}`, { method: "GET" });
  },
  getTask: (taskId: string, apiKeyId?: string) =>
    request<TaskDetailResponse>(
      `/tasks/${taskId}${apiKeyId ? `?api_key_id=${encodeURIComponent(apiKeyId)}` : ""}`,
      { method: "GET" },
    ),
  uploadTaskFiles: (files: File[], webhook_url?: string) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    if (webhook_url) form.append("webhook_url", webhook_url);
    return request<BatchFileUploadResponse[]>("/tasks/upload", { method: "POST", body: form, isForm: true });
  },
  getEmail: (address: string) => request(`/emails/${encodeURIComponent(address)}`, { method: "GET" }),
  listApiKeys: (includeInternal = false) =>
    request<ListApiKeysResponse>(`/api-keys${includeInternal ? "?include_internal=true" : ""}`, { method: "GET" }),
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
  getCredits: () => request<Credits>("/account/credits", { method: "GET" }),
  getUsage: (start?: string, end?: string, apiKeyId?: string) => {
    const params = new URLSearchParams();
    if (start) params.append("start", start);
    if (end) params.append("end", end);
    if (apiKeyId) params.append("api_key_id", apiKeyId);
    const qs = params.toString();
    return request<UsageResponse>(`/usage${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
  getOverview: () => request<OverviewResponse>("/overview", { method: "GET" }),
};

export type ApiClient = typeof apiClient;
