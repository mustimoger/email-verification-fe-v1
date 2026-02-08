"use client";

import { useEffect, useRef } from "react";

const ALLOWED_ORIGIN = "https://app.boltroute.ai";

type PricingEmbedProps = {
  parentOrigin: string;
};

export function PricingEmbed({ parentOrigin }: PricingEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeSrc = `${ALLOWED_ORIGIN}/pricing/embed?parent_origin=${encodeURIComponent(parentOrigin)}`;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== ALLOWED_ORIGIN) return;

      const data = event.data ?? {};

      if (data.type === "pricing_embed_resize") {
        if (typeof data.height === "number" && data.height > 0 && iframeRef.current) {
          iframeRef.current.style.height = `${data.height}px`;
        }
        return;
      }

      if (data.type !== "pricing_embed_cta") return;
      if (typeof data.nextPath !== "string") return;
      if (!data.nextPath.startsWith("/") || data.nextPath.startsWith("//")) return;

      const signupUrl = `${ALLOWED_ORIGIN}/signup?next=${encodeURIComponent(data.nextPath)}`;
      window.location.href = signupUrl;
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="boltroute-pricing-embed mx-auto w-full max-w-[1280px]">
      <iframe
        ref={iframeRef}
        id="boltroute-pricing-iframe"
        title="BoltRoute pricing"
        src={iframeSrc}
        width="100%"
        height={800}
        loading="lazy"
        scrolling="no"
        style={{ border: 0, display: "block", width: "100%", transition: "height 0.3s ease" }}
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
