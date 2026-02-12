import assert from "node:assert";
import {
  PUBLIC_STATIC_PATHS,
  buildSitemapEntriesFromSource,
} from "../../src/lib/seo/sitemap-core";

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

run("includes static routes and published content while excluding draft/placeholder entries", () => {
  assert.ok(PUBLIC_STATIC_PATHS.includes("/tools"));

  const entries = buildSitemapEntriesFromSource(
    {
      posts: [
        { slug: "real-post", date: "2026-02-01T10:00:00.000Z" },
        { slug: "draft-post", draft: true, date: "2026-02-02T10:00:00.000Z" },
        { slug: "template", canonical: "https://example.com/template-post" },
      ],
      pages: [{ slug: "privacy-policy" }],
      landings: [
        {
          slug: "email-validation-api",
          canonical: "https://landing.example.org/email-validation-api",
        },
      ],
    },
    new URL("https://boltroute.ai"),
  );

  const urls = new Set(entries.map((entry) => entry.url));

  for (const path of PUBLIC_STATIC_PATHS) {
    assert.ok(urls.has(`https://boltroute.ai${path}`));
  }

  assert.ok(urls.has("https://boltroute.ai/real-post"));
  assert.ok(urls.has("https://boltroute.ai/privacy-policy"));
  assert.ok(urls.has("https://landing.example.org/email-validation-api"));

  assert.ok(!urls.has("https://boltroute.ai/draft-post"));
  assert.ok(!urls.has("https://example.com/template-post"));
});

run("deduplicates URLs and keeps latest lastModified value", () => {
  const entries = buildSitemapEntriesFromSource(
    {
      posts: [
        { slug: "shared-url", date: "2026-01-01T00:00:00.000Z" },
        { slug: "shared-url", date: "2026-01-15T00:00:00.000Z" },
      ],
      pages: [{ slug: "shared-url" }],
      landings: [],
    },
    new URL("https://boltroute.ai"),
  );

  const shared = entries.filter((entry) => entry.url === "https://boltroute.ai/shared-url");
  assert.strictEqual(shared.length, 1);
  assert.ok(shared[0].lastModified);
  assert.strictEqual(shared[0].lastModified?.toISOString(), "2026-01-15T00:00:00.000Z");
});

run("keeps canonical entries when base URL is unavailable", () => {
  const entries = buildSitemapEntriesFromSource(
    {
      posts: [
        { slug: "canonical-post", canonical: "https://docs.example.org/canonical-post" },
      ],
      pages: [{ slug: "page-without-canonical" }],
      landings: [],
    },
    null,
  );

  const urls = entries.map((entry) => entry.url);
  assert.ok(urls.includes("https://docs.example.org/canonical-post"));
  assert.ok(!urls.includes("https://boltroute.ai/page-without-canonical"));
});

// eslint-disable-next-line no-console
console.log("sitemap tests completed");
