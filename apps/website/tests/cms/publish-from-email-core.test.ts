import assert from "node:assert";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import core from "../../scripts/publish-from-email-core.js";

type PublishCore = {
  normalizeFrontmatter: (args: { data: Record<string, unknown>; content: string }) => string;
  normalizeMdxText: (raw: string | null) => string | null;
  normalizeMessageMetadata: (args: {
    data: Record<string, unknown>;
    subject?: string;
    filename?: string;
  }) => { type: string; title: string; slug: string; data: Record<string, unknown> };
  getContentBaseDir: (args: { type: string; rootDir?: string }) => string;
  writeContentFile: (args: {
    type: string;
    slug: string;
    content: string;
    rootDir?: string;
  }) => Promise<{ filePath: string; changed: boolean }>;
  shouldFailRun: (failures: Array<{ uid: number; error: string }>) => boolean;
};

const {
  normalizeFrontmatter,
  normalizeMdxText,
  normalizeMessageMetadata,
  getContentBaseDir,
  writeContentFile,
  shouldFailRun,
} = core as unknown as PublishCore;

const run = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    // eslint-disable-next-line no-console
    console.log(`\u2713 ${name}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`\u2717 ${name}`);
    throw error;
  }
};

const main = async () => {
  await run("normalizeMdxText wraps YAML headers into frontmatter fences", () => {
    const input = 'title: "Example"\ntype: post\n\nHello world';
    const normalized = normalizeMdxText(input);

    assert.ok(normalized);
    assert.ok(normalized?.startsWith("---\n"));
    assert.ok(normalized?.includes('title: "Example"'));
    assert.ok(normalized?.includes("\n---\nHello world"));
  });

  await run("normalizeFrontmatter rewrites frontmatter with normalized body", () => {
    const output = normalizeFrontmatter({
      data: {
        type: "post",
        title: "My title",
        slug: "my-title",
        date: "2026-02-01",
        metaTitle: "SEO title",
        metaDescription: "SEO description",
      },
      content: "Paragraph one.",
    });

    assert.ok(output.startsWith("---\n"));
    assert.ok(output.includes("title: My title"));
    assert.ok(output.endsWith("Paragraph one.\n"));
  });

  await run("normalizeMessageMetadata enforces required post fields", () => {
    assert.throws(
      () =>
        normalizeMessageMetadata({
          data: {
            type: "post",
            title: "Missing fields",
            date: "2026-02-01",
            metaDescription: "desc",
          },
          subject: "fallback",
        }),
      /Missing required fields for post: metaTitle/,
    );
  });

  await run("normalizeMessageMetadata applies slug precedence (frontmatter > filename > title)", () => {
    const explicitSlug = normalizeMessageMetadata({
      data: {
        type: "post",
        title: "Example title",
        slug: "explicit-slug",
        date: "2026-02-01",
        metaTitle: "Meta",
        metaDescription: "Desc",
      },
      filename: "filename-slug.mdx",
      subject: "Subject title",
    });

    const filenameSlug = normalizeMessageMetadata({
      data: {
        type: "post",
        title: "Example title",
        date: "2026-02-01",
        metaTitle: "Meta",
        metaDescription: "Desc",
      },
      filename: "filename-slug.mdx",
      subject: "Subject title",
    });

    const titleSlug = normalizeMessageMetadata({
      data: {
        type: "post",
        date: "2026-02-01",
        metaTitle: "Meta",
        metaDescription: "Desc",
      },
      subject: "Title From Subject",
    });

    assert.strictEqual(explicitSlug.slug, "explicit-slug");
    assert.strictEqual(filenameSlug.slug, "filename-slug");
    assert.strictEqual(titleSlug.slug, "title-from-subject");
  });

  await run("getContentBaseDir routes post/page content into expected directories", () => {
    const rootDir = "/tmp/example-root";
    assert.strictEqual(getContentBaseDir({ type: "post", rootDir }), "/tmp/example-root/content/posts");
    assert.strictEqual(getContentBaseDir({ type: "page", rootDir }), "/tmp/example-root/content/pages");
  });

  await run("writeContentFile returns changed=false when content is unchanged", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "cms-publish-"));

    try {
      const firstWrite = await writeContentFile({
        type: "post",
        slug: "hello-world",
        content: "---\ntype: post\ntitle: Hello\nslug: hello-world\ndate: 2026-02-01\nmetaTitle: Hello\nmetaDescription: Hello\n---\n\nBody\n",
        rootDir: tempRoot,
      });

      const secondWrite = await writeContentFile({
        type: "post",
        slug: "hello-world",
        content: "---\ntype: post\ntitle: Hello\nslug: hello-world\ndate: 2026-02-01\nmetaTitle: Hello\nmetaDescription: Hello\n---\n\nBody\n",
        rootDir: tempRoot,
      });

      assert.strictEqual(firstWrite.changed, true);
      assert.strictEqual(secondWrite.changed, false);
      assert.ok(firstWrite.filePath.endsWith("content/posts/hello-world.mdx"));

      const fileData = await readFile(firstWrite.filePath, "utf8");
      assert.ok(fileData.includes("title: Hello"));
      assert.ok(fileData.endsWith("Body\n"));
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  await run("shouldFailRun enforces fail-on-any-bad-email policy", () => {
    assert.strictEqual(shouldFailRun([]), false);
    assert.strictEqual(shouldFailRun([{ uid: 101, error: "Missing required fields" }]), true);
  });

  // eslint-disable-next-line no-console
  console.log("cms publish core tests completed");
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
