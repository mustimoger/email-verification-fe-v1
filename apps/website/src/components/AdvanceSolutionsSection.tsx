import { Work_Sans, Inter } from "next/font/google";
import { AlertTriangle, ShieldAlert, CreditCard, Database } from "lucide-react";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export function AdvanceSolutionsSection() {
  return (
    <section className={`${inter.className} bg-white pt-[62px] pb-[62px]`}>
      <div className="mx-auto w-full max-w-[1176px] px-5">
        <div className="flex w-full flex-col items-start gap-[30px] lg:flex-row lg:items-center lg:justify-between lg:gap-[59px]">
          <div className="flex w-full flex-col gap-6 lg:w-[576px] lg:gap-12">
            <div className="flex flex-col gap-3 lg:gap-6">
              <span className="inline-flex w-fit items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-[#001726]">
                Beyond Bounces
              </span>

              <h2
                className={`${workSans.className} text-[36px] font-semibold leading-[43.2px] tracking-[-0.03em] text-[#001726] lg:text-[48px] lg:leading-[57.6px]`}
              >
                Bounces don’t just hurt a campaign. They hurt your domain
              </h2>

              <p className="max-w-[576px] text-[18px] font-medium leading-[30px] text-[#696969]">
                One dirty list can trigger spam placement, throttling, or blocks—especially
                for cold outreach and new domains.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {[
                {
                  icon: AlertTriangle,
                  text: "Hard bounces damage sender reputation and deliverability",
                },
                {
                  icon: ShieldAlert,
                  text: "Catch-all domains hide risk (and many tools charge you anyway)",
                },
                {
                  icon: CreditCard,
                  text: "Bad leads waste spend in Instantly/Apollo/HubSpot/Salesforce",
                },
                {
                  icon: Database,
                  text: "List hygiene becomes a manual mess across spreadsheets and CRMs",
                },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <span className="mt-[2px] rounded-full bg-[#EAF2FF] p-2 text-[#3397F6]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="text-[16px] font-medium leading-[26px] text-[#001726]">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex w-full justify-start rounded-[16px] bg-[#EAF2FF] p-5 lg:flex-1 lg:justify-end lg:p-8">
            <div className="pointer-events-none absolute inset-0 rounded-[16px] bg-black/50" />
            <div className="relative z-0 overflow-visible">
              {/* Replace with actual product screenshot */}
              <div className="relative h-[340px] w-full max-w-[308px] rounded-[12px] md:h-[488px] md:max-w-[442px] lg:h-[550px] lg:max-w-none">
                <img
                  src="/send-email.svg"
                  alt="Send email"
                  className="h-full w-full rounded-[12px] object-cover"
                />
              </div>

              <img
                src="/email-reputation.svg"
                alt="Email reputation"
                className="absolute -left-[82px] top-1/2 z-20 h-[249px] w-[257px] -translate-y-1/2 opacity-80 md:-left-[90px] md:h-[359px] md:w-[368px] lg:-left-[98px] lg:h-[282px] lg:w-[290px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
