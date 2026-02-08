import assert from "node:assert";

import type { Provider, SupabaseClient } from "@supabase/supabase-js";

import { runOAuthSignIn } from "../app/lib/oauth-providers";

async function run(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    // eslint-disable-next-line no-console
    console.log(`✓ ${name}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`✗ ${name}`);
    throw error;
  }
}

run("passes redirect URL to Supabase OAuth handler", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const supabase = {
    auth: {
      signInWithOAuth: async (payload: Record<string, unknown>) => {
        calls.push(payload);
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;

  const result = await runOAuthSignIn({
    supabase,
    provider: "google" as Provider,
    redirectUrl: "https://example.com/overview",
  });

  assert.strictEqual(result.error, null);
  assert.strictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0], {
    provider: "google",
    options: { redirectTo: "https://example.com/overview" },
  });
});

run("omits redirect URL when not provided", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const supabase = {
    auth: {
      signInWithOAuth: async (payload: Record<string, unknown>) => {
        calls.push(payload);
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;

  const result = await runOAuthSignIn({
    supabase,
    provider: "google" as Provider,
  });

  assert.strictEqual(result.error, null);
  assert.strictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0], {
    provider: "google",
    options: undefined,
  });
});

run("returns error message when Supabase OAuth fails", async () => {
  const supabase = {
    auth: {
      signInWithOAuth: async () => ({
        error: { message: "OAuth not configured" },
      }),
    },
  } as unknown as SupabaseClient;

  const result = await runOAuthSignIn({
    supabase,
    provider: "google" as Provider,
  });

  assert.strictEqual(result.error, "OAuth not configured");
});

// eslint-disable-next-line no-console
console.log("oauth sign-in tests completed");
