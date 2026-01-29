"use client";

import { useEffect, useState } from "react";

import type { ConsentStatus } from "./consent";
import { getConsentStatus, subscribeToConsentUpdates } from "./consent";

export const useConsentStatus = (): ConsentStatus => {
  const [status, setStatus] = useState<ConsentStatus>("unknown");

  useEffect(() => {
    setStatus(getConsentStatus());
    return subscribeToConsentUpdates((update) => {
      setStatus(update.status);
    });
  }, []);

  return status;
};
