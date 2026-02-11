import { Work_Sans, Inter } from "next/font/google";
import { Check } from "lucide-react";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export function TwoCardsSection() {
  return (
    <section
      className={`${inter.className} bg-white pt-[52px] pb-[62px] lg:pt-[52px] lg:pb-[62px]`}
    >
      <div className="mx-auto w-full max-w-[1176px] px-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card 1 */}
          <div className="flex flex-col gap-6 rounded-[12px] bg-[#3397F6] p-5 text-white lg:gap-10 lg:px-8 lg:pt-12 lg:pb-8">
            <div className="flex flex-col gap-4">
              <h3
                className={`${workSans.className} text-[24px] font-semibold leading-[31.2px] tracking-[-0.03em] text-white lg:text-[40px] lg:leading-[52px]`}
              >
                Catch‑all detection that actually works
              </h3>
              <p className="max-w-[90%] text-[16px] font-medium leading-[1.6] text-white/90">
                Most tools label catch‑all domains as “unknown” and bill you anyway.
                BoltRoute flags catch‑alls clearly so you can decide how to route them—warm up,
                retry later, or exclude.
              </p>
              <ul className="flex flex-col space-y-2.5 text-[15px] font-semibold text-white">
                {[
                  "Filter and export by catch‑all status",
                  "Better targeting for outreach sequences",
                  "Reduce surprise bounce spikes",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 rounded-full bg-white/10 px-3 py-1">
                    <Check className="h-5 w-5 text-[#F59E0B]" strokeWidth={3.5} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="aspect-[4/3] w-full rounded-[8px] bg-transparent p-0">
              <img
                src="/email-funnel.svg"
                alt="Email funnel"
                className="h-full w-full translate-y-[20px] origin-center scale-[1.4] object-contain"
              />
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col gap-6 rounded-[12px] bg-[#101214] p-5 text-white lg:gap-10 lg:px-8 lg:pt-12 lg:pb-8">
            <div className="flex flex-col gap-4">
              <h3
                className={`${workSans.className} text-[24px] font-semibold leading-[31.2px] tracking-[-0.03em] text-white lg:text-[40px] lg:leading-[52px]`}
              >
                Pay only for what you can actually use
              </h3>
              <p className="text-[16px] font-medium leading-[1.6] text-white/80">
                No inflated costs, no forced retries. You’re not charged for unknown results when
                verification can’t be definitive. Transparent pricing with zero hidden fees. Full
                visibility into every credit you spend.
              </p>
              <ul className="flex flex-col space-y-2.5 text-[15px] font-semibold text-white">
                {[
                  "Only pay for valid + invalid results",
                  "Credits never expire",
                  "No monthly minimums",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 rounded-full bg-white/10 px-3 py-1">
                    <Check
                      className="h-5 w-5 text-[#22C55E]"
                      strokeWidth={3.5}
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="aspect-[4/3] w-full rounded-[8px] bg-transparent p-0">
              <img
                src="/email-verification-pricing.svg"
                alt="Email verification pricing"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
