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
  await run("Footer resources include Tools between Blog and Help", async () => {
    const source = await readFile(path.resolve("src/components/FooterSection.tsx"), "utf8");

    const blogIndex = source.indexOf('{ label: "Blog", href: "/blog" }');
    const toolsIndex = source.indexOf('{ label: "Tools", href: "/tools" }');
    const helpIndex = source.indexOf('{ label: "Help", href: "/help" }');
    const contactIndex = source.indexOf('{ label: "Contact", href: "/contact" }');

    assert.ok(blogIndex >= 0);
    assert.ok(toolsIndex >= 0);
    assert.ok(helpIndex >= 0);
    assert.ok(contactIndex >= 0);

    assert.ok(blogIndex < toolsIndex);
    assert.ok(toolsIndex < helpIndex);
    assert.ok(helpIndex < contactIndex);
  });

  // eslint-disable-next-line no-console
  console.log("footer resources-link tests completed");
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
