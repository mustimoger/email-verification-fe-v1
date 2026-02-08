import assert from "node:assert";

import {
  CRISP_SCRIPT_ATTR,
  CRISP_SCRIPT_SRC,
  loadCrispChat,
  normalizeCrispWebsiteId,
} from "../app/lib/crisp";

type ScriptStub = {
  src: string;
  async: boolean;
  attrs: Record<string, string>;
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | undefined;
};

type HeadStub = {
  appended: ScriptStub[];
  appendChild: (node: ScriptStub) => ScriptStub;
  querySelector: (selector: string) => ScriptStub | null;
};

type DocumentStub = {
  head?: HeadStub | null;
  createElement: (tag: string) => ScriptStub;
  getElementsByTagName: (tag: string) => HeadStub[];
};

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

function createDocumentStub({ includeHead = true }: { includeHead?: boolean } = {}) {
  const appended: ScriptStub[] = [];
  const head: HeadStub = {
    appended,
    appendChild: (node) => {
      appended.push(node);
      return node;
    },
    querySelector: (selector) => {
      if (!selector.includes(CRISP_SCRIPT_ATTR)) {
        return null;
      }
      return appended.find((node) => node.getAttribute(CRISP_SCRIPT_ATTR) === "true") ?? null;
    },
  };

  const documentRef: DocumentStub = {
    head: includeHead ? head : null,
    createElement: () => {
      const attrs: Record<string, string> = {};
      return {
        src: "",
        async: false,
        attrs,
        setAttribute: (name, value) => {
          attrs[name] = value;
        },
        getAttribute: (name) => attrs[name],
      };
    },
    getElementsByTagName: (tag) => (tag === "head" && includeHead ? [head] : []),
  };

  return { documentRef, head };
}

run("normalizeCrispWebsiteId trims values", () => {
  assert.strictEqual(normalizeCrispWebsiteId("  crisp-id  "), "crisp-id");
});

run("normalizeCrispWebsiteId returns null for empty values", () => {
  assert.strictEqual(normalizeCrispWebsiteId(""), null);
  assert.strictEqual(normalizeCrispWebsiteId("   "), null);
  assert.strictEqual(normalizeCrispWebsiteId(undefined), null);
});

run("loadCrispChat returns false when website id is missing", () => {
  const { documentRef } = createDocumentStub();
  const loaded = loadCrispChat({
    websiteId: "  ",
    windowRef: {} as Window,
    documentRef: documentRef as unknown as Document,
  });
  assert.strictEqual(loaded, false);
});

run("loadCrispChat returns false when document head is missing", () => {
  const { documentRef } = createDocumentStub({ includeHead: false });
  const loaded = loadCrispChat({
    websiteId: "crisp-id",
    windowRef: {} as Window,
    documentRef: documentRef as unknown as Document,
  });
  assert.strictEqual(loaded, false);
});

run("loadCrispChat injects script and sets window globals", () => {
  const { documentRef, head } = createDocumentStub();
  const windowRef = {} as Window;
  const loaded = loadCrispChat({
    websiteId: "crisp-id",
    windowRef,
    documentRef: documentRef as unknown as Document,
  });

  assert.strictEqual(loaded, true);
  assert.ok(Array.isArray((windowRef as Window & { $crisp?: unknown[] }).$crisp));
  assert.strictEqual((windowRef as Window & { CRISP_WEBSITE_ID?: string }).CRISP_WEBSITE_ID, "crisp-id");
  assert.strictEqual(head.appended.length, 1);
  assert.strictEqual(head.appended[0].src, CRISP_SCRIPT_SRC);
  assert.strictEqual(head.appended[0].async, true);
  assert.strictEqual(head.appended[0].getAttribute(CRISP_SCRIPT_ATTR), "true");
});

run("loadCrispChat skips duplicate script insertion", () => {
  const { documentRef, head } = createDocumentStub();
  const windowRef = {} as Window;

  const first = loadCrispChat({
    websiteId: "crisp-id",
    windowRef,
    documentRef: documentRef as unknown as Document,
  });
  const second = loadCrispChat({
    websiteId: "crisp-id",
    windowRef,
    documentRef: documentRef as unknown as Document,
  });

  assert.strictEqual(first, true);
  assert.strictEqual(second, true);
  assert.strictEqual(head.appended.length, 1);
});

// eslint-disable-next-line no-console
console.log("crisp chat tests completed");
