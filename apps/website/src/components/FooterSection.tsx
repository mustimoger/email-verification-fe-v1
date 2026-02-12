import { Work_Sans, Inter } from "next/font/google";

import { NewsletterSignupForm } from "@/components/NewsletterSignupForm";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export function FooterSection() {
  return (
    <footer className={`${inter.className} bg-[#101214] pt-[60px] pb-6 lg:pt-[80px]`}>
      <div className="mx-auto w-full max-w-[1176px] px-5">
        <div className="grid grid-cols-1 gap-[30px] lg:grid-cols-[0.77fr_1fr] lg:gap-x-20">
          <div className="flex flex-col">
            <h5
              className={`${workSans.className} text-[18px] font-semibold leading-[24px] tracking-[-0.02em] text-white lg:text-[24px] lg:leading-[32px]`}
            >
              Get Our Newsletters
            </h5>
            <div className="mt-4 lg:mt-8">
              <NewsletterSignupForm buttonFontClassName={workSans.className} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-[58px]">
            <div className="flex flex-col">
              <h5
                className={`${workSans.className} whitespace-nowrap text-[18px] font-semibold leading-[24px] tracking-[-0.02em] text-white lg:text-[24px] lg:leading-[32px]`}
              >
                Product
              </h5>
              <div className="mt-4 flex flex-col gap-3 lg:mt-8">
                {[
                  { label: "Features", href: "/features" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "Integrations", href: "/integrations" },
                  { label: "Setup Guide", href: "/setup-guide" },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="text-[15px] font-medium leading-[26.25px] text-white transition-colors hover:text-[#FEFFFF] md:text-[16px] md:leading-[28px]"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-col">
              <h5
                className={`${workSans.className} text-[18px] font-semibold leading-[24px] tracking-[-0.02em] text-white lg:text-[24px] lg:leading-[32px]`}
              >
                Resources
              </h5>
              <div className="mt-4 flex flex-col gap-3 lg:mt-8">
                {[
                  { label: "Blog", href: "/blog" },
                  { label: "Resources", href: "/resources" },
                  { label: "Help", href: "/help" },
                  { label: "Contact", href: "/contact" },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="text-[15px] font-medium leading-[26.25px] text-white transition-colors hover:text-[#FEFFFF] md:text-[16px] md:leading-[28px]"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-col">
              <h5
                className={`${workSans.className} whitespace-nowrap text-[18px] font-semibold leading-[24px] tracking-[-0.02em] text-white lg:text-[24px] lg:leading-[32px]`}
              >
                Get In Touch
              </h5>
              <div className="mt-4 flex flex-col gap-3 lg:mt-8">
                <a
                  href="mailto:sales@boltroute.ai"
                  className="text-[15px] font-medium leading-[26.25px] text-white transition-colors hover:text-[#FEFFFF] md:text-[16px] md:leading-[28px]"
                >
                  sales@boltroute.ai
                </a>
                <a
                  href="https://www.google.com/maps"
                  className="text-[15px] font-medium leading-[26.25px] text-white transition-colors hover:text-[#FEFFFF] md:text-[16px] md:leading-[28px]"
                >
                  Premier Campus Istanbul / TURKIYE
                </a>
                <a
                  href="tel:+902165229890"
                  className="text-[15px] font-medium leading-[26.25px] text-white transition-colors hover:text-[#FEFFFF] md:text-[16px] md:leading-[28px]"
                >
                  +90 (216) 522 98 90
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-10 lg:mt-16">
          <div className="relative h-px w-full bg-white/10" />

          <div className="mt-6 flex flex-col items-center gap-3 text-center lg:flex-row lg:items-end lg:justify-between lg:text-right">
            <a href="/" className="flex items-center justify-center" aria-label="Go to home page">
              <img src="/logo2.svg" alt="Logo" className="w-[182px] h-auto" />
            </a>
            <div className="flex flex-wrap items-center justify-center gap-3 text-[16px] leading-[19.2px] text-white lg:flex-nowrap lg:items-end lg:justify-center lg:whitespace-nowrap">
              {[
                { label: "Privacy", href: "/privacy-policy" },
                { label: "Terms", href: "/terms" },
                { label: "GDPR", href: "/gdpr-compliance" },
                { label: "Refunds", href: "/refund-policy" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="transition-colors hover:text-[#FEFFFF]"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[16px] leading-[19.2px] text-white lg:flex-nowrap lg:justify-end lg:whitespace-nowrap">
              <span>Copyright</span>
              <span className="font-bold text-[#3397F6]">@2026</span>
              <span>BoltROUTE All Rights Reserved</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
