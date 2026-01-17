import assert from "node:assert";

import { getOAuthProviderIcon, getOAuthProviderLabel, parseOAuthProviders } from "../app/lib/oauth-providers";

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

run("parses and deduplicates OAuth providers", () => {
  const providers = parseOAuthProviders("google, GitHub ,google,");
  assert.deepStrictEqual(providers, ["google", "github"]);
});

run("returns a label for Google provider on signin", () => {
  const label = getOAuthProviderLabel("google", "signin");
  assert.strictEqual(label, "Sign in with Google");
});

run("returns a label for Google provider on signup", () => {
  const label = getOAuthProviderLabel("google", "signup");
  assert.strictEqual(label, "Sign up with Google");
});

run("returns null for unknown provider", () => {
  const label = getOAuthProviderLabel("unknown-provider", "signup");
  assert.strictEqual(label, null);
});

run("returns icon path for Google provider", () => {
  const icon = getOAuthProviderIcon("google");
  assert.strictEqual(icon, "/signin-v2/google.svg");
});

run("returns null for unknown icon provider", () => {
  const icon = getOAuthProviderIcon("unknown-provider");
  assert.strictEqual(icon, null);
});

// eslint-disable-next-line no-console
console.log("oauth providers tests completed");
