const EMAIL_CONFIRMATION_NOTICE_KEY = "auth.email_confirmation_notice";

export const setEmailConfirmationNotice = (message: string) => {
  if (typeof window === "undefined") return;
  if (!message) return;
  window.localStorage.setItem(EMAIL_CONFIRMATION_NOTICE_KEY, message);
};

export const readEmailConfirmationNotice = (): string | null => {
  if (typeof window === "undefined") return null;
  const message = window.localStorage.getItem(EMAIL_CONFIRMATION_NOTICE_KEY);
  if (message) {
    window.localStorage.removeItem(EMAIL_CONFIRMATION_NOTICE_KEY);
  }
  return message;
};
