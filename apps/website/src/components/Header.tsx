"use client";

import { Work_Sans, Inter } from "next/font/google";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import AnnouncementBar from "@/components/AnnouncementBar";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ANNOUNCEMENT_DISMISSED_KEY = "announcement_bar_dismissed";

export function Header() {
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);

    try {
      const dismissed = localStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY) === "true";
      if (dismissed) {
        setIsAnnouncementVisible(false);
      }
    } catch {
      // Ignore storage errors and keep UI behavior unchanged.
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    try {
      if (isAnnouncementVisible) {
        localStorage.removeItem(ANNOUNCEMENT_DISMISSED_KEY);
      } else {
        localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, "true");
      }
    } catch {
      // Ignore storage errors and keep UI behavior unchanged.
    }
  }, [isAnnouncementVisible, isHydrated]);

  return (
    <>
      <AnnouncementBar
        isVisible={isAnnouncementVisible}
        onDismiss={() => setIsAnnouncementVisible(false)}
      />
      <header
        className={`${inter.className} relative z-20 mx-auto mt-5 flex w-full max-w-[1176px] items-center justify-between px-5 sm:absolute sm:left-0 sm:right-0 sm:mt-0 ${isAnnouncementVisible ? "sm:top-[94px]" : "sm:top-[30px]"}`}
      >
        <a href="/" className="flex items-center gap-3" aria-label="Go to home page">
          <img src="/logo2.svg" alt="Saatosa" className="w-[182px] h-auto" />
        </a>

        <nav className="hidden items-center gap-8 text-[18px] font-semibold leading-[30px] text-white md:flex">
          <a className="transition hover:text-white" href="/features">
            Features
          </a>
          <a className="transition hover:text-white" href="/pricing">
            Pricing
          </a>
          <a className="transition hover:text-white" href="/integrations">
            Integrations
          </a>
          <a className="transition hover:text-white" href="/blog">
            Blog
          </a>
          <a className="transition hover:text-white" href="/help">
            Docs
          </a>
        </nav>

        <a
          href="https://app.boltroute.ai/signin"
          className={`${workSans.className} inline-flex items-center gap-2 rounded-[12px] bg-[#3397f6] px-4 py-2 text-[16px] font-semibold leading-[24px] text-white transition hover:bg-[#3fa0f8]`}
        >
          Login <ArrowUpRight className="h-4 w-4" />
        </a>
      </header>
    </>
  );
}
