import assert from "node:assert";

import { POST } from "../../src/app/api/newsletter/subscribe/route";

type FetchArgs = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

const ENV_KEYS = [
  "ACUMBAMAIL_API_BASE_URL",
  "ACUMBAMAIL_AUTH_TOKEN",
  "ACUMBAMAIL_LIST_ID",
  "ACUMBAMAIL_DOUBLE_OPTIN",
  "ACUMBAMAIL_UPDATE_SUBSCRIBER",
  "ACUMBAMAIL_COMPLETE_JSON",
  "ACUMBAMAIL_REQUEST_TIMEOUT_MS",
  "NEWSLETTER_RATE_LIMIT_WINDOW_SECONDS",
  "NEWSLETTER_RATE_LIMIT_MAX_PER_WINDOW",
] as const;

const snapshotEnv = () => {
  const snapshot: Record<string, string | undefined> = {};
  for (const key of ENV_KEYS) {
    snapshot[key] = process.env[key];
  }
  return snapshot;
};

const restoreEnv = (snapshot: Record<string, string | undefined>) => {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

const run = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    // eslint-disable-next-line no-console
    console.log(`✓ ${name}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`✗ ${name}`);
    throw error;
  }
};

const makeRequest = (body: object, headers?: Record<string, string>) =>
  new Request("http://localhost/api/newsletter/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });

const main = async () => {
  await run("POST /api/newsletter/subscribe returns 500 when env config is missing", async () => {
    const envSnapshot = snapshotEnv();
    try {
      delete process.env.ACUMBAMAIL_API_BASE_URL;
      delete process.env.ACUMBAMAIL_AUTH_TOKEN;
      delete process.env.ACUMBAMAIL_LIST_ID;

      const response = await POST(makeRequest({ email: "user@example.com" }) as any);
      assert.strictEqual(response.status, 500);

      const payload = (await response.json()) as { error: string; requestId: string };
      assert.strictEqual(payload.error, "Newsletter service is not configured.");
      assert.ok(payload.requestId);
    } finally {
      restoreEnv(envSnapshot);
    }
  });

  await run("POST /api/newsletter/subscribe returns 200 on success and calls Acumbamail", async () => {
    const envSnapshot = snapshotEnv();
    const originalFetch = global.fetch;
    const fetchCalls: FetchArgs[] = [];

    try {
      process.env.ACUMBAMAIL_API_BASE_URL = "https://acumbamail.com/api/1";
      process.env.ACUMBAMAIL_AUTH_TOKEN = "test-token";
      process.env.ACUMBAMAIL_LIST_ID = "1244763";

      global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls.push({ input, init });
        return new Response(JSON.stringify({ id: 987 }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof fetch;

      const response = await POST(makeRequest({ email: "user@example.com" }) as any);
      assert.strictEqual(response.status, 200);

      const payload = (await response.json()) as { status: string; requestId: string };
      assert.strictEqual(payload.status, "subscribed");
      assert.ok(payload.requestId);

      assert.strictEqual(fetchCalls.length, 1);
      assert.strictEqual(
        String(fetchCalls[0]?.input),
        "https://acumbamail.com/api/1/addSubscriber/",
      );

      const init = fetchCalls[0]?.init;
      assert.strictEqual(init?.method, "POST");

      const headers = new Headers(init?.headers as HeadersInit);
      assert.strictEqual(headers.get("Content-Type"), "application/x-www-form-urlencoded");

      const rawBody = init?.body;
      const encoded =
        rawBody instanceof URLSearchParams ? rawBody.toString() : String(rawBody ?? "");
      const params = new URLSearchParams(encoded);
      assert.strictEqual(params.get("auth_token"), "test-token");
      assert.strictEqual(params.get("list_id"), "1244763");
      assert.strictEqual(params.get("merge_fields[email]"), "user@example.com");
      assert.strictEqual(params.get("double_optin"), "0");
      assert.strictEqual(params.get("update_subscriber"), "1");
      assert.strictEqual(params.get("complete_json"), "1");
      assert.strictEqual(params.get("response_type"), "json");
    } finally {
      global.fetch = originalFetch;
      restoreEnv(envSnapshot);
    }
  });

  await run("POST /api/newsletter/subscribe treats honeypot as success and skips Acumbamail", async () => {
    const envSnapshot = snapshotEnv();
    const originalFetch = global.fetch;
    let called = false;

    try {
      process.env.ACUMBAMAIL_API_BASE_URL = "https://acumbamail.com/api/1";
      process.env.ACUMBAMAIL_AUTH_TOKEN = "test-token";
      process.env.ACUMBAMAIL_LIST_ID = "1244763";

      global.fetch = (async () => {
        called = true;
        throw new Error("should not be called");
      }) as typeof fetch;

      const response = await POST(
        makeRequest({ email: "user@example.com", hp: "bot" }) as any,
      );
      assert.strictEqual(response.status, 200);
      assert.strictEqual(called, false);
    } finally {
      global.fetch = originalFetch;
      restoreEnv(envSnapshot);
    }
  });

  await run("POST /api/newsletter/subscribe forwards upstream status and message", async () => {
    const envSnapshot = snapshotEnv();
    const originalFetch = global.fetch;

    try {
      process.env.ACUMBAMAIL_API_BASE_URL = "https://acumbamail.com/api/1";
      process.env.ACUMBAMAIL_AUTH_TOKEN = "test-token";
      process.env.ACUMBAMAIL_LIST_ID = "1244763";

      global.fetch = (async () =>
        new Response(
          JSON.stringify({
            error: {
              message: "List not found",
            },
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        )) as typeof fetch;

      const response = await POST(makeRequest({ email: "user@example.com" }) as any);
      assert.strictEqual(response.status, 400);

      const payload = (await response.json()) as { error: string; requestId: string };
      assert.strictEqual(payload.error, "List not found");
      assert.ok(payload.requestId);
    } finally {
      global.fetch = originalFetch;
      restoreEnv(envSnapshot);
    }
  });

  // eslint-disable-next-line no-console
  console.log("newsletter subscribe route tests completed");
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});

