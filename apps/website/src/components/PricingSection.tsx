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

export function PricingSection() {
  return (
    <section
      className={`${inter.className} bg-[linear-gradient(316deg,_#FFFFFF_0%,_#32D9F6_10.48%,_#3398F6_18.29%,_#3348F6_27.53%,_#101214_63.08%,_#101214_100%)] py-[60px] lg:py-[120px]`}
    >
      <div className="mx-auto w-full max-w-[1176px] px-5">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-white">
            Core Features
          </span>
          <h2
            className={`${workSans.className} mt-[14px] text-[36px] font-semibold leading-[43.2px] tracking-[-0.03em] text-white lg:mt-4 lg:text-[48px] lg:leading-[57.6px]`}
          >
            Easy to Start, Easy to Scale
          </h2>
          <p className="mt-[18px] max-w-[776px] text-[15px] font-medium leading-[26.25px] text-[#EFF2F5] lg:mt-6 lg:text-[16px] lg:leading-[28px]">
            We take pride in our attention to detail and commitment to customer satisfaction.
          </p>

          <div className="mt-[30px] flex items-center gap-5 lg:mt-12">
            <span className="text-[18px] font-semibold leading-[30px] text-white">
              Monthly
            </span>
            {/* Static toggle (visual only). */}
            <div className="relative h-[30px] w-[60px] rounded-[17px] bg-[#3397F6]">
              <span className="absolute left-[5px] top-[5px] h-[20px] w-[20px] rounded-full bg-white" />
            </div>
            <span className="text-[18px] font-normal leading-[30px] text-white">
              Yearly
            </span>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Regular Plan */}
          <div className="rounded-[12px] bg-white p-8 text-left lg:px-[40px] lg:pt-[46px] lg:pb-[48px]">
            <h3
              className={`${workSans.className} text-[16px] font-semibold leading-[22.4px] tracking-[-0.02em] text-[#001726] lg:text-[20px] lg:leading-[28px]`}
            >
              Regular Plan
            </h3>
            <div className="mt-[6px] flex items-end gap-1">
              <span
                className={`${workSans.className} text-[36px] font-semibold leading-[43.2px] tracking-[-0.03em] text-[#001726] lg:text-[48px] lg:leading-[57.6px]`}
              >
                $15.00
              </span>
              <span className="text-[15px] font-medium leading-[26.25px] text-[#696969] lg:text-[16px] lg:leading-[28px]">
                / Per month
              </span>
            </div>

            <div className="mt-5 h-px w-full bg-[rgba(16,18,20,0.1)] lg:mt-6" />
            <p className="mt-5 text-[15px] font-medium leading-[26.25px] text-[#696969] lg:mt-6 lg:text-[16px] lg:leading-[28px]">
              Free for personal use
            </p>

            <ul className="mt-6 space-y-5 lg:space-y-6">
              <li className="flex items-start gap-[10px]">
                {/* Lucide Check is the closest match to the filled checkmark in the reference. */}
                <Check className="mt-[2px] h-5 w-5 text-[#101214]" />
                <span className="text-[15px] font-medium leading-[26.25px] text-[#101214] lg:text-[16px] lg:leading-[28px]">
                  2 Limited sites available
                </span>
              </li>
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-[#101214]" />
                <span className="text-[15px] font-medium leading-[26.25px] text-[#101214] lg:text-[16px] lg:leading-[28px]">
                  1 GB storage per site
                </span>
              </li>
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-[#101214]" />
                <span className="text-[15px] font-medium leading-[26.25px] text-[#101214] lg:text-[16px] lg:leading-[28px]">
                  Up to 5 pages per site
                </span>
              </li>
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-[#101214]" />
                <span className="text-[15px] font-medium leading-[26.25px] text-[#696969] lg:text-[16px] lg:leading-[28px]">
                  Free SSL for custom domain
                </span>
              </li>
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-[#101214]" />
                <span className="text-[15px] font-medium leading-[26.25px] text-[#696969] lg:text-[16px] lg:leading-[28px]">
                  Connect custom domain
                </span>
              </li>
            </ul>

            <button
              className={`${workSans.className} mt-8 inline-flex w-full items-center justify-center rounded-[12px] bg-[#101214] px-5 py-3 text-[15px] font-semibold leading-[22.5px] text-white lg:mt-10 lg:px-6 lg:py-4 lg:text-[16px] lg:leading-[24px]`}
              type="button"
            >
              Choose Plan
            </button>
          </div>

          {/* Standard Plan */}
          <div className="rounded-[12px] bg-[#3397F6] p-8 text-left lg:px-[40px] lg:pt-[46px] lg:pb-[48px]">
            <h3
              className={`${workSans.className} text-[16px] font-semibold leading-[22.4px] tracking-[-0.02em] text-white lg:text-[20px] lg:leading-[28px]`}
            >
              Standard Plan
            </h3>
            <div className="mt-[6px] flex items-end gap-1">
              <span
                className={`${workSans.className} text-[36px] font-semibold leading-[43.2px] tracking-[-0.03em] text-white lg:text-[48px] lg:leading-[57.6px]`}
              >
                $29.00
              </span>
              <span className="text-[15px] font-medium leading-[26.25px] text-white lg:text-[16px] lg:leading-[28px]">
                / Per month
              </span>
            </div>

            <div className="mt-5 h-px w-full bg-[rgba(16,18,20,0.1)] lg:mt-6" />
            <p className="mt-5 text-[15px] font-medium leading-[26.25px] text-white lg:mt-6 lg:text-[16px] lg:leading-[28px]">
              For startups, billed monthly
            </p>

            <ul className="mt-6 space-y-5 lg:space-y-6">
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-white" />
                <span className="text-[15px] font-medium leading-[26.25px] text-white lg:text-[16px] lg:leading-[28px]">
                  5 Limited sites available
                </span>
              </li>
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-white" />
                <span className="text-[15px] font-medium leading-[26.25px] text-white lg:text-[16px] lg:leading-[28px]">
                  5 GB storage per site
                </span>
              </li>
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-white" />
                <span className="text-[15px] font-medium leading-[26.25px] text-white lg:text-[16px] lg:leading-[28px]">
                  Up to 15 pages per site
                </span>
              </li>
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-white" />
                <span className="text-[15px] font-medium leading-[26.25px] text-white lg:text-[16px] lg:leading-[28px]">
                  Free SSL for custom domain
                </span>
              </li>
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-white" />
                <span className="text-[15px] font-medium leading-[26.25px] text-white lg:text-[16px] lg:leading-[28px]">
                  Connect custom domain
                </span>
              </li>
            </ul>

            <button
              className={`${workSans.className} mt-8 inline-flex w-full items-center justify-center rounded-[12px] bg-white px-5 py-3 text-[15px] font-semibold leading-[22.5px] text-[#101214] lg:mt-10 lg:px-6 lg:py-4 lg:text-[16px] lg:leading-[24px]`}
              type="button"
            >
              Choose Plan
            </button>
          </div>

          {/* Premium Plan */}
          <div className="rounded-[12px] bg-white p-8 text-left lg:px-[40px] lg:pt-[46px] lg:pb-[48px]">
            <h3
              className={`${workSans.className} text-[16px] font-semibold leading-[22.4px] tracking-[-0.02em] text-[#001726] lg:text-[20px] lg:leading-[28px]`}
            >
              Premium Plan
            </h3>
            <div className="mt-[6px] flex items-end gap-1">
              <span
                className={`${workSans.className} text-[36px] font-semibold leading-[43.2px] tracking-[-0.03em] text-[#001726] lg:text-[48px] lg:leading-[57.6px]`}
              >
                $49.00
              </span>
              <span className="text-[15px] font-medium leading-[26.25px] text-[#696969] lg:text-[16px] lg:leading-[28px]">
                / Per month
              </span>
            </div>

            <div className="mt-5 h-px w-full bg-[rgba(16,18,20,0.1)] lg:mt-6" />
            <p className="mt-5 text-[15px] font-medium leading-[26.25px] text-[#696969] lg:mt-6 lg:text-[16px] lg:leading-[28px]">
              For scaling, billed monthly
            </p>

            <ul className="mt-6 space-y-5 lg:space-y-6">
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-[#101214]" />
                <span className="text-[15px] font-medium leading-[26.25px] text-[#101214] lg:text-[16px] lg:leading-[28px]">
                  10 Limited sites available
                </span>
              </li>
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-[#101214]" />
                <span className="text-[15px] font-medium leading-[26.25px] text-[#101214] lg:text-[16px] lg:leading-[28px]">
                  10 GB storage per site
                </span>
              </li>
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-[#101214]" />
                <span className="text-[15px] font-medium leading-[26.25px] text-[#101214] lg:text-[16px] lg:leading-[28px]">
                  Up to 20 pages per site
                </span>
              </li>
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-[#101214]" />
                <span className="text-[15px] font-medium leading-[26.25px] text-[#696969] lg:text-[16px] lg:leading-[28px]">
                  Free SSL for custom domain
                </span>
              </li>
              <li className="flex items-start gap-[10px]">
                <Check className="mt-[2px] h-5 w-5 text-[#101214]" />
                <span className="text-[15px] font-medium leading-[26.25px] text-[#696969] lg:text-[16px] lg:leading-[28px]">
                  Connect custom domain
                </span>
              </li>
            </ul>

            <button
              className={`${workSans.className} mt-8 inline-flex w-full items-center justify-center rounded-[12px] bg-[#101214] px-5 py-3 text-[15px] font-semibold leading-[22.5px] text-white lg:mt-10 lg:px-6 lg:py-4 lg:text-[16px] lg:leading-[24px]`}
              type="button"
            >
              Choose Plan
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
