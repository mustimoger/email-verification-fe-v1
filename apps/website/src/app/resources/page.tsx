import type { Metadata } from "next";
import { Inter, Work_Sans } from "next/font/google";
import { Hammer } from "lucide-react";
import { getToolsPageCards } from "@/lib/tools/tools-pages";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const HERO_GRADIENT =
  "linear-gradient(113deg,#101214 36%,#3348F6 73.7904%,#3398F6 87%,#32D9F6 94.1407%,#FFFFFF 100%)";

const toolsCards = getToolsPageCards();

export const metadata: Metadata = {
  title: "Resources | BoltRoute",
  description:
    "Explore BoltRoute tools and landing resources for verification APIs, list hygiene, enrichment workflows, and deliverability operations.",
  alternates: {
    canonical: "/resources",
  },
};

export default function ToolsPage() {
  return (
    <main id="scroll-trigger" className="min-h-screen bg-white">
      <section
        className={`${inter.className} flex overflow-hidden px-0 pb-[100px] pt-[200px] text-white`}
        style={{ background: HERO_GRADIENT }}
      >
        <div className="mx-auto w-full max-w-[1176px] px-5">
          <div className="mx-auto flex w-full max-w-[860px] flex-col items-center text-center">
            <span className="inline-flex items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-white">
              Landing Tools
            </span>

            <h1
              className={`${workSans.className} mt-6 text-[40px] font-semibold leading-[50px] tracking-[-0.03em] text-white lg:text-[64px] lg:leading-[80px]`}
            >
              Everything You Need for Clean, Verified Email Lists
            </h1>

            <p className="mt-6 text-[16px] font-medium leading-[26.67px] text-[#F0F3F6] lg:text-[18px] lg:leading-[30px]">
              Find every BoltRoute landing resource for verification, enrichment, and deliverability in
              one place. Pick the workflow you need and go directly to implementation details.
            </p>
          </div>
        </div>
      </section>

      <section className={`${inter.className} bg-white pb-20 pt-16 lg:pb-24 lg:pt-20`}>
        <div className="mx-auto w-full max-w-[1176px] px-5">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {toolsCards.map((card) => (
              <article
                key={card.slug}
                className="flex h-full flex-col overflow-hidden rounded-[14px] border border-[#001726]/10 bg-white shadow-[0_10px_24px_rgba(0,0,0,0.06)]"
              >
                <div className="flex h-[160px] w-full items-center justify-center bg-[linear-gradient(180deg,#f7f9fc_0%,#edf2f9_100%)]">
                  {card.imageSrc ? (
                    <img
                      src={card.imageSrc}
                      alt={card.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dbeafe] text-[#1d4ed8]">
                      <Hammer className="h-6 w-6" aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="flex h-full flex-col p-6">
                  <h2
                    className={`${workSans.className} text-[22px] font-semibold leading-[30px] tracking-[-0.02em] text-[#001726]`}
                  >
                    {card.title}
                  </h2>
                  <p className="mt-3 text-[16px] font-medium leading-[27px] text-[#4B5563]">
                    {card.description}
                  </p>

                  <a
                    href={card.href}
                    className={`${workSans.className} mt-6 inline-flex w-fit items-center rounded-[10px] bg-[#3397F6] px-4 py-2 text-[15px] font-semibold leading-[24px] text-white transition hover:bg-[#2d89e0]`}
                  >
                    View Tool
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
