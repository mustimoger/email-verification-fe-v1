export type ConsentDecision = "accepted" | "rejected";
export type ConsentStatus = ConsentDecision | "unknown";
export type ConsentUpdateSource = "banner" | "preferences";

export type ConsentRecord = {
  decision: ConsentDecision;
  decidedAt: string;
  version: number;
};

export type ConsentUpdate = {
  status: ConsentDecision;
  record: ConsentRecord;
  persisted: boolean;
  source: ConsentUpdateSource;
};

type ConsentOpenSource = "footer" | "app";

type GlobalWithStorage = typeof globalThis & { localStorage?: Storage };

export const CONSENT_STORAGE_KEY = "website.consent.preference.v1";
export const CONSENT_VERSION = 1;
export const CONSENT_EVENT_NAME = "website.consent.updated";
export const CONSENT_OPEN_EVENT_NAME = "website.consent.open";

const isConsentDecision = (value: unknown): value is ConsentDecision =>
  value === "accepted" || value === "rejected";

const getLocalStorage = (): Storage | null => {
  if (typeof window !== "undefined") {
    try {
      return window.localStorage;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.warn("website.consent.storage_unavailable", { message });
      return null;
    }
  }

  const globalWithStorage = globalThis as GlobalWithStorage;
  return globalWithStorage.localStorage ?? null;
};

const parseConsentRecord = (raw: string): ConsentRecord | null => {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (!isConsentDecision(parsed.decision)) {
      return null;
    }

    if (typeof parsed.decidedAt !== "string" || parsed.decidedAt.length === 0) {
      return null;
    }

    if (typeof parsed.version !== "number") {
      return null;
    }

    return {
      decision: parsed.decision,
      decidedAt: parsed.decidedAt,
      version: parsed.version,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn("website.consent.parse_failed", { message });
    return null;
  }
};

export const readConsentRecord = (): ConsentRecord | null => {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  let raw: string | null = null;
  try {
    raw = storage.getItem(CONSENT_STORAGE_KEY);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn("website.consent.storage_read_failed", { message });
    return null;
  }

  if (!raw) {
    return null;
  }

  const record = parseConsentRecord(raw);
  if (!record) {
    try {
      storage.removeItem(CONSENT_STORAGE_KEY);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.warn("website.consent.storage_clear_failed", { message });
    }
    // eslint-disable-next-line no-console
    console.warn("website.consent.record_invalid", { key: CONSENT_STORAGE_KEY });
    return null;
  }

  if (record.version !== CONSENT_VERSION) {
    try {
      storage.removeItem(CONSENT_STORAGE_KEY);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.warn("website.consent.storage_clear_failed", { message });
    }
    // eslint-disable-next-line no-console
    console.info("website.consent.record_version_mismatch", {
      storedVersion: record.version,
      expectedVersion: CONSENT_VERSION,
    });
    return null;
  }

  return record;
};

export const getConsentStatus = (): ConsentStatus => {
  const record = readConsentRecord();
  return record?.decision ?? "unknown";
};

const dispatchConsentUpdate = (update: ConsentUpdate) => {
  if (typeof window === "undefined") {
    return;
  }

  if (typeof window.dispatchEvent !== "function") {
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT_NAME, { detail: update }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn("website.consent.event_dispatch_failed", { message });
  }
};

const dispatchConsentOpenRequest = (source: ConsentOpenSource) => {
  if (typeof window === "undefined") {
    return;
  }

  if (typeof window.dispatchEvent !== "function") {
    return;
  }

  try {
    window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT_NAME, { detail: { source } }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn("website.consent.open_event_dispatch_failed", { message });
  }
};

export const saveConsentDecision = (
  decision: ConsentDecision,
  source: ConsentUpdateSource = "banner",
): ConsentUpdate => {
  const record: ConsentRecord = {
    decision,
    decidedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };

  const storage = getLocalStorage();
  let persisted = false;
  if (storage) {
    try {
      storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
      persisted = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.warn("website.consent.storage_write_failed", { message });
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn("website.consent.storage_unavailable", { key: CONSENT_STORAGE_KEY });
  }

  const update: ConsentUpdate = {
    status: decision,
    record,
    persisted,
    source,
  };
  dispatchConsentUpdate(update);

  if (persisted) {
    // eslint-disable-next-line no-console
    console.info("website.consent.decision_saved", {
      decision,
      source,
      version: record.version,
    });
  } else {
    // eslint-disable-next-line no-console
    console.warn("website.consent.decision_not_persisted", {
      decision,
      source,
    });
  }

  return update;
};

export const openConsentBanner = (source: ConsentOpenSource = "app") => {
  dispatchConsentOpenRequest(source);
};

export const subscribeToConsentUpdates = (
  listener: (update: ConsentUpdate) => void,
): (() => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    if (!(event instanceof CustomEvent)) {
      return;
    }

    const detail = event.detail as ConsentUpdate | undefined;
    if (!detail || !isConsentDecision(detail.status)) {
      return;
    }

    listener(detail);
  };

  window.addEventListener(CONSENT_EVENT_NAME, handler as EventListener);
  return () => window.removeEventListener(CONSENT_EVENT_NAME, handler as EventListener);
};

export const subscribeToConsentBannerRequests = (
  listener: () => void,
): (() => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: Event) => {
    if (!(event instanceof CustomEvent)) {
      return;
    }

    const detail = event.detail as { source?: string } | undefined;
    if (!detail?.source) {
      return;
    }

    listener();
  };

  window.addEventListener(CONSENT_OPEN_EVENT_NAME, handler as EventListener);
  return () => window.removeEventListener(CONSENT_OPEN_EVENT_NAME, handler as EventListener);
};
