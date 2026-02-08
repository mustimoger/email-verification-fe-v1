const REMEMBER_EMAIL_STORAGE_KEY = "auth.remembered_email";

const getStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
};

export const readRememberedEmail = (): string | null => {
  try {
    const storage = getStorage();
    if (!storage) {
      return null;
    }
    const value = storage.getItem(REMEMBER_EMAIL_STORAGE_KEY);
    return value ? value : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("auth.remembered_email_read_failed", { message });
    return null;
  }
};

export const setRememberedEmail = (email: string) => {
  try {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    storage.setItem(REMEMBER_EMAIL_STORAGE_KEY, email);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("auth.remembered_email_write_failed", { message });
  }
};

export const clearRememberedEmail = () => {
  try {
    const storage = getStorage();
    if (!storage) {
      return;
    }
    storage.removeItem(REMEMBER_EMAIL_STORAGE_KEY);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("auth.remembered_email_clear_failed", { message });
  }
};
