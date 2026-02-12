"use client";

import { useEffect } from "react";
import Script from "next/script";

import { useConsentStatus } from "@/lib/use-consent-status";

type WindowWithGtag = Window & {
  gtag?: (...args: unknown[]) => void;
  [key: string]: unknown;
};

const normalizeMeasurementId = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const measurementId = normalizeMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

export function WebsiteAnalytics() {
  const consentStatus = useConsentStatus();

  useEffect(() => {
    if (measurementId) {
      return;
    }
    // eslint-disable-next-line no-console
    console.warn("website.analytics.measurement_id_missing", {
      env: "NEXT_PUBLIC_GA_MEASUREMENT_ID",
    });
  }, []);

  useEffect(() => {
    if (!measurementId || typeof window === "undefined") {
      return;
    }

    const windowRef = window as unknown as WindowWithGtag;
    const disableFlag = `ga-disable-${measurementId}`;

    if (consentStatus === "accepted") {
      windowRef[disableFlag] = false;
      if (typeof windowRef.gtag === "function") {
        windowRef.gtag("consent", "update", { analytics_storage: "granted" });
      }
      return;
    }

    if (consentStatus === "rejected") {
      windowRef[disableFlag] = true;
      if (typeof windowRef.gtag === "function") {
        windowRef.gtag("consent", "update", { analytics_storage: "denied" });
      }
    }
  }, [consentStatus]);

  if (!measurementId || consentStatus !== "accepted") {
    return null;
  }

  return (
    <>
      <Script
        id="website-ga4-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="website-ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', { analytics_storage: 'granted' });
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
