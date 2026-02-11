import assert from "node:assert";

import {
  buildSalesContactIdempotencyKey,
  buildSalesContactMailtoUrl,
  executeSalesContactFallbackAction,
  resolveQuantityBucket,
  resolveSalesContactFallbackAction,
} from "../app/pricing/contact-sales";

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

const payload = {
  source: "dashboard_pricing",
  plan: "annual" as const,
  quantity: 100000,
  contactRequired: true,
  page: "/pricing",
};

run("buildSalesContactIdempotencyKey is deterministic and bounded", () => {
  const first = buildSalesContactIdempotencyKey(payload);
  const second = buildSalesContactIdempotencyKey(payload);
  assert.strictEqual(first, second);
  assert.ok(first.length <= 128);
});

run("resolveSalesContactFallbackAction prefers crisp", () => {
  const crispQueue: unknown[] = [];
  const windowRef = { $crisp: crispQueue, open: () => null } as unknown as Window;
  const action = resolveSalesContactFallbackAction({
    windowRef,
    schedulerUrl: "https://cal.example.com/sales",
    mailtoRecipient: "sales@example.com",
    payload,
    requestId: "salesreq_123",
  });
  assert.strictEqual(action.type, "crisp");
});

run("resolveSalesContactFallbackAction falls back to scheduler", () => {
  const windowRef = { open: () => null } as unknown as Window;
  const action = resolveSalesContactFallbackAction({
    windowRef,
    schedulerUrl: "https://cal.example.com/sales",
    mailtoRecipient: "sales@example.com",
    payload,
    requestId: "salesreq_123",
  });
  assert.strictEqual(action.type, "scheduler");
  assert.strictEqual(action.targetUrl, "https://cal.example.com/sales");
});

run("resolveSalesContactFallbackAction falls back to mailto", () => {
  const windowRef = { open: () => null } as unknown as Window;
  const action = resolveSalesContactFallbackAction({
    windowRef,
    schedulerUrl: "",
    mailtoRecipient: "sales@example.com",
    payload,
    requestId: "salesreq_123",
  });
  assert.strictEqual(action.type, "mailto");
  assert.ok(action.targetUrl?.startsWith("mailto:sales@example.com?"));
  assert.ok(action.targetUrl?.includes("Reference%3A+salesreq_123"));
});

run("buildSalesContactMailtoUrl includes request context", () => {
  const mailto = buildSalesContactMailtoUrl({
    recipient: "sales@example.com",
    payload,
    requestId: "salesreq_abc",
  });
  assert.ok(mailto.includes("subject=Sales+contact+request+%28annual%29"));
  assert.ok(mailto.includes("Reference%3A+salesreq_abc"));
});

run("executeSalesContactFallbackAction opens crisp", () => {
  const crispQueue: unknown[] = [];
  const opened = executeSalesContactFallbackAction({ type: "crisp" }, { $crisp: crispQueue } as unknown as Window);
  assert.strictEqual(opened, true);
  assert.deepStrictEqual(crispQueue, [
    ["do", "chat:open"],
    ["do", "chat:show"],
  ]);
});

run("executeSalesContactFallbackAction opens scheduler target", () => {
  const calls: Array<{ url: string; target: string }> = [];
  const windowRef = {
    open: (url: string, target: string) => {
      calls.push({ url, target });
      return {} as Window;
    },
  } as unknown as Window;
  const opened = executeSalesContactFallbackAction(
    { type: "scheduler", targetUrl: "https://cal.example.com/sales" },
    windowRef,
  );
  assert.strictEqual(opened, true);
  assert.deepStrictEqual(calls, [{ url: "https://cal.example.com/sales", target: "_blank" }]);
});

run("resolveQuantityBucket uses quartile buckets", () => {
  assert.strictEqual(resolveQuantityBucket(10000, 10000, 200000), "q1");
  assert.strictEqual(resolveQuantityBucket(70000, 10000, 200000), "q2");
  assert.strictEqual(resolveQuantityBucket(130000, 10000, 200000), "q3");
  assert.strictEqual(resolveQuantityBucket(200000, 10000, 200000), "q4");
});

// eslint-disable-next-line no-console
console.log("contact sales tests completed");
