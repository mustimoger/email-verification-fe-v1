import assert from "node:assert";

import { resolveAuthState } from "../app/components/auth-guard-utils";

function run(name: string, fn: () => void) {
  try {
    fn();
    // eslint-disable-next-line no-console
    console.log(`✓ ${name}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`✗ ${name}`);
    throw error;
  }
}

run("returns loading when auth is still resolving", () => {
  const state = resolveAuthState({ loading: true, hasSession: false });
  assert.strictEqual(state, "loading");
});

run("returns authenticated when session is present", () => {
  const state = resolveAuthState({ loading: false, hasSession: true });
  assert.strictEqual(state, "authenticated");
});

run("returns unauthenticated when no session and not loading", () => {
  const state = resolveAuthState({ loading: false, hasSession: false });
  assert.strictEqual(state, "unauthenticated");
});

// eslint-disable-next-line no-console
console.log("auth guard utils tests completed");
