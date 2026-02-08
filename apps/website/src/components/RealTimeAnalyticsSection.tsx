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

export function RealTimeAnalyticsSection() {
  return (
    <section
      className={`${inter.className} bg-white pt-[52px] pb-[60px] lg:pt-[52px] lg:pb-[120px]`}
    >
      <div className="mx-auto w-full max-w-[1176px] px-5">
        <div className="rounded-[12px] bg-[linear-gradient(180deg,#ffffff_0%,rgba(51,151,246,0.2)_106%)] p-6 lg:py-10 lg:pr-10 lg:pl-12">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:items-center lg:gap-[104px]">
            <div className="w-full max-w-[528px]">
              <h3
                className={`${workSans.className} text-[24px] font-semibold leading-[31.2px] tracking-[-0.03em] text-[#001726] lg:text-[40px] lg:leading-[52px]`}
              >
                Track in one dashboard
              </h3>
              <p className="mt-3 text-[15px] font-medium leading-[26.25px] text-[#001726] lg:mt-5 lg:text-[16px] lg:leading-[28px]">
                Track verification quality with clarity. See your status mix, credit usage, and
                verification history in one view.
              </p>

              <div className="mt-6 space-y-4 lg:mt-12">
                <div className="flex items-center gap-[11px]">
                  <span className="flex h-[25px] w-[25px] items-center justify-center rounded-full bg-[#3397F6] text-white">
                    {/* Icon: Check (closest match to the filled check circle) */}
                    <Check className="h-[14px] w-[14px]" strokeWidth={3} />
                  </span>
                  <span className="text-[15px] font-medium leading-[26.25px] text-[#101214] lg:text-[16px] lg:leading-[28px]">
                    Valid, Invalid, Catch-all, Disposable, Role based, Unknown
                  </span>
                </div>

                <div className="flex items-center gap-[11px]">
                  <span className="flex h-[25px] w-[25px] items-center justify-center rounded-full bg-[#3397F6] text-white">
                    {/* Icon: Check (closest match to the filled check circle) */}
                    <Check className="h-[14px] w-[14px]" strokeWidth={3} />
                  </span>
                  <span className="text-[15px] font-medium leading-[26.25px] text-[#101214] lg:text-[16px] lg:leading-[28px]">
                    Credits remaining + usage trend
                  </span>
                </div>

                <div className="flex items-center gap-[11px]">
                  <span className="flex h-[25px] w-[25px] items-center justify-center rounded-full bg-[#3397F6] text-white">
                    {/* Icon: Check (closest match to the filled check circle) */}
                    <Check className="h-[14px] w-[14px]" strokeWidth={3} />
                  </span>
                  <span className="text-[15px] font-medium leading-[26.25px] text-[#101214] lg:text-[16px] lg:leading-[28px]">
                    Export-ready history anytime
                  </span>
                </div>
              </div>
            </div>

            <div className="flex w-full justify-start lg:justify-end">
              <div className="relative w-full max-w-[560px] aspect-[1172/625]">
                <img
                  src="/validate-emails.png"
                  alt="Email validation dashboard"
                  className="absolute right-0 top-0 h-full w-full origin-top-right scale-[1.2] object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
