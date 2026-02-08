"use client";

import { ArrowRight, X } from "lucide-react";
import { useState } from "react";

type AnnouncementBarProps = {
  isVisible?: boolean;
  onDismiss?: () => void;
};

export default function AnnouncementBar({ isVisible, onDismiss }: AnnouncementBarProps) {
  const [internalVisible, setInternalVisible] = useState(true);
  const visible = isVisible ?? internalVisible;

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
      return;
    }

    setInternalVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="relative z-30 mx-3 mb-3 mt-2.5 rounded-[12px] bg-gradient-to-r from-orange-500/60 via-orange-400/60 to-yellow-400/60 px-2.5 py-2.5 text-center text-base font-medium text-white sm:absolute sm:inset-x-[50px] sm:top-[10px] sm:mx-0 sm:mb-0 sm:mt-0">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-x-2">
        <p>
          <span className="font-semibold">New:</span> Google Sheets add-on now live -- verify emails without leaving your spreadsheet.
          <a
            href="/integrations/google-sheets"
            className="ml-2 inline-flex items-center gap-1 font-semibold"
          >
            Learn More
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 transition-colors hover:bg-orange-600/20"
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4 text-white" />
      </button>
    </div>
  );
}
