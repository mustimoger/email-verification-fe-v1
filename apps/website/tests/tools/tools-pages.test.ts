import assert from "node:assert";
import {
  TOOLS_LANDING_SLUG_ALLOWLIST,
  buildToolsPageCardsFromSource,
} from "../../src/lib/tools/tools-pages";

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

run("buildToolsPageCardsFromSource keeps allowlist order and only includes published entries", () => {
  const cards = buildToolsPageCardsFromSource([
    {
      slug: "email-consulting",
      title: "Email Consulting",
      description: "Consulting description.",
      canonical: "https://boltroute.ai/email-consulting",
    },
    {
      slug: "data-enrichment-tools",
      title: "Data Enrichment Tools",
      metaDescription: "Meta description for enrichment.",
    },
    {
      slug: "email-verification-tools",
      title: "Email Verification Tools",
      description: "Draft card should not appear.",
      draft: true,
    },
    {
      slug: "reverse-email-lookup-free",
      title: "Reverse Email Lookup",
      description: "Reverse lookup description.",
    },
    {
      slug: "not-in-allowlist",
      title: "Ignore Me",
      description: "Ignored because not in allowlist.",
    },
  ]);

  assert.deepStrictEqual(
    cards.map((card) => card.slug),
    ["data-enrichment-tools", "email-consulting", "reverse-email-lookup-free"],
  );

  assert.strictEqual(cards[0]?.description, "Meta description for enrichment.");
  assert.strictEqual(cards[1]?.href, "https://boltroute.ai/email-consulting");
  assert.strictEqual(cards[2]?.href, "/reverse-email-lookup-free");
});

run("buildToolsPageCardsFromSource skips entries with missing title/description and falls back on invalid canonical", () => {
  const cards = buildToolsPageCardsFromSource([
    {
      slug: "email-list-cleaning-service",
      title: "Email List Cleaning Service",
      description: "List cleaning description.",
      canonical: "notaurl",
    },
    {
      slug: "email-regex",
      title: "Email Regex",
    },
    {
      slug: "email-deliverability",
      title: "",
      description: "Title is required and should be skipped.",
    },
  ]);

  assert.deepStrictEqual(cards.map((card) => card.slug), ["email-list-cleaning-service"]);
  assert.strictEqual(cards[0]?.href, "/email-list-cleaning-service");
});

run("allowlist remains locked to the approved 11 landing slugs", () => {
  assert.deepStrictEqual(TOOLS_LANDING_SLUG_ALLOWLIST, [
    "data-enrichment-tools",
    "email-consulting",
    "email-deliverability",
    "email-list-cleaning-service",
    "email-regex",
    "email-sequence-verification",
    "email-validation-api",
    "email-verification-tools",
    "reverse-email-lookup-free",
    "verify-email-addresses-list",
    "warmup-inbox-email-verification",
  ]);
});

// eslint-disable-next-line no-console
console.log("tools-page source tests completed");
