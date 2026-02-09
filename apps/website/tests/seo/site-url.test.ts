import assert from "node:assert";
import {
  getConfiguredSiteUrl,
  getRequestSiteUrl,
  resolveSiteUrl,
  toAbsoluteUrl,
} from "../../src/lib/seo/site-url";

const ENV_KEYS = ["NEXT_PUBLIC_SITE_URL", "SITE_URL"] as const;

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

run("getConfiguredSiteUrl prioritizes NEXT_PUBLIC_SITE_URL", () => {
  const snapshot = snapshotEnv();
  try {
    process.env.NEXT_PUBLIC_SITE_URL = "https://boltroute.ai";
    process.env.SITE_URL = "https://fallback.example";
    const resolved = getConfiguredSiteUrl();
    assert.ok(resolved);
    assert.strictEqual(resolved.toString(), "https://boltroute.ai/");
  } finally {
    restoreEnv(snapshot);
  }
});

run("getConfiguredSiteUrl skips invalid primary env and uses fallback", () => {
  const snapshot = snapshotEnv();
  try {
    process.env.NEXT_PUBLIC_SITE_URL = "notaurl";
    process.env.SITE_URL = "https://website.example";
    const resolved = getConfiguredSiteUrl();
    assert.ok(resolved);
    assert.strictEqual(resolved.toString(), "https://website.example/");
  } finally {
    restoreEnv(snapshot);
  }
});

run("getRequestSiteUrl derives origin from request URL", () => {
  const request = new Request("https://docs.example/path/to/page?x=1");
  const resolved = getRequestSiteUrl(request);
  assert.ok(resolved);
  assert.strictEqual(resolved.toString(), "https://docs.example/");
});

run("resolveSiteUrl falls back to request URL when env is missing", () => {
  const snapshot = snapshotEnv();
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.SITE_URL;
    const request = new Request("https://www.example.org/blog");
    const resolved = resolveSiteUrl(request);
    assert.ok(resolved);
    assert.strictEqual(resolved.toString(), "https://www.example.org/");
  } finally {
    restoreEnv(snapshot);
  }
});

run("toAbsoluteUrl resolves paths against base site URL", () => {
  const resolved = toAbsoluteUrl("/sitemap.xml", new URL("https://boltroute.ai"));
  assert.strictEqual(resolved, "https://boltroute.ai/sitemap.xml");
});

// eslint-disable-next-line no-console
console.log("site-url tests completed");
