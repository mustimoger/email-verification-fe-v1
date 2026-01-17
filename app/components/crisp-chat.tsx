"use client";

import { useEffect } from "react";
import { loadCrispChat, normalizeCrispWebsiteId } from "../lib/crisp";

const crispWebsiteId = normalizeCrispWebsiteId(process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID);

export default function CrispChat() {
  useEffect(() => {
    if (!crispWebsiteId) {
      // eslint-disable-next-line no-console
      console.warn("[crisp] Missing NEXT_PUBLIC_CRISP_WEBSITE_ID; chat is disabled.");
      return;
    }

    const loaded = loadCrispChat({
      websiteId: crispWebsiteId,
      windowRef: window,
      documentRef: document,
    });
    if (!loaded) {
      // eslint-disable-next-line no-console
      console.warn("[crisp] Crisp chat could not be initialized; document head missing.");
    }
  }, []);

  return null;
}
