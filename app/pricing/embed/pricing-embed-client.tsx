"use client";

import { useCallback, useLayoutEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

import PricingV2Client from "../pricing-client";
import { getEmbedParentOrigins } from "../../lib/embed-config";
import type { PricingCtaPayload } from "../pricing-client";

const EMBED_PARENT_ORIGIN_PARAM = "parent_origin";
const EMBED_THEME_LOCK = "embed";

const resolveOrigin = (value?: string | null): string | null => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch (error) {
    console.warn("pricing_embed.parent_origin_parse_failed", { value, error });
    return null;
  }
};

const buildPricingNextPath = (payload: PricingCtaPayload): string => {
  const params = new URLSearchParams();
  params.set("plan", payload.plan);
  params.set("quantity", `${payload.quantity}`);
  return `/pricing?${params.toString()}`;
};

export default function PricingEmbedClient() {
  const searchParams = useSearchParams();
  const { origins: allowedOrigins } = useMemo(() => getEmbedParentOrigins(), []);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const previous = {
      theme: root.getAttribute("data-theme"),
      preference: root.getAttribute("data-theme-preference"),
      lock: root.getAttribute("data-theme-lock"),
      colorScheme: root.style.colorScheme,
    };
    root.setAttribute("data-theme-lock", EMBED_THEME_LOCK);
    root.setAttribute("data-theme", "light");
    root.setAttribute("data-theme-preference", "light");
    root.style.colorScheme = "light";
    return () => {
      if (previous.lock) {
        root.setAttribute("data-theme-lock", previous.lock);
      } else {
        root.removeAttribute("data-theme-lock");
      }
      if (previous.theme) {
        root.setAttribute("data-theme", previous.theme);
      } else {
        root.removeAttribute("data-theme");
      }
      if (previous.preference) {
        root.setAttribute("data-theme-preference", previous.preference);
      } else {
        root.removeAttribute("data-theme-preference");
      }
      if (previous.colorScheme) {
        root.style.colorScheme = previous.colorScheme;
      } else {
        root.style.colorScheme = "";
      }
    };
  }, []);

  const handleCtaClick = useCallback(
    (payload: PricingCtaPayload) => {
      if (typeof window === "undefined") return;
      if (window.top === window) {
        console.warn("pricing_embed.not_in_iframe");
        return;
      }
      if (!allowedOrigins.length) {
        console.error("pricing_embed.parent_origin_allowlist_empty");
        return;
      }

      const paramOrigin = resolveOrigin(searchParams.get(EMBED_PARENT_ORIGIN_PARAM));
      const referrerOrigin = resolveOrigin(document.referrer);
      const candidates = [paramOrigin, referrerOrigin].filter(
        (entry): entry is string => Boolean(entry),
      );
      const targetOrigin = candidates.find((entry) => allowedOrigins.includes(entry));
      if (!targetOrigin) {
        console.error("pricing_embed.parent_origin_untrusted", {
          candidates,
          allowedOrigins,
          referrer: document.referrer,
        });
        return;
      }

      const message = {
        type: "pricing_embed_cta",
        nextPath: buildPricingNextPath(payload),
        plan: payload.plan,
        quantity: payload.quantity,
        mode: payload.mode,
        interval: payload.interval,
        contactRequired: payload.contactRequired,
      };

      window.parent.postMessage(message, targetOrigin);
    },
    [allowedOrigins, searchParams],
  );

  return <PricingV2Client variant="embed" onCtaClick={handleCtaClick} />;
}
