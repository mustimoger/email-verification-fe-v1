import assert from "node:assert";

import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  getConsentStatus,
  openConsentBanner,
  readConsentRecord,
  saveConsentDecision,
  subscribeToConsentBannerRequests,
  subscribeToConsentUpdates,
} from "../../src/lib/consent";

type RootGlobals = typeof globalThis & {
  window?: Window;
  localStorage?: Storage;
};

type StorageStub = Storage & {
  dump: () => Record<string, string>;
};

const root = globalThis as RootGlobals;
const originalWindow = root.window;
const originalLocalStorage = root.localStorage;

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

const createStorageStub = (): StorageStub => {
  const backing = new Map<string, string>();
  return {
    get length() {
      return backing.size;
    },
    clear() {
      backing.clear();
    },
    getItem(key: string) {
      return backing.has(key) ? backing.get(key)! : null;
    },
    key(index: number) {
      return Array.from(backing.keys())[index] ?? null;
    },
    removeItem(key: string) {
      backing.delete(key);
    },
    setItem(key: string, value: string) {
      backing.set(key, value);
    },
    dump() {
      return Object.fromEntries(backing.entries());
    },
  };
};

const createWindowStub = (storage: Storage): Window => {
  const events = new EventTarget();
  return {
    localStorage: storage,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  } as unknown as Window;
};

const resetEnvironment = () => {
  if (typeof originalWindow === "undefined") {
    delete root.window;
  } else {
    root.window = originalWindow;
  }

  if (typeof originalLocalStorage === "undefined") {
    delete root.localStorage;
  } else {
    root.localStorage = originalLocalStorage;
  }
};

run("saveConsentDecision persists record and status", () => {
  const storage = createStorageStub();
  root.localStorage = storage;
  delete root.window;

  const update = saveConsentDecision("accepted");
  assert.strictEqual(update.status, "accepted");
  assert.strictEqual(update.persisted, true);
  assert.strictEqual(update.record.version, CONSENT_VERSION);
  assert.strictEqual(getConsentStatus(), "accepted");

  const record = readConsentRecord();
  assert.ok(record);
  assert.strictEqual(record?.decision, "accepted");
});

run("readConsentRecord clears malformed JSON records", () => {
  const storage = createStorageStub();
  storage.setItem(CONSENT_STORAGE_KEY, "{not-json");
  root.localStorage = storage;
  delete root.window;

  const record = readConsentRecord();
  assert.strictEqual(record, null);
  assert.strictEqual(storage.getItem(CONSENT_STORAGE_KEY), null);
});

run("version mismatch resets consent to unknown", () => {
  const storage = createStorageStub();
  storage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({
      decision: "accepted",
      decidedAt: new Date().toISOString(),
      version: CONSENT_VERSION + 1,
    }),
  );
  root.localStorage = storage;
  delete root.window;

  assert.strictEqual(readConsentRecord(), null);
  assert.strictEqual(getConsentStatus(), "unknown");
  assert.strictEqual(storage.getItem(CONSENT_STORAGE_KEY), null);
});

run("consent update subscribers receive save events", () => {
  const storage = createStorageStub();
  const windowStub = createWindowStub(storage);
  root.localStorage = storage;
  root.window = windowStub;

  let receivedStatus: string | null = null;
  const unsubscribe = subscribeToConsentUpdates((update) => {
    receivedStatus = update.status;
  });

  saveConsentDecision("rejected");
  unsubscribe();

  assert.strictEqual(receivedStatus, "rejected");
});

run("openConsentBanner notifies banner request subscribers", () => {
  const storage = createStorageStub();
  const windowStub = createWindowStub(storage);
  root.localStorage = storage;
  root.window = windowStub;

  let openEvents = 0;
  const unsubscribe = subscribeToConsentBannerRequests(() => {
    openEvents += 1;
  });

  openConsentBanner("footer");
  unsubscribe();
  openConsentBanner("footer");

  assert.strictEqual(openEvents, 1);
});

resetEnvironment();

// eslint-disable-next-line no-console
console.log("consent state tests completed");
