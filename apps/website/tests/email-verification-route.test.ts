import assert from "node:assert";

import { POST } from "../src/app/api/email-verification/route";

type FetchArgs = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

const ENV_KEYS = [
  "BOLTROUTE_VERIFY_API_BASE_URL",
  "BOLTROUTE_VERIFY_API_KEY",
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

const makeRequest = (body: object) =>
  new Request("http://localhost/api/email-verification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

const main = async () => {
  await run("POST /api/email-verification returns 500 when env config is missing", async () => {
    const envSnapshot = snapshotEnv();
    try {
      delete process.env.BOLTROUTE_VERIFY_API_BASE_URL;
      delete process.env.BOLTROUTE_VERIFY_API_KEY;

      const response = await POST(makeRequest({ email: "user@example.com" }) as any);
      assert.strictEqual(response.status, 500);

      const payload = (await response.json()) as { error: string };
      assert.strictEqual(payload.error, "Email verification service is not configured.");
    } finally {
      restoreEnv(envSnapshot);
    }
  });

  await run("POST /api/email-verification returns normalized success payload", async () => {
    const envSnapshot = snapshotEnv();
    const originalFetch = global.fetch;

    const fetchCalls: FetchArgs[] = [];

    try {
      process.env.BOLTROUTE_VERIFY_API_BASE_URL = "https://api.boltroute.ai";
      process.env.BOLTROUTE_VERIFY_API_KEY = "test-key";

      global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls.push({ input, init });
        return new Response(
          JSON.stringify({
            id: "abc123",
            email: "support@example.com",
            status: "valid",
            is_role_based: true,
            has_mx_records: true,
            domain_name: "example.com",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }) as typeof fetch;

      const response = await POST(
        makeRequest({ email: "support@example.com" }) as any,
      );

      assert.strictEqual(response.status, 200);
      const payload = (await response.json()) as {
        result: { status: string; email: string; mx_found: boolean };
      };

      assert.strictEqual(payload.result.email, "support@example.com");
      assert.strictEqual(payload.result.status, "role_based");
      assert.strictEqual(payload.result.mx_found, true);

      assert.strictEqual(fetchCalls.length, 1);
      assert.strictEqual(
        String(fetchCalls[0]?.input),
        "https://api.boltroute.ai/api/v1/verify",
      );

      const headers = fetchCalls[0]?.init?.headers as HeadersInit;
      const resolvedHeaders = new Headers(headers);
      assert.strictEqual(resolvedHeaders.get("Authorization"), "Bearer test-key");
      assert.strictEqual(resolvedHeaders.get("Content-Type"), "application/json");
    } finally {
      global.fetch = originalFetch;
      restoreEnv(envSnapshot);
    }
  });

  await run("POST /api/email-verification forwards upstream status and message", async () => {
    const envSnapshot = snapshotEnv();
    const originalFetch = global.fetch;

    try {
      process.env.BOLTROUTE_VERIFY_API_BASE_URL = "https://api.boltroute.ai";
      process.env.BOLTROUTE_VERIFY_API_KEY = "test-key";

      global.fetch = (async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "RATE_LIMITED",
              message: "Too many requests for this key.",
            },
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          },
        )) as typeof fetch;

      const response = await POST(makeRequest({ email: "user@example.com" }) as any);
      assert.strictEqual(response.status, 429);

      const payload = (await response.json()) as { error: string };
      assert.strictEqual(payload.error, "Too many requests for this key.");
    } finally {
      global.fetch = originalFetch;
      restoreEnv(envSnapshot);
    }
  });

  // eslint-disable-next-line no-console
  console.log("email-verification route tests completed");
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
