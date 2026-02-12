"use client";

import { openConsentBanner } from "@/lib/consent";

type CookiePreferencesButtonProps = {
  className?: string;
};

export function CookiePreferencesButton({ className }: CookiePreferencesButtonProps) {
  const mergedClassName = [
    "bg-transparent p-0 text-[16px] leading-[19.2px] text-white",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={mergedClassName}
      onClick={() => openConsentBanner("footer")}
      aria-label="Open cookie preferences"
    >
      Cookie Preferences
    </button>
  );
}
