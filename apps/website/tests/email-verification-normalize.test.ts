import assert from "node:assert";

import { normalizeVerificationResult } from "../src/lib/email-verification";

const run = (name: string, fn: () => void) => {
  try {
    fn();
    // eslint-disable-next-line no-console
    console.log(`✓ ${name}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`✗ ${name}`);
    throw error;
  }
};

run("normalizeVerificationResult keeps valid status", () => {
  const result = normalizeVerificationResult(
    {
      email: "hello@example.com",
      status: "valid",
      has_mx_records: true,
      is_role_based: false,
      is_disposable: false,
      is_catchall: false,
    },
    "hello@example.com",
  );

  assert.strictEqual(result.status, "valid");
  assert.strictEqual(result.mx_found, true);
  assert.strictEqual(result.domain, "example.com");
});

run("normalizeVerificationResult promotes role-based valid status", () => {
  const result = normalizeVerificationResult(
    {
      email: "support@example.com",
      status: "valid",
      is_role_based: true,
    },
    "support@example.com",
  );

  assert.strictEqual(result.status, "role_based");
  assert.strictEqual(result.is_role, true);
});

run("normalizeVerificationResult preserves disposable_domain", () => {
  const result = normalizeVerificationResult(
    {
      email: "temp@disposable.test",
      status: "disposable_domain",
      is_disposable: true,
    },
    "temp@disposable.test",
  );

  assert.strictEqual(result.status, "disposable_domain");
  assert.strictEqual(result.is_disposable, true);
});

run("normalizeVerificationResult maps catch-all aliases", () => {
  const result = normalizeVerificationResult(
    {
      email: "all@example.org",
      status: "catch-all",
      is_catchall: true,
    },
    "all@example.org",
  );

  assert.strictEqual(result.status, "catchall");
  assert.strictEqual(result.is_catchall, true);
});

run("normalizeVerificationResult marks invalid syntax", () => {
  const result = normalizeVerificationResult(
    {
      email: "bad-email",
      status: "invalid_syntax",
    },
    "bad-email",
  );

  assert.strictEqual(result.status, "invalid_syntax");
  assert.strictEqual(result.syntax_valid, false);
});

// eslint-disable-next-line no-console
console.log("email-verification normalization tests completed");
