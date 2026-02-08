export const CRISP_SCRIPT_SRC = "https://client.crisp.chat/l.js";
export const CRISP_SCRIPT_ATTR = "data-crisp-chat";
const CRISP_SCRIPT_SELECTOR = `[${CRISP_SCRIPT_ATTR}="true"]`;

export function normalizeCrispWebsiteId(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function loadCrispChat({
  websiteId,
  windowRef,
  documentRef,
}: {
  websiteId: string;
  windowRef: Window;
  documentRef: Document;
}): boolean {
  const normalizedId = normalizeCrispWebsiteId(websiteId);
  if (!normalizedId) {
    return false;
  }

  const head = documentRef.head ?? documentRef.getElementsByTagName("head")[0];
  if (!head) {
    return false;
  }

  const crispWindow = windowRef as Window & {
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
  };
  if (!Array.isArray(crispWindow.$crisp)) {
    crispWindow.$crisp = [];
  }
  crispWindow.CRISP_WEBSITE_ID = normalizedId;

  if (head.querySelector?.(CRISP_SCRIPT_SELECTOR)) {
    return true;
  }

  const script = documentRef.createElement("script");
  script.src = CRISP_SCRIPT_SRC;
  script.async = true;
  script.setAttribute(CRISP_SCRIPT_ATTR, "true");
  head.appendChild(script);
  return true;
}
