import assert from "node:assert";

import {
  clearCachedCredits,
  readCachedCredits,
  writeCachedCredits,
} from "../app/lib/credits-cache";

type GlobalWithStorage = typeof globalThis & { sessionStorage?: Storage };

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

function withSessionStorage(storage: Storage, fn: () => void) {
  const globalWithStorage = globalThis as GlobalWithStorage;
  const previous = globalWithStorage.sessionStorage;
  globalWithStorage.sessionStorage = storage;
  try {
    fn();
  } finally {
    if (previous === undefined) {
      delete globalWithStorage.sessionStorage;
    } else {
      globalWithStorage.sessionStorage = previous;
    }
  }
}

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

run("reads cached credits from sessionStorage and retains memory", () => {
  const storage = new MemoryStorage();
  const userId = "user-read";
  const cacheKey = `dashboard.credits.cache.v1.${userId}`;
  const payload = {
    creditsRemaining: 1200,
    updatedAt: new Date().toISOString(),
  };
  storage.setItem(cacheKey, JSON.stringify(payload));

  withSessionStorage(storage, () => {
    const firstRead = readCachedCredits(userId);
    assert.ok(firstRead);
    assert.strictEqual(firstRead?.creditsRemaining, payload.creditsRemaining);

    storage.removeItem(cacheKey);
    const secondRead = readCachedCredits(userId);
    assert.ok(secondRead);
    assert.strictEqual(secondRead?.creditsRemaining, payload.creditsRemaining);
  });

  clearCachedCredits(userId);
});

run("writes credits to cache and clears them", () => {
  const storage = new MemoryStorage();
  const userId = "user-write";
  const cacheKey = `dashboard.credits.cache.v1.${userId}`;

  withSessionStorage(storage, () => {
    writeCachedCredits(userId, 4500);
    const stored = storage.getItem(cacheKey);
    assert.ok(stored);
    const parsed = JSON.parse(stored ?? "{}") as { creditsRemaining?: number };
    assert.strictEqual(parsed.creditsRemaining, 4500);

    const readBack = readCachedCredits(userId);
    assert.ok(readBack);
    assert.strictEqual(readBack?.creditsRemaining, 4500);

    clearCachedCredits(userId);
    assert.strictEqual(storage.getItem(cacheKey), null);
    assert.strictEqual(readCachedCredits(userId), null);
  });
});

run("drops invalid cached payloads", () => {
  const storage = new MemoryStorage();
  const userId = "user-invalid";
  const cacheKey = `dashboard.credits.cache.v1.${userId}`;
  storage.setItem(cacheKey, JSON.stringify({ updatedAt: new Date().toISOString() }));

  withSessionStorage(storage, () => {
    const readBack = readCachedCredits(userId);
    assert.strictEqual(readBack, null);
    assert.strictEqual(storage.getItem(cacheKey), null);
  });
});

// eslint-disable-next-line no-console
console.log("credits cache tests completed");
