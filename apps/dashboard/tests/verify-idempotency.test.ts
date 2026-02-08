import assert from "node:assert";

import { clearVerifyRequestId, getVerifyRequestId } from "../app/lib/verify-idempotency";

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

run("getVerifyRequestId reuses the same id for the same email", () => {
  const cryptoRef = globalThis.crypto as { randomUUID: () => string };
  const original = cryptoRef.randomUUID;
  let counter = 0;
  cryptoRef.randomUUID = () => `uuid-${++counter}`;
  try {
    const first = getVerifyRequestId("Test@Example.com");
    const second = getVerifyRequestId("test@example.com");
    assert.strictEqual(first, "uuid-1");
    assert.strictEqual(second, "uuid-1");
  } finally {
    cryptoRef.randomUUID = original;
    clearVerifyRequestId("test@example.com");
  }
});

run("getVerifyRequestId can force a new id and clear afterward", () => {
  const cryptoRef = globalThis.crypto as { randomUUID: () => string };
  const original = cryptoRef.randomUUID;
  let counter = 0;
  cryptoRef.randomUUID = () => `uuid-${++counter}`;
  try {
    const first = getVerifyRequestId("alpha@example.com");
    const forced = getVerifyRequestId("alpha@example.com", { forceNew: true });
    assert.strictEqual(first, "uuid-1");
    assert.strictEqual(forced, "uuid-2");
    clearVerifyRequestId("alpha@example.com");
    const next = getVerifyRequestId("alpha@example.com");
    assert.strictEqual(next, "uuid-3");
  } finally {
    cryptoRef.randomUUID = original;
    clearVerifyRequestId("alpha@example.com");
  }
});

// eslint-disable-next-line no-console
console.log("verify idempotency tests completed");
