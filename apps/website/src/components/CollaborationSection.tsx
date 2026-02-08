import { Work_Sans, Inter } from "next/font/google";
import { Check, ArrowRight } from "lucide-react";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export function CollaborationSection() {
  return (
    <section
      className={`${inter.className} bg-white pt-[60px] pb-[62px] lg:pt-[120px] lg:pb-[62px]`}
    >
      <div className="mx-auto w-full max-w-[1176px] px-5">
        <div className="grid grid-cols-1 items-center gap-10 md:gap-12 lg:grid-cols-2 lg:gap-[88px]">
          <div className="relative mx-auto w-full max-w-[520px] lg:mx-0 lg:w-[620px] lg:max-w-none lg:-ml-[50px]">
            <div className="relative">
              <img
                src="/catch-all-verification.png"
                alt="Team member collaborating"
                className="w-full rounded-[10px] object-cover object-top-left aspect-[1220/1010]"
              />

              <img
                src="/no-bounce.svg"
                alt="No bounce card"
                className="absolute bottom-6 right-[46px] w-[240px] md:bottom-8 md:right-[30px] md:w-[270px] lg:bottom-[72px] lg:-right-[40px] lg:w-[300px]"
              />
            </div>
          </div>

          <div className="w-full lg:max-w-[574px]">
            <h2
              className={`${workSans.className} text-[32px] font-semibold leading-[40px] tracking-[-0.03em] text-[#001726] md:text-[40px] md:leading-[48px] lg:text-[48px] lg:leading-[57.6px]`}
            >
              <span className="block">Built for teams who</span>
              <span className="block">send email at scale</span>
            </h2>

            <p className="mt-6 text-[15px] font-medium leading-[26.25px] text-[#696969] lg:text-[16px] lg:leading-[28px]">
              Cold outreach, marketing, and product teams use BoltRoute to keep
              bounce rates low and reputation clean.
            </p>

            <div className="mt-10 space-y-4">
              {[
                "Cold outreach: verify leads before sequences",
                "Email marketing: clean lists before campaigns",
                "Signup flows: block obvious bad addresses",
                "RevOps: keep HubSpot/Salesforce clean",
              ].map((item) => (
                <div key={item} className="flex items-center gap-[11px]">
                  <span className="flex h-[25px] w-[25px] items-center justify-center rounded-full bg-[#3397F6] text-white">
                    {/* Icon: Check (filled circle in the design) */}
                    <Check className="h-[13px] w-[13px]" strokeWidth={3} />
                  </span>
                  <span className="text-[15px] font-medium leading-[26.25px] text-[#101214] lg:text-[16px] lg:leading-[28px]">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <a
              href="https://app.boltroute.ai/signup"
              className="mt-10 inline-flex items-center gap-1 rounded-[12px] bg-[#3397F6] px-6 py-4 text-[16px] font-semibold leading-[24px] text-white transition-colors hover:bg-[#2C89E8]"
            >
              Start free — 100 verifications
              {/* Icon: ArrowRight rotated to match the angled arrow in the design */}
              <ArrowRight className="-rotate-45 h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
