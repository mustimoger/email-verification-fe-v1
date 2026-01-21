export type CachedCredits = {
  creditsRemaining: number;
  updatedAt: string;
};

const memoryCache = new Map<string, CachedCredits>();
const cacheKeyFor = (userId: string) => `dashboard.credits.cache.v1.${userId}`;

const getSessionStorage = (): Storage | null => {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    return sessionStorage;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("credits_cache.storage_unavailable", { message });
    return null;
  }
};

const parseCachedCredits = (raw: string, userId: string): CachedCredits | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<CachedCredits>;
    if (typeof parsed !== "object" || parsed === null) {
      console.warn("credits_cache.invalid_payload", { userId, reason: "not_object" });
      return null;
    }
    if (typeof parsed.creditsRemaining !== "number" || !Number.isFinite(parsed.creditsRemaining)) {
      console.warn("credits_cache.invalid_payload", { userId, reason: "invalid_balance" });
      return null;
    }
    if (typeof parsed.updatedAt !== "string" || parsed.updatedAt.length === 0) {
      console.warn("credits_cache.invalid_payload", { userId, reason: "invalid_timestamp" });
      return null;
    }
    return { creditsRemaining: parsed.creditsRemaining, updatedAt: parsed.updatedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("credits_cache.parse_failed", { userId, message });
    return null;
  }
};

export const readCachedCredits = (userId: string): CachedCredits | null => {
  if (!userId) {
    return null;
  }
  const memoryValue = memoryCache.get(userId);
  if (memoryValue && Number.isFinite(memoryValue.creditsRemaining)) {
    return memoryValue;
  }
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(cacheKeyFor(userId));
  if (!raw) {
    return null;
  }
  const parsed = parseCachedCredits(raw, userId);
  if (!parsed) {
    storage.removeItem(cacheKeyFor(userId));
    return null;
  }
  memoryCache.set(userId, parsed);
  return parsed;
};

export const writeCachedCredits = (userId: string, creditsRemaining: number) => {
  if (!userId) {
    console.warn("credits_cache.write_missing_user");
    return;
  }
  if (typeof creditsRemaining !== "number" || !Number.isFinite(creditsRemaining)) {
    console.warn("credits_cache.write_invalid_balance", { userId });
    return;
  }
  const payload: CachedCredits = {
    creditsRemaining,
    updatedAt: new Date().toISOString(),
  };
  memoryCache.set(userId, payload);
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(cacheKeyFor(userId), JSON.stringify(payload));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("credits_cache.write_failed", { userId, message });
  }
};

export const clearCachedCredits = (userId: string) => {
  if (!userId) {
    return;
  }
  memoryCache.delete(userId);
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(cacheKeyFor(userId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("credits_cache.clear_failed", { userId, message });
  }
};
