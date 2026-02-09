import Link from "next/link";
import { Inter, Work_Sans } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const HERO_GRADIENT =
  "linear-gradient(133deg, #101214 36%, #3348F6 73.7904%, #3398F6 80.5739%, #32D9F6 94.1407%, #FFFFFF 100%)";

export default function PricingTeaser() {
  return (
    <section className={`${inter.className} relative overflow-hidden py-20 sm:py-24`} style={{ background: HERO_GRADIENT }}>
      {/* Subtle background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-500/6 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          <span className="text-orange-300 text-xs font-medium tracking-wider uppercase">
            Simple, Transparent Pricing
          </span>
        </div>

        {/* Headline */}
        <h2 className={`${workSans.className} text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-white leading-tight tracking-tight mb-4`}>
          Verify emails from{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
            $0.0013
          </span>
          {" "}each
        </h2>

        <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          No subscriptions. No hidden fees. Buy credits once, use them whenever you need.
        </p>

        {/* Price anchors */}
        <div className="grid grid-cols-3 max-w-lg mx-auto gap-3 mb-10">
          {[
            { volume: "10K", price: "$37" },
            { volume: "100K", price: "$141", highlight: true },
            { volume: "1M", price: "$426" },
          ].map((tier) => (
            <div
              key={tier.volume}
              className={`rounded-xl py-4 px-3 border transition-all ${
                tier.highlight
                  ? "bg-orange-500/10 border-orange-500/30"
                  : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"
              }`}
            >
              <div
                className={`text-[16.5px] font-semibold tracking-wider uppercase mb-1 ${
                  tier.highlight ? "text-orange-400" : "text-slate-500"
                }`}
              >
                {tier.volume} emails
              </div>
              <div
                className={`text-4xl font-extrabold tracking-tight ${
                  tier.highlight ? "text-white" : "text-slate-300"
                }`}
              >
                {tier.price}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold text-[21px] rounded-lg transition-all duration-200 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5"
        >
          See Full Pricing
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>

        {/* Trust row */}
        <div className="mt-8 flex flex-nowrap items-center justify-center gap-x-6 overflow-x-auto whitespace-nowrap text-[18px] text-white">
          {[
            "Credits never expire",
            "No charge for unknowns",
            "99%+ accuracy",
            "No credit card to start",
          ].map((item) => (
            <span key={item} className="flex shrink-0 items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-emerald-500/70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
