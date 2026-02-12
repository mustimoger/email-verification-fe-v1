import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";

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

const main = async () => {
  await run("layout renders consent-aware analytics and banner globally", async () => {
    const source = await readFile(path.resolve("src/app/layout.tsx"), "utf8");

    assert.ok(source.includes('import { WebsiteAnalytics } from "@/components/WebsiteAnalytics";'));
    assert.ok(source.includes('import { ConsentBanner } from "@/components/ConsentBanner";'));
    assert.ok(source.includes("<WebsiteAnalytics />"));
    assert.ok(source.includes("<ConsentBanner />"));
    assert.ok(!source.includes("googletagmanager.com/gtag/js"));
  });

  await run("footer exposes cookie preferences control", async () => {
    const source = await readFile(path.resolve("src/components/FooterSection.tsx"), "utf8");

    assert.ok(source.includes('import { CookiePreferencesButton } from "@/components/CookiePreferencesButton";'));
    assert.ok(source.includes("<CookiePreferencesButton"));
    assert.ok(source.includes('{ label: "Privacy", href: "/privacy-policy" }'));
    assert.ok(source.includes('{ label: "Terms", href: "/terms" }'));
    assert.ok(source.includes('{ label: "GDPR", href: "/gdpr-compliance" }'));
  });

  await run("consent banner includes explicit reject/accept controls and legal links", async () => {
    const source = await readFile(path.resolve("src/components/ConsentBanner.tsx"), "utf8");

    assert.ok(source.includes("Cookie preferences"));
    assert.ok(source.includes("Reject"));
    assert.ok(source.includes("Accept"));
    assert.ok(source.includes('href: "/privacy-policy"'));
    assert.ok(source.includes('href: "/terms"'));
    assert.ok(source.includes('href: "/gdpr-compliance"'));
  });

  // eslint-disable-next-line no-console
  console.log("consent layout wiring tests completed");
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
