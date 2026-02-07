import assert from "node:assert";

import {
  buildFrameAncestorsDirective,
  parseEmbedOrigins,
  resolveAllowedParentOrigin,
} from "../app/lib/embed-config";

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

run("parseEmbedOrigins normalizes and deduplicates by origin in allowlist usage", () => {
  const origins = parseEmbedOrigins(
    "https://boltroute.ai/path, https://www.boltroute.ai, http://127.0.0.1:3010, not-a-url",
  );

  assert.deepStrictEqual(origins, [
    "https://boltroute.ai",
    "https://www.boltroute.ai",
    "http://127.0.0.1:3010",
  ]);
});

run("buildFrameAncestorsDirective builds space-separated frame-ancestors", () => {
  const directive = buildFrameAncestorsDirective([
    "https://boltroute.ai",
    "http://localhost:3010",
  ]);

  assert.strictEqual(
    directive,
    "frame-ancestors https://boltroute.ai http://localhost:3010",
  );
});

run("buildFrameAncestorsDirective falls back to none when empty", () => {
  const directive = buildFrameAncestorsDirective([]);
  assert.strictEqual(directive, "frame-ancestors 'none'");
});

run("resolveAllowedParentOrigin accepts an allowed parent_origin", () => {
  const targetOrigin = resolveAllowedParentOrigin({
    allowedOrigins: ["https://boltroute.ai", "http://localhost:3010"],
    value: "http://localhost:3010/pricing",
  });
  assert.strictEqual(targetOrigin, "http://localhost:3010");
});

run("resolveAllowedParentOrigin rejects non-allowlisted parent_origin", () => {
  const targetOrigin = resolveAllowedParentOrigin({
    allowedOrigins: ["https://boltroute.ai"],
    value: "https://example.com",
  });
  assert.strictEqual(targetOrigin, null);
});

// eslint-disable-next-line no-console
console.log("embed config tests completed");
