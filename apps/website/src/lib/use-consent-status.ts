"use client";

import { useEffect, useState } from "react";

import type { ConsentStatus } from "@/lib/consent";
import { getConsentStatus, subscribeToConsentUpdates } from "@/lib/consent";

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
