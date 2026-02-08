import { Work_Sans, Inter } from "next/font/google";
import Image from "next/image";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export function GetStartedSection() {
  return (
    <section
      className={`${inter.className} bg-white py-[60px] lg:pt-[120px] lg:pb-[124px]`}
    >
      <div className="mx-auto w-full max-w-[1176px] px-5">
        <div className="relative rounded-[12px] bg-[linear-gradient(107deg,#101214_36%,#3348F6_73.7904%,#3398F6_80.5739%,#32D9F6_94.1407%,#FFFFFF_100%)] p-[18px] lg:py-[40px] lg:pl-[56px] lg:pr-[40px]">
          <div className="grid grid-cols-1 gap-[30px] lg:grid-cols-2 lg:items-center lg:gap-0">
            <div className="flex w-full flex-col pt-[10px] lg:max-w-[520px]">
              <span className="inline-flex w-fit items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-white">
                Get Started
              </span>

              <h3
                className={`${workSans.className} mt-6 text-[24px] font-semibold leading-[31.2px] tracking-[-0.03em] text-white lg:text-[40px] lg:leading-[52px]`}
              >
                Verify Your First 100 Emails Free
              </h3>

              <p className="mt-[18px] text-[15px] font-medium leading-[26.25px] text-[#EFF2F5] lg:mt-6 lg:text-[16px] lg:leading-[28px]">
                No credit card required. Results in under 60 seconds.
              </p>

              <a
                href="https://app.boltroute.ai/signup"
                className="mt-6 inline-flex h-[52px] w-fit items-center rounded-[12px] bg-[#3397F6] px-6 text-[15px] font-semibold leading-[22.5px] text-white transition-colors hover:bg-[#2C89E8] lg:mt-12 lg:text-[16px] lg:leading-[24px]"
              >
                Start Free Trial
              </a>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] font-medium leading-[20px] text-white lg:text-[14px]">
                <span>✓ 99%+ accuracy</span>
                <span>✓ Credits never expire</span>
                <span>✓ Cancel anytime</span>
              </div>
            </div>

            <div className="relative w-full aspect-[497/418] lg:justify-self-end lg:max-w-[497px]">
              <div className="pointer-events-none absolute -right-[110px] -top-[170px] hidden h-[352px] w-[400px] rounded-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95)_0%,_rgba(255,255,255,0)_70%)] lg:block" />

              <div className="absolute right-0 top-0 h-[92%] w-[73%] bg-transparent">
                <Image
                  src="/summary.svg"
                  alt="Verification results summary"
                  width={420}
                  height={420}
                  className="h-full w-full scale-[1.14] object-contain"
                  sizes="(min-width: 1024px) 360px, 70vw"
                />
              </div>

              <div className="absolute bottom-[12px] left-0 h-[55%] w-[49%] overflow-hidden rounded-[8px] bg-transparent p-0 lg:bottom-[24px]">
                <Image
                  src="/no-bounce.svg"
                  alt="No bounce"
                  width={260}
                  height={180}
                  className="h-full w-full object-contain opacity-90"
                  sizes="(min-width: 1024px) 220px, 45vw"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
