import { Work_Sans, Inter } from "next/font/google";
import { ArrowUpRight, CheckCircle2, Star } from "lucide-react";
import { CountUp } from "./CountUp";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

type HeroSectionProps = {
  backgroundVideoSrc?: string;
};

const HERO_GRADIENT =
  "linear-gradient(133deg, #101214 36%, #3348F6 73.7904%, #3398F6 80.5739%, #32D9F6 94.1407%, #FFFFFF 100%)";

export function HeroSection({ backgroundVideoSrc }: HeroSectionProps) {
  const logos = [
    { src: "/azerion_logo.png", alt: "Azerion" },
    { src: "/merit-logo.png", alt: "Merit", sizeClass: "h-[72px]" },
    { src: "/telconet-logo.svg", alt: "Telconet" },
    { src: "/medassist-logo.png", alt: "Medassist", shiftClass: "-translate-x-[10px]" },
    { src: "/wmcommon-logo.png", alt: "WMCommon", shiftClass: "-translate-x-[20px]" },
    {
      src: "/3d-logo.svg",
      alt: "3D",
      sizeClass: "h-[70px] -translate-y-[5px]",
      shiftClass: "-translate-x-[20px]",
    },
  ];

  return (
    <section
      className={`${inter.className} relative overflow-hidden text-white`}
      style={{ background: backgroundVideoSrc ? "#101214" : HERO_GRADIENT }}
    >
      {backgroundVideoSrc ? (
        <div className="absolute inset-0 z-0">
          <video
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            tabIndex={-1}
          >
            <source src={backgroundVideoSrc} type="video/webm" />
          </video>
          <div
            className="absolute inset-0"
            style={{ background: HERO_GRADIENT, opacity: 0.7 }}
          />
        </div>
      ) : null}

      <div className="relative z-10 mx-auto max-w-[1176px] px-5 pb-[120px] pt-[200px]">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="max-w-xl">
            <span className="inline-flex items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[21px] font-medium leading-[22px] text-white">
              <CountUp
                to={300}
                respectReducedMotion={false}
                className="tabular-nums"
              />
              M+ Emails Verified
            </span>
            <h1
              className={`${workSans.className} mt-6 text-[40px] font-semibold leading-[50px] tracking-[-0.03em] text-white sm:text-[48px] sm:leading-[60px] lg:text-[64px] lg:leading-[80px]`}
            >
              Email Verification Built{" "}
              <span className="italic font-normal">For Cold Outreach</span>
            </h1>
            <p className="mt-5 text-[18px] font-medium leading-[30px] text-white">
              Keep bounce rates low, protect warm-up domains, and route catch-alls safely.
              Verify in bulk, inside your workflows, or via API—without paying for unknowns.
            </p>
            <div className="mt-7">
              <a
                href="https://app.boltroute.ai/signup"
                className="inline-flex items-center gap-3 rounded-[12px] bg-[#3397f6] px-[24px] py-[16px] text-white transition hover:bg-[#3fa0f8]"
              >
                <span className={`${workSans.className} text-[19px] font-semibold leading-[31px]`}>
                  Start Free — 100 Verifications
                </span>
                <ArrowUpRight className="h-[21px] w-[20px]" />
              </a>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-6 text-[16px] font-medium leading-[28px] text-white">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-white" />
              Credits never expire
            </span>
            <span className="inline-flex items-center gap-2">
              <Star className="h-4 w-4 text-white" />
              No charge for unknowns
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-white" />
              No Credit Card Required
            </span>
            <span className="inline-flex items-center gap-2">
              <Star className="h-4 w-4 text-white" />
              100 Free Verifications
            </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] lg:max-w-[560px]">
            <div className="relative h-[420px] w-full -translate-y-[70px] sm:h-[480px] lg:h-[520px]">
              <img
                src="/summary.svg"
                alt="Verification summary"
                className="absolute right-0 top-1/2 z-20 w-[320px] translate-x-[30px] -translate-y-1/2 sm:w-[360px] lg:w-[420px]"
              />
              <img
                src="/status.svg"
                alt="Live results"
                className="absolute left-0 top-0 z-0 w-[288px] -translate-x-[40px] translate-y-[350px] opacity-80 sm:w-[324px] lg:w-[360px]"
              />
              <img
                src="/integrations.png"
                alt="Integrations overview"
                className="absolute bottom-0 left-0 z-0 w-[260px] -translate-y-[200px] rounded-[24px] object-cover opacity-80 sm:w-[290px] lg:w-[320px]"
              />
            </div>
          </div>
        </div>

        <div className="mx-auto mt-[178px] flex w-full max-w-[720px] flex-col items-center gap-4 rounded-[18px] border border-[rgba(255,255,255,0.18)] bg-[rgba(16,18,20,0.35)] px-8 py-9 text-center shadow-[0_18px_50px_rgba(15,23,42,0.25)] backdrop-blur md:mt-[186px] md:px-12 md:py-10">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="email"
              placeholder="Enter email to validate"
              className="h-[56px] w-full rounded-[14px] border border-[rgba(255,255,255,0.2)] bg-white px-4 text-[16px] font-medium text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.12)] outline-none placeholder:text-slate-400 focus:border-[#f9cf4a] focus:ring-2 focus:ring-[#f9cf4a]/40"
            />
            <button className="h-[56px] shrink-0 rounded-[14px] bg-[#ffa742] px-8 text-[16px] font-semibold text-[#6c6c6c] shadow-[0_12px_24px_rgba(255,167,66,0.35)] transition hover:brightness-105">
              Verify
            </button>
          </div>
        </div>

        <div className="mt-[44px] text-center">
          <p className={`${workSans.className} pb-4 pt-10 text-[20px] font-semibold leading-[28px] tracking-[-0.02em] text-white`}>
            Trusted by teams who send at scale—sales, growth, agencies, and SaaS
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 opacity-80 translate-x-[40px]">
            {logos.map((logo, index) => (
              <div
                key={index}
                className={`flex h-[72px] w-[140px] items-center justify-center sm:w-[150px] ${
                  index === logos.length - 1 ? "-translate-x-[50px]" : ""
                } ${logo.shiftClass ?? ""}`}
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className={`max-h-full max-w-full w-auto object-contain opacity-80 brightness-0 invert ${logo.sizeClass ?? "h-12"}`}
                />
              </div>
            ))}
          </div>
          {/* Local logoipsum PNGs; swap with brand assets when available. */}
        </div>
      </div>
    </section>
  );
}
