export type AcumbamailConfig = {
  endpoint: URL;
  authToken: string;
  listId: number;
  doubleOptIn: 0 | 1;
  updateSubscriber: 0 | 1;
  completeJson: 0 | 1;
  timeoutMs: number;
};

export type AcumbamailSubscribeSuccess = {
  ok: true;
  subscriberId: number | null;
  payload: unknown;
};

export type AcumbamailSubscribeFailure = {
  ok: false;
  statusCode: number;
  error: string;
  payload: unknown;
};

export type AcumbamailSubscribeResult = AcumbamailSubscribeSuccess | AcumbamailSubscribeFailure;

const DEFAULT_TIMEOUT_MS = 15_000;
const ADD_SUBSCRIBER_PATH = "addSubscriber/";

const toInt = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const toFlag = (value: string | undefined): 0 | 1 | null => {
  if (value === undefined) return null;
  const normalized = value.trim();
  if (normalized === "0") return 0;
  if (normalized === "1") return 1;
  return null;
};

function normalizeBaseUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (!url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}/`;
    }
    return url;
  } catch {
    return null;
  }
}

export function getAcumbamailConfig(): AcumbamailConfig | null {
  const baseUrlRaw = process.env.ACUMBAMAIL_API_BASE_URL;
  const authToken = process.env.ACUMBAMAIL_AUTH_TOKEN;
  const listIdRaw = process.env.ACUMBAMAIL_LIST_ID;

  if (!baseUrlRaw || !authToken || !listIdRaw) {
    return null;
  }

  const baseUrl = normalizeBaseUrl(baseUrlRaw);
  if (!baseUrl) {
    return null;
  }

  const listId = toInt(listIdRaw);
  if (!listId || listId <= 0) {
    return null;
  }

  const endpoint = new URL(ADD_SUBSCRIBER_PATH, baseUrl);

  const doubleOptIn = toFlag(process.env.ACUMBAMAIL_DOUBLE_OPTIN) ?? 0;
  const updateSubscriber = toFlag(process.env.ACUMBAMAIL_UPDATE_SUBSCRIBER) ?? 1;
  const completeJson = toFlag(process.env.ACUMBAMAIL_COMPLETE_JSON) ?? 1;
  const timeoutMs = toInt(process.env.ACUMBAMAIL_REQUEST_TIMEOUT_MS) ?? DEFAULT_TIMEOUT_MS;

  return {
    endpoint,
    authToken,
    listId,
    doubleOptIn,
    updateSubscriber,
    completeJson,
    timeoutMs,
  };
}

export function buildAddSubscriberBody(config: AcumbamailConfig, email: string): URLSearchParams {
  const body = new URLSearchParams();
  body.set("auth_token", config.authToken);
  body.set("list_id", String(config.listId));
  body.set("merge_fields[email]", email);
  body.set("double_optin", String(config.doubleOptIn));
  body.set("update_subscriber", String(config.updateSubscriber));
  body.set("complete_json", String(config.completeJson));
  body.set("response_type", "json");
  return body;
}

function coerceSubscriberId(payload: unknown): number | null {
  if (typeof payload === "number" && Number.isFinite(payload)) {
    return payload;
  }

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    return null;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const id = record.id;
    if (typeof id === "number" && Number.isFinite(id)) {
      return id;
    }
  }

  return null;
}

export function resolveErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const message = record.message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }

    const errorField = record.error;
    if (typeof errorField === "string" && errorField.trim().length > 0) {
      return errorField;
    }

    if (errorField && typeof errorField === "object") {
      const nested = errorField as Record<string, unknown>;
      const nestedMessage = nested.message;
      if (typeof nestedMessage === "string" && nestedMessage.trim().length > 0) {
        return nestedMessage;
      }
    }
  }

  return fallback;
}

export async function addSubscriber(
  config: AcumbamailConfig,
  email: string,
): Promise<AcumbamailSubscribeResult> {
  const body = buildAddSubscriberBody(config, email);

  let response: Response;
  try {
    response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(config.timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    return {
      ok: false,
      statusCode: 502,
      error: "Unable to subscribe right now. Please try again.",
      payload: error instanceof Error ? error.message : String(error),
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const fallbackMessage =
      response.status === 401 || response.status === 403
        ? "Newsletter service is not authorized."
        : response.status === 429
          ? "Too many requests. Please wait and try again."
          : "Subscription request failed.";

    return {
      ok: false,
      statusCode: response.status,
      error: resolveErrorMessage(payload, fallbackMessage),
      payload,
    };
  }

  return {
    ok: true,
    subscriberId: coerceSubscriberId(payload),
    payload,
  };
}

