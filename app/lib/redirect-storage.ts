const NEXT_STORAGE_KEY = "auth.next_path";

export const storeNextPath = (value?: string | null) => {
  if (typeof window === "undefined") return;
  if (!value) return;
  try {
    window.sessionStorage.setItem(NEXT_STORAGE_KEY, value);
  } catch (error) {
    console.warn("auth.next_path_store_failed", { error });
  }
};

export const consumeNextPath = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(NEXT_STORAGE_KEY);
    if (value) {
      window.sessionStorage.removeItem(NEXT_STORAGE_KEY);
      return value;
    }
  } catch (error) {
    console.warn("auth.next_path_consume_failed", { error });
  }
  return null;
};
