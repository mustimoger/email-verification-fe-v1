import { Inter } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import PricingComparison from "@/components/PricingComparison";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Features | BoltROUTE",
  description:
    "Explore BoltRoute email verification features: real-time checks, bulk processing, advanced catch-all detection, API, and integrations.",
  alternates: {
    canonical: "/features",
  },
};

// ─── Icon components (inline SVG for zero-dependency) ─────────────────────────

const IconShield = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const IconUpload = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconCode = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const IconLink = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 7h3a5 5 0 010 10h-3m-6 0H6A5 5 0 016 7h3" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const IconMail = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 7l-10 6L2 7" />
  </svg>
);

const IconFilter = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const IconGlobe = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);

const IconLock = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

const IconRefresh = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);

const IconCheck = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconArrowRight = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconTarget = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const IconLayers = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

// ─── Section Badge Component ──────────────────────────────────────────────────

const SectionBadge = ({ children }) => (
  <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-100 px-4 py-1.5 mb-6">
    <span className="w-2 h-2 rounded-full bg-orange-400" />
    <span className="text-xs font-semibold tracking-[0.15em] uppercase text-orange-600">
      {children}
    </span>
  </div>
);

// ─── Feature Card Component ───────────────────────────────────────────────────

const FeatureCard = ({ icon: Icon, title, description, highlights }) => (
  <div className="group relative rounded-2xl border border-gray-100 bg-white p-8 transition-all duration-300 hover:shadow-lg hover:shadow-orange-50 hover:border-orange-100">
    <div className="mb-5 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 group-hover:from-orange-100 group-hover:to-amber-100 transition-colors duration-300">
      <Icon className="w-5 h-5 text-orange-500" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 text-[15px] leading-relaxed mb-4">{description}</p>
    {highlights && (
      <ul className="space-y-2">
        {highlights.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <IconCheck className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ value, label }) => (
  <div className="text-center px-6 py-8">
    <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{value}</div>
    <div className="text-sm text-gray-500">{label}</div>
  </div>
);

// ─── Capability Row (alternating image/text) ──────────────────────────────────

const CapabilityRow = ({ badge, title, description, points, imageSrc, imageAlt, reverse = false }) => (
  <div className={`flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-20`}>
    <div className="flex-1 max-w-xl">
      <SectionBadge>{badge}</SectionBadge>
      <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">{title}</h3>
      <p className="text-gray-500 text-[15px] leading-relaxed mb-6">{description}</p>
      <div className="space-y-3">
        {points.map((point, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-1 w-5 h-5 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
              <IconCheck className="w-3 h-3 text-orange-500" />
            </div>
            <span className="text-gray-600 text-[15px]">{point}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="flex-1 max-w-xl">
      <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-lg shadow-gray-100/50 bg-gradient-to-br from-orange-50/40 to-amber-50/30 p-2">
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={640}
          height={420}
          className="rounded-xl w-full h-auto"
        />
      </div>
    </div>
  </div>
);

// ─── How It Works Step ────────────────────────────────────────────────────────

const StepCard = ({ number, title, description }) => (
  <div className="relative flex flex-col items-center text-center">
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-lg mb-4 shadow-lg shadow-orange-200">
      {number}
    </div>
    <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
    <p className="text-sm text-gray-500 leading-relaxed max-w-[220px]">{description}</p>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function FeaturesPage() {
  return (
    <main className={`${inter.className} bg-white`}>

      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0d1f3c] to-[#0a1628]" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, rgba(251,146,60,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(251,191,36,0.1) 0%, transparent 40%)"
        }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-20 md:pt-36 md:pb-28">
          <div className="text-center max-w-3xl mx-auto">
            <SectionBadge>Features</SectionBadge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
              Everything you need to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">
                send with confidence
              </span>
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10">
              Verify emails before they bounce, protect your sender reputation, and keep your lists clean—all from one dashboard or through the tools you already use.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://app.boltroute.ai/signup"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 hover:-translate-y-0.5"
              >
                Start free trial
                <IconArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="https://docs.boltroute.ai"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-gray-600 text-gray-300 font-semibold text-sm hover:border-gray-400 hover:text-white transition-colors"
              >
                View documentation
              </Link>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative max-w-4xl mx-auto px-6 -mb-14 z-10">
          <div className="rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-100/50 grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            <StatCard value="99%+" label="Verification accuracy" />
            <StatCard value="200K" label="Emails per hour" />
            <StatCard value="2-5s" label="Single verify speed" />
            <StatCard value="70+" label="Tool integrations" />
          </div>
        </div>
      </section>


      {/* ───────── CORE FEATURES GRID ───────── */}
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <SectionBadge>Core capabilities</SectionBadge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Verify, protect, integrate—all in one place
          </h2>
          <p className="text-gray-500 text-[15px] leading-relaxed">
            From single email checks to million-row batch uploads, BoltRoute gives you every tool to keep your lists clean and your deliverability high.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={IconMail}
            title="Real-Time Email Verification"
            description="Paste an email, get an instant verdict. Check addresses one at a time from the dashboard or trigger checks via API the moment a lead enters your system."
            highlights={[
              "Syntax, MX record, and SMTP-level checks",
              "Results in 2–5 seconds",
              "No signup needed for first test",
            ]}
          />
          <FeatureCard
            icon={IconUpload}
            title="Bulk File Verification"
            description="Drop a CSV or Excel file and verify thousands of emails in minutes. BoltRoute auto-detects the email column, shows progress in real time, and lets you download a cleaned file when done."
            highlights={[
              "CSV, XLSX, and XLS support",
              "Up to 1M emails per file",
              "Auto column detection & duplicate removal",
            ]}
          />
          <FeatureCard
            icon={IconTarget}
            title="Advanced Catch-All Detection"
            description="Catch-all domains accept every address, making standard checks useless. BoltRoute uses a proprietary method to give you a real deliverability answer instead of marking them unknown."
            highlights={[
              "99%+ accuracy on catch-all domains",
              "No extra charge for catch-all results",
              "Tested across 300M+ emails",
            ]}
          />
          <FeatureCard
            icon={IconFilter}
            title="Risk Filtering"
            description="Every email is tagged with risk signals so you can segment your list the way you want. Filter out disposable addresses, role-based inboxes, or domains with known issues."
            highlights={[
              "Disposable email detection",
              "Role-based address flagging (info@, support@)",
              "Domain health and MX validation",
            ]}
          />
          <FeatureCard
            icon={IconCode}
            title="Developer-Friendly API"
            description="RESTful API for single and batch verification. Webhook callbacks for async jobs, full response schemas, and code samples in six languages."
            highlights={[
              "Python, JS, PHP, Ruby, Go, cURL samples",
              "Webhook callbacks for batch results",
              "Dedicated API keys per integration",
            ]}
          />
          <FeatureCard
            icon={IconLink}
            title="Native Integrations"
            description="Connect directly to Zapier, Make, n8n, and Google Sheets. Verify emails the moment they hit your CRM, form, or spreadsheet—no exports or manual work."
            highlights={[
              "70+ tools via automation platforms",
              "Google Sheets add-on with in-sheet results",
              "5–10 minute setup for any connection",
            ]}
          />
        </div>
      </section>


      {/* ───────── CAPABILITY DEEP DIVES ───────── */}
      <section className="bg-gradient-to-b from-gray-50/80 to-white">
        <div className="max-w-6xl mx-auto px-6 py-20 space-y-24">

          <CapabilityRow
            badge="Verify"
            title="Manual & Bulk Verification in One Workspace"
            description="Whether you're checking a single address or cleaning a list of 500K contacts, everything happens in the same dashboard. Paste emails for quick manual checks or drag in a file for batch processing."
            points={[
              "Manual mode: paste up to 25 emails for instant results",
              "Bulk mode: upload CSV/XLSX files up to 100 MB",
              "Live status counters—valid, invalid, catch-all, unknown",
              "Export results as a cleaned file with one click",
            ]}
            imageSrc="/verify-feat.png"
            imageAlt="BoltRoute verification workspace"
          />

          <CapabilityRow
            badge="Track"
            title="A Dashboard That Shows What Matters"
            description="See your credit balance, verification quality mix, usage trends over time, and recent run history at a glance. No digging through menus—everything is right on the overview screen."
            points={[
              "Credits remaining, total verifications, valid/invalid/catch-all counts",
              "Quality mix donut chart and usage trend line",
              "Verification history table with per-run stats",
              "Current plan status and purchase date",
            ]}
            imageSrc="/overview-feat.png"
            imageAlt="BoltRoute overview dashboard"
            reverse
          />

          <CapabilityRow
            badge="History"
            title="Full Audit Trail for Every Run"
            description="Every verification task is logged with its date, total count, result breakdown, and download link. Filter by status, re-download past results, and keep your records clean."
            points={[
              "Filterable by completed, processing, or failed",
              "Per-task counts: valid, invalid, catch-all",
              "One-click CSV download for any past run",
              "Snapshot stats: total tasks, exports, processing queue",
            ]}
            imageSrc="/history-feat.png"
            imageAlt="BoltRoute verification history"
          />

          <CapabilityRow
            badge="Integrate"
            title="Plug Into Your Existing Workflow"
            description="Generate API keys tagged to specific platforms—Zapier, n8n, Google Sheets, or your own backend. Track usage per integration and revoke keys instantly when needed."
            points={[
              "One universal API, tagged per platform",
              "Usage reporting per key and per integration",
              "Zapier, Make, n8n, and Google Sheets native connectors",
              "Quick start: generate key → paste in tool → verify",
            ]}
            imageSrc="/integrations-feat.png"
            imageAlt="BoltRoute integrations page"
            reverse
          />

        </div>
      </section>


      {/* ───────── HOW IT WORKS ───────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <SectionBadge>How it works</SectionBadge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Clean list in four steps
          </h2>
          <p className="text-gray-500 text-[15px] leading-relaxed">
            Same process whether you verify one email or one million.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden lg:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-orange-200 via-amber-200 to-orange-200" />

          <StepCard
            number="1"
            title="Upload your list"
            description="Paste emails, drop a CSV/Excel file, or connect via API. Works with any format."
          />
          <StepCard
            number="2"
            title="Map & configure"
            description="BoltRoute auto-detects the email column. Confirm mapping, remove duplicates, and start."
          />
          <StepCard
            number="3"
            title="Watch results live"
            description="Track valid, invalid, catch-all, and unknown counts as they update in real time."
          />
          <StepCard
            number="4"
            title="Export & send"
            description="Download your cleaned list or push verified emails straight to your CRM or ESP."
          />
        </div>
      </section>


      {/* ───────── INTEGRATION ECOSYSTEM ───────── */}
      <section className="bg-gradient-to-b from-white via-gray-50/50 to-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <SectionBadge>Integrations</SectionBadge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Verify emails inside the tools you already use
            </h2>
            <p className="text-gray-500 text-[15px] leading-relaxed">
              Native connections with Zapier, Make, n8n, and Google Sheets. Plus 70+ more tools through automation platforms.
            </p>
          </div>

          {/* Native integrations */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {[
              {
                name: "Zapier",
                letter: "Z",
                color: "from-orange-500 to-orange-600",
                desc: "Trigger verification in any Zap. Verify leads the moment they enter your CRM, forms, or lists.",
              },
              {
                name: "Make",
                letter: "M",
                color: "from-violet-500 to-purple-600",
                desc: "Build advanced verification workflows with visual scenarios, conditional logic, and multi-step automations.",
              },
              {
                name: "n8n",
                letter: "n8n",
                color: "from-rose-500 to-red-600",
                desc: "Native node for cloud or self-hosted workflows. Full verification data with webhook support.",
              },
              {
                name: "Google Sheets",
                letter: "G",
                color: "from-green-500 to-emerald-600",
                desc: "Verify emails directly inside your spreadsheet. Select column, click verify, get results.",
              },
            ].map((integration) => (
              <div
                key={integration.name}
                className="rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300 group"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center text-white font-bold text-sm mb-4`}>
                  {integration.letter}
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{integration.name}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{integration.desc}</p>
              </div>
            ))}
          </div>

          {/* Workflow categories */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8">
            <h4 className="font-semibold text-gray-900 mb-6">
              Connect BoltRoute to 70+ tools via Zapier, Make, or n8n
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
              {[
                { cat: "Cold Email", tools: "Instantly, Lemlist, Smartlead, Woodpecker, Reply.io, Mailshake" },
                { cat: "CRM", tools: "HubSpot, Salesforce, Pipedrive, Close, Zoho CRM, Monday CRM" },
                { cat: "Lead Gen", tools: "Apollo.io, Hunter.io, Clearbit, Phantombuster, Lusha" },
                { cat: "Email Marketing", tools: "Mailchimp, ActiveCampaign, Klaviyo, ConvertKit, Brevo" },
                { cat: "Forms", tools: "Typeform, JotForm, Gravity Forms, Tally, Google Forms" },
                { cat: "Database", tools: "Airtable, Notion, Smartsheet, Coda, Baserow" },
                { cat: "E-commerce", tools: "Shopify, WooCommerce, BigCommerce, Squarespace" },
                { cat: "Communication", tools: "Slack, Discord, Microsoft Teams, Calendly" },
              ].map(({ cat, tools }) => (
                <div key={cat}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-1.5">
                    {cat}
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{tools}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-gray-400">
              Don&apos;t see your tool? If it connects to Zapier, Make, or n8n—it works with BoltRoute.
            </p>
          </div>
        </div>
      </section>


      {/* ───────── VERIFICATION CHECKS BREAKDOWN ───────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <SectionBadge>What we check</SectionBadge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Every email goes through multiple verification layers
          </h2>
          <p className="text-gray-500 text-[15px] leading-relaxed">
            Not just a syntax check. BoltRoute validates emails at every level to give you the most accurate result possible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: IconMail,
              title: "Syntax Validation",
              desc: "Catches typos, missing @ symbols, and formatting errors before anything else.",
            },
            {
              icon: IconGlobe,
              title: "Domain & MX Records",
              desc: "Confirms the domain exists and has active mail servers configured to receive email.",
            },
            {
              icon: IconShield,
              title: "SMTP Verification",
              desc: "Connects to the mail server and checks whether the specific mailbox exists and can accept messages.",
            },
            {
              icon: IconTarget,
              title: "Catch-All Detection",
              desc: "Identifies servers that accept all addresses, then uses proprietary methods to assess real deliverability.",
            },
            {
              icon: IconFilter,
              title: "Disposable Detection",
              desc: "Flags temporary addresses from services like Guerrilla Mail and 10MinuteMail that will never convert.",
            },
            {
              icon: IconLayers,
              title: "Role-Based Flagging",
              desc: "Detects generic inboxes (info@, support@, admin@) that go to shared mailboxes, not decision makers.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-4 rounded-xl border border-gray-50 bg-gray-50/50 p-6 hover:bg-white hover:border-gray-100 hover:shadow-sm transition-all duration-300"
            >
              <div className="mt-0.5 w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* ───────── API SECTION ───────── */}
      <section className="bg-[#0a1628]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionBadge>API</SectionBadge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Build custom integrations with a clean API
              </h2>
              <p className="text-gray-400 text-[15px] leading-relaxed mb-8">
                RESTful endpoints for real-time single verification and asynchronous batch processing. Webhook callbacks, comprehensive documentation, and code samples in six languages.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "Single email verification — response in 2–5 seconds",
                  "Batch processing — upload a file, get a webhook when done",
                  "Dedicated API keys per workflow or integration",
                  "Usage tracking and analytics per key",
                  "Full docs with interactive examples",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <IconCheck className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href="https://docs.boltroute.ai"
                className="inline-flex items-center gap-2 text-orange-400 font-semibold text-sm hover:text-orange-300 transition-colors"
              >
                View API documentation
                <IconArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="relative">
              <div className="rounded-2xl bg-[#0d1f3c] border border-gray-800 p-6 font-mono text-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="ml-2 text-gray-500 text-xs">verify-email.sh</span>
                </div>
                <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                  <span className="text-gray-500"># Verify a single email</span>
                  {"\n"}
                  <span className="text-orange-400">curl</span>
                  {" -X POST https://api.boltroute.ai/v1/verify \\\n"}
                  {"  -H "}
                  <span className="text-green-400">{'"Authorization: Bearer YOUR_API_KEY"'}</span>
                  {" \\\n"}
                  {"  -d "}
                  <span className="text-green-400">{'\'{"email": "test@example.com"}\''}</span>
                  {"\n\n"}
                  <span className="text-gray-500"># Response</span>
                  {"\n"}
                  <span className="text-gray-400">{"{"}</span>
                  {"\n"}
                  {"  "}
                  <span className="text-blue-400">{'"email"'}</span>
                  {": "}
                  <span className="text-green-400">{'"test@example.com"'}</span>
                  {",\n"}
                  {"  "}
                  <span className="text-blue-400">{'"status"'}</span>
                  {": "}
                  <span className="text-green-400">{'"valid"'}</span>
                  {",\n"}
                  {"  "}
                  <span className="text-blue-400">{'"catch_all"'}</span>
                  {": "}
                  <span className="text-yellow-400">false</span>
                  {",\n"}
                  {"  "}
                  <span className="text-blue-400">{'"disposable"'}</span>
                  {": "}
                  <span className="text-yellow-400">false</span>
                  {",\n"}
                  {"  "}
                  <span className="text-blue-400">{'"role_based"'}</span>
                  {": "}
                  <span className="text-yellow-400">false</span>
                  {"\n"}
                  <span className="text-gray-400">{"}"}</span>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ───────── SECURITY & CREDITS ───────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Security */}
          <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-8 lg:p-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 flex items-center justify-center mb-5">
              <IconLock className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Enterprise-grade security</h3>
            <p className="text-gray-500 text-[15px] leading-relaxed mb-6">
              Your data never leaves our secure processing pipeline. Verification happens in real time with no long-term storage of the emails you check.
            </p>
            <div className="space-y-3">
              {[
                "End-to-end encryption in transit and at rest",
                "Zero data retention after verification completes",
                "Full GDPR compliance",
                "99.9% uptime SLA",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <IconCheck className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <span className="text-gray-600 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Credits */}
          <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-8 lg:p-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 flex items-center justify-center mb-5">
              <IconRefresh className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Credits that make sense</h3>
            <p className="text-gray-500 text-[15px] leading-relaxed mb-6">
              No hidden charges, no credits burned on unusable results. Pay for what you actually verify, and keep unused credits forever.
            </p>
            <div className="space-y-3">
              {[
                "Credits never expire—use them whenever you need",
                "No charge for unknown or catch-all results",
                "Unused credits always roll over between plans",
                "Volume pricing from $0.00037/email at scale",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <IconCheck className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <span className="text-gray-600 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ───────── WHY BOLTROUTE (comparison) ───────── */}
      <section className="bg-gray-50/80">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <SectionBadge>Why BoltRoute</SectionBadge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Same pricing as budget tools,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                superior everything else
              </span>
            </h2>
          </div>

          <div className="mx-auto max-w-[780px]">
            <PricingComparison />
          </div>
        </div>
      </section>


      {/* ───────── CTA ───────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a1628] px-8 py-16 md:px-16 md:py-20 text-center">
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: "radial-gradient(circle at 30% 50%, rgba(251,146,60,0.2) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(251,191,36,0.15) 0%, transparent 40%)"
          }} />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to clean your list?
            </h2>
            <p className="text-gray-400 text-[15px] leading-relaxed mb-8">
              Get 100 free credits to test accuracy. No credit card required. Start verifying in under 60 seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://app.boltroute.ai/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 hover:-translate-y-0.5"
              >
                Start free trial
                <IconArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="https://docs.boltroute.ai"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg border border-gray-600 text-gray-300 font-semibold hover:border-gray-400 hover:text-white transition-colors"
              >
                View documentation
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
