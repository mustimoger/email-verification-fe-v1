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
  await run("Contact form component submits to /api/contact with required fields", async () => {
    const componentPath = path.resolve("src/components/ContactForm.tsx");
    const source = await readFile(componentPath, "utf8");

    assert.ok(source.includes('fetch("/api/contact"'));
    assert.ok(source.includes('name="name"'));
    assert.ok(source.includes('name="email"'));
    assert.ok(source.includes('name="message"'));
    assert.ok(source.includes('name="hp"'));
    assert.ok(source.includes("onSubmit={handleSubmit}"));
  });

  await run("Contact page renders the ContactForm component", async () => {
    const pagePath = path.resolve("src/app/contact/page.tsx");
    const source = await readFile(pagePath, "utf8");

    assert.ok(source.includes('import { ContactForm } from "@/components/ContactForm";'));
    assert.ok(source.includes("<ContactForm buttonFontClassName={workSans.className} />"));
  });

  // eslint-disable-next-line no-console
  console.log("contact form-path tests completed");
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
