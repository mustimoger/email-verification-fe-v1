import type { Metadata } from "next";
import { Inter, Work_Sans } from "next/font/google";
import { headers } from "next/headers";
import { PricingEmbed } from "@/components/PricingEmbed";
import PricingComparison from "@/components/PricingComparison";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Pricing | BoltROUTE",
  description:
    "Transparent credit-based pricing for email verification with one-time, monthly, and annual options.",
  alternates: {
    canonical: "/pricing",
  },
};

const HERO_GRADIENT =
  "linear-gradient(113deg,#101214 36%,#3348F6 73.7904%,#3398F6 87%,#32D9F6 94.1407%,#FFFFFF 100%)";

const comparisonRows = [
  ["Billing Frequency", "One-time", "Monthly", "Annual"],
  ["Credits Rollover", "Never expire", "Yes", "Yes"],
  ["Discount", "None", "30% off", "50% off"],
  ["Credit Expiry", "Never", "Never", "Never"],
  ["Price per Email", "Standard", "Lower", "Lowest"],
  ["Best For", "Small jobs", "Regular", "Heavy users"],
  ["Minimum Purchase", "2K credits", "2K/month", "2K/month"],
  ["Flexibility", "High", "Medium", "High value"],
  ["Commitment", "None", "Cancel anytime", "Best savings"],
] as const;

export default function PricingPage() {
  const headerStore = headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "boltroute.ai";
  const proto =
    headerStore.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const parentOrigin = `${proto}://${host}`;

  return (
    <main id="scroll-trigger" className={`${inter.className} min-h-screen bg-[#f9f9f9] text-[#111111]`}>
      <section
        className="flex overflow-hidden px-0 pb-[60px] pt-[120px] text-white lg:pb-[90px] lg:pt-[200px]"
        style={{ background: HERO_GRADIENT }}
      >
        <div className="mx-auto w-full max-w-[1176px] px-5">
          <div className="mx-auto flex w-full max-w-[350px] flex-col items-center gap-4 text-center lg:max-w-[777px] lg:gap-6">
            <span className="inline-flex items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-white">
              Pricing
            </span>

            <h1
              className={`${workSans.className} text-[40px] font-semibold leading-[50px] tracking-[-1.2px] text-white lg:text-[64px] lg:leading-[80px] lg:tracking-[-1.92px]`}
            >
              Cold Outreach Pricing That Actually Makes Sense
            </h1>

            <p className="text-[16px] font-medium leading-[26.6667px] text-[#F0F3F6] lg:text-[18px] lg:leading-[30px]">
              Credits never expire. No charge for unknown emails.
            </p>
          </div>
        </div>
      </section>

      <section className="-mt-[24px] px-5 pb-[48px] lg:-mt-[50px] lg:pb-[50px]">
        <PricingEmbed parentOrigin={parentOrigin} />
      </section>

      <section className="bg-white px-5 py-[50px]">
        <div className="mx-auto w-full max-w-[1320px]">
          <h2
            className={`${workSans.className} text-center text-[30px] font-medium leading-[38px] text-[#111111] lg:text-[36px] lg:leading-[43.2px]`}
          >
            <span className={`${inter.className} font-light`}>Compare</span> &amp; Find The Right Plan
            <br />
            For Your Needs
          </h2>

          <div className="mt-7 overflow-x-auto lg:px-[100px]">
            <table className="min-w-[760px] w-full border border-[#808080] text-left text-[16.8px] leading-[26.04px] text-[#111111]">
              <thead>
                <tr>
                  <th className="px-[8.4px] py-[8.4px] font-bold">FEATURE</th>
                  <th className="px-[8.4px] py-[8.4px] font-bold">ONE-TIME</th>
                  <th className="px-[8.4px] py-[8.4px] font-bold">MONTHLY</th>
                  <th className="px-[8.4px] py-[8.4px] font-bold">ANNUAL</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, index) => (
                  <tr key={row[0]} className={`border-t border-[#808080] ${index % 2 === 0 ? "bg-[#f0f0f0]" : ""}`}>
                    <td className="px-[8.4px] py-[8.4px]">{row[0]}</td>
                    <td className="px-[8.4px] py-[8.4px]">{row[1]}</td>
                    <td className="px-[8.4px] py-[8.4px]">{row[2]}</td>
                    <td className="px-[8.4px] py-[8.4px]">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="px-5 pb-[70px] pt-[10px]">
        <div className="mx-auto w-full max-w-[1320px]">
          <p className="text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-[#64748b]">
            AS OF FEB 2026
          </p>
          <div className="mt-4">
            <PricingComparison />
          </div>
        </div>
      </section>
    </main>
  );
}
