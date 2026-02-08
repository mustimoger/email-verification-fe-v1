import type { Metadata } from "next";
import { Inter, Work_Sans } from "next/font/google";
import { helpHtml, helpStyles } from "./helpContent";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-help-inter",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-help-work",
});

export const metadata: Metadata = {
  title: "Help Center | BoltROUTE",
  description:
    "How to use BoltRoute to verify emails, understand results, manage credits, and set up integrations.",
  alternates: {
    canonical: "/help",
  },
};

const HERO_GRADIENT =
  "linear-gradient(113deg,#101214 36%,#3348F6 73.7904%,#3398F6 87%,#32D9F6 94.1407%,#FFFFFF 100%)";

export default function HelpPage() {
  return (
    <main
      id="scroll-trigger"
      className={`${inter.className} ${inter.variable} ${workSans.variable} min-h-screen bg-[#f9f9f9]`}
    >
      <section
        className="flex overflow-hidden px-0 pb-[60px] pt-[120px] text-white lg:pb-[120px] lg:pt-[200px]"
        style={{ background: HERO_GRADIENT }}
      >
        <div className="mx-auto w-full max-w-[1176px] px-5">
          <div className="mx-auto flex w-full max-w-[350px] flex-col items-center gap-4 text-center lg:max-w-[777px] lg:gap-6">
            <span className="inline-flex items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-white">
              Help Center
            </span>

            <h1
              className={`${workSans.className} text-[40px] font-semibold leading-[50px] tracking-[-1.2px] text-white lg:text-[64px] lg:leading-[80px] lg:tracking-[-1.92px]`}
            >
              How to Use BoltRoute
            </h1>

            <p className="text-[16px] font-medium leading-[26.6667px] text-[#F0F3F6] lg:text-[18px] lg:leading-[30px]">
              Everything you need to verify emails, manage credits, and integrate with your
              workflow. Get started in minutes.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-20 pt-[50px]">
        <style dangerouslySetInnerHTML={{ __html: helpStyles }} />
        <div dangerouslySetInnerHTML={{ __html: helpHtml }} />
      </section>
    </main>
  );
}
