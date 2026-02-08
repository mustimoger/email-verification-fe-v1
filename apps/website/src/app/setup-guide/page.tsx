import type { Metadata } from "next";
import { Inter, Work_Sans } from "next/font/google";
import { Clock3 } from "lucide-react";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Setup Guide | BoltROUTE",
  description:
    "Step-by-step setup guide to connect BoltRoute with native integrations, automation platforms, and custom API workflows.",
  alternates: {
    canonical: "/setup-guide",
  },
};

const HERO_GRADIENT =
  "linear-gradient(113deg,#101214 36%,#3348F6 73.7904%,#3398F6 87%,#32D9F6 94.1407%,#FFFFFF 100%)";

type NativeCard = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  symbol: string;
  symbolClassName: string;
  badgeClassName: string;
};

type WorkflowRow = {
  tool: string;
  category: string;
  connection: string;
  useCase: string;
};

type Step = {
  lead: string;
  body: string;
};

type GuideCard = {
  title: string;
  logoSrc: string;
  logoAlt: string;
  time: string;
  steps: Step[];
};

const nativeCards: NativeCard[] = [
  {
    title: "Zapier",
    description:
      "Trigger verification in any Zap. Verify leads the moment they enter your CRM, forms, or lists.",
    ctaLabel: "Connect on Zapier",
    ctaHref: "https://zapier.com/apps/boltroute",
    symbol: "Z",
    symbolClassName: "text-[20px] font-bold text-white",
    badgeClassName: "bg-[#ff4a00]",
  },
  {
    title: "Make",
    description:
      "Build advanced verification workflows with visual scenarios, conditional logic, and multi-step automations.",
    ctaLabel: "Connect on Make",
    ctaHref: "https://www.make.com/en/integrations/boltroute",
    symbol: "M",
    symbolClassName: "text-[20px] font-bold text-white",
    badgeClassName: "bg-[#6d4aff]",
  },
  {
    title: "n8n",
    description:
      "Native node for cloud or self-hosted workflows. Full verification data with webhook support.",
    ctaLabel: "View n8n Node",
    ctaHref: "https://n8n.io/integrations/boltroute",
    symbol: "n8n",
    symbolClassName: "text-[18px] font-bold text-white",
    badgeClassName: "bg-[#ea4b71]",
  },
  {
    title: "Google Sheets",
    description:
      "Verify emails directly inside your spreadsheet. Select column, click verify, get results. No exports.",
    ctaLabel: "Install Add-on",
    ctaHref: "https://workspace.google.com/marketplace",
    symbol: "⊞",
    symbolClassName: "text-[24px] font-bold text-white",
    badgeClassName: "bg-[#0f9d58]",
  },
];

const workflowRows: WorkflowRow[] = [
  {
    tool: "Instantly",
    category: "Cold Email",
    connection: "Zapier, Make, n8n",
    useCase: "Verify leads before sequences start",
  },
  {
    tool: "Lemlist",
    category: "Cold Email",
    connection: "Zapier, Make, n8n",
    useCase: "Clean lists before campaign launch",
  },
  {
    tool: "Smartlead",
    category: "Cold Email",
    connection: "Zapier, Make, n8n",
    useCase: "Verify new leads automatically",
  },
  {
    tool: "Woodpecker",
    category: "Cold Email",
    connection: "Zapier, Make",
    useCase: "Filter invalid emails before outreach",
  },
  {
    tool: "Reply.io",
    category: "Cold Email",
    connection: "Zapier, Make",
    useCase: "Validate prospects entering sequences",
  },
  {
    tool: "Mailshake",
    category: "Cold Email",
    connection: "Zapier",
    useCase: "Verify before adding to campaigns",
  },
  {
    tool: "Snov.io",
    category: "Cold Email",
    connection: "Zapier, Make",
    useCase: "Clean scraped email lists",
  },
  {
    tool: "Saleshandy",
    category: "Cold Email",
    connection: "Zapier",
    useCase: "Verify imported lead lists",
  },
  {
    tool: "HubSpot",
    category: "CRM",
    connection: "Zapier, Make, n8n",
    useCase: "Verify new contacts on creation",
  },
  {
    tool: "Salesforce",
    category: "CRM",
    connection: "Zapier, Make, n8n",
    useCase: "Clean CRM data automatically",
  },
  {
    tool: "Pipedrive",
    category: "CRM",
    connection: "Zapier, Make, n8n",
    useCase: "Validate deals before outreach",
  },
  {
    tool: "Close",
    category: "CRM",
    connection: "Zapier, Make",
    useCase: "Verify leads entering pipeline",
  },
  {
    tool: "Zoho CRM",
    category: "CRM",
    connection: "Zapier, Make, n8n",
    useCase: "Verify contacts on import",
  },
  {
    tool: "Apollo.io",
    category: "Lead Gen",
    connection: "Zapier",
    useCase: "Verify before exporting to CRM",
  },
  {
    tool: "Hunter.io",
    category: "Lead Gen",
    connection: "Zapier, Make",
    useCase: "Double-verify found emails",
  },
  {
    tool: "Clearbit",
    category: "Lead Gen",
    connection: "Zapier",
    useCase: "Validate enriched contacts",
  },
  {
    tool: "Phantombuster",
    category: "Lead Gen",
    connection: "Zapier, Make",
    useCase: "Verify scraped LinkedIn emails",
  },
  {
    tool: "Mailchimp",
    category: "Email Marketing",
    connection: "Zapier, Make, n8n",
    useCase: "Clean lists before campaigns",
  },
  {
    tool: "ActiveCampaign",
    category: "Email Marketing",
    connection: "Zapier, Make, n8n",
    useCase: "Verify new subscribers",
  },
  {
    tool: "Klaviyo",
    category: "Email Marketing",
    connection: "Zapier, Make",
    useCase: "Clean e-commerce email lists",
  },
  {
    tool: "ConvertKit",
    category: "Email Marketing",
    connection: "Zapier, Make",
    useCase: "Validate creator audience lists",
  },
  {
    tool: "Brevo",
    category: "Email Marketing",
    connection: "Zapier, Make",
    useCase: "Clean transactional email lists",
  },
  {
    tool: "Typeform",
    category: "Forms",
    connection: "Zapier, Make, n8n",
    useCase: "Verify on form submission",
  },
  {
    tool: "JotForm",
    category: "Forms",
    connection: "Zapier, Make, n8n",
    useCase: "Clean form entries instantly",
  },
  {
    tool: "Gravity Forms",
    category: "Forms",
    connection: "Zapier",
    useCase: "Verify WordPress form leads",
  },
  {
    tool: "Tally",
    category: "Forms",
    connection: "Zapier, Make",
    useCase: "Validate free form submissions",
  },
  {
    tool: "Airtable",
    category: "Database",
    connection: "Zapier, Make, n8n",
    useCase: "Verify emails in any base",
  },
  {
    tool: "Notion",
    category: "Database",
    connection: "Zapier, Make, n8n",
    useCase: "Clean contact databases",
  },
  {
    tool: "Webflow",
    category: "Landing Page",
    connection: "Zapier, Make",
    useCase: "Verify form submissions",
  },
  {
    tool: "Unbounce",
    category: "Landing Page",
    connection: "Zapier",
    useCase: "Clean landing page leads",
  },
  {
    tool: "ClickFunnels",
    category: "Landing Page",
    connection: "Zapier",
    useCase: "Validate funnel leads",
  },
  {
    tool: "Shopify",
    category: "E-commerce",
    connection: "Zapier, Make, n8n",
    useCase: "Verify customer emails",
  },
  {
    tool: "WooCommerce",
    category: "E-commerce",
    connection: "Zapier, Make",
    useCase: "Clean order email lists",
  },
  {
    tool: "Intercom",
    category: "Support",
    connection: "Zapier, Make",
    useCase: "Verify chat-collected emails",
  },
  {
    tool: "Zendesk",
    category: "Support",
    connection: "Zapier, Make",
    useCase: "Clean support ticket contacts",
  },
  {
    tool: "Slack",
    category: "Communication",
    connection: "Zapier, Make, n8n",
    useCase: "Get verification alerts",
  },
  {
    tool: "Discord",
    category: "Communication",
    connection: "Zapier, Make, n8n",
    useCase: "Notify on invalid emails",
  },
  {
    tool: "Calendly",
    category: "Scheduling",
    connection: "Zapier, Make",
    useCase: "Verify meeting bookers",
  },
  {
    tool: "Trello",
    category: "Project Mgmt",
    connection: "Zapier, Make, n8n",
    useCase: "Verify contacts on cards",
  },
  {
    tool: "Monday.com",
    category: "Project Mgmt",
    connection: "Zapier, Make, n8n",
    useCase: "Validate board contacts",
  },
  {
    tool: "ClickUp",
    category: "Project Mgmt",
    connection: "Zapier, Make",
    useCase: "Verify assigned emails",
  },
];

const categoryStyles: Record<string, { bg: string; text: string }> = {
  "Cold Email": { bg: "#fff8e6", text: "#b8860b" },
  CRM: { bg: "#e6f4ff", text: "#0066cc" },
  "Lead Gen": { bg: "#f0fff0", text: "#228b22" },
  "Email Marketing": { bg: "#fff0f5", text: "#cc3366" },
  Forms: { bg: "#f5f0ff", text: "#6633cc" },
  Database: { bg: "#f0f8ff", text: "#4682b4" },
  "Landing Page": { bg: "#fff5e6", text: "#cc6600" },
  "E-commerce": { bg: "#e6ffe6", text: "#2e8b2e" },
  Support: { bg: "#f5f5f5", text: "#555555" },
  Communication: { bg: "#ffe6f0", text: "#cc3399" },
  Scheduling: { bg: "#e6f0ff", text: "#3366cc" },
  "Project Mgmt": { bg: "#f0f0f0", text: "#666666" },
};

const guideCards: GuideCard[] = [
  {
    title: "Via Zapier",
    logoSrc: "/integrations/zapier-logo.png",
    logoAlt: "Zapier",
    time: "5-10 minutes",
    steps: [
      {
        lead: "Create a new Zap.",
        body: "Choose your app as the trigger (e.g., “New Lead in HubSpot” or “New Form Submission in Typeform”).",
      },
      {
        lead: "Add BoltRoute as the action.",
        body: "Select “Verify Email.” Connect your BoltRoute account using your API key.",
      },
      {
        lead: "Map the email field",
        body: "from your trigger to BoltRoute.",
      },
      {
        lead: "Add another action to handle results",
        body: "—update the original record, add to a Google Sheet, or route based on status.",
      },
      {
        lead: "Test with a real email,",
        body: "then turn on the Zap.",
      },
    ],
  },
  {
    title: "Via Make",
    logoSrc: "/integrations/make-logo.png",
    logoAlt: "Make",
    time: "5-10 minutes",
    steps: [
      {
        lead: "Create a new scenario.",
        body: "Add your source app as the first module (e.g., “Watch New Rows” in Google Sheets).",
      },
      {
        lead: "Add the BoltRoute module.",
        body: "Select “Verify Email.” Connect with your API key.",
      },
      {
        lead: "Map the email field",
        body: "from your source module to BoltRoute.",
      },
      {
        lead: "Add a Router",
        body: "to split results by status. Send valid emails one way, invalid another, catch-alls to review.",
      },
      {
        lead: "Test the scenario,",
        body: "then activate it.",
      },
    ],
  },
  {
    title: "Via n8n",
    logoSrc: "/integrations/n8n-logo.png",
    logoAlt: "n8n",
    time: "5-10 minutes",
    steps: [
      {
        lead: "Create a new workflow.",
        body: "Add a trigger node for your source (Webhook, Google Sheets, CRM, etc.).",
      },
      {
        lead: "Add the BoltRoute node.",
        body: "Enter your API key in credentials.",
      },
      {
        lead: "Wire your trigger’s email output",
        body: "to BoltRoute’s input.",
      },
      {
        lead: "Add an IF node",
        body: "to route results—valid forward, invalid to reject list, catch-alls to review.",
      },
      {
        lead: "Save and activate",
        body: "the workflow.",
      },
    ],
  },
  {
    title: "Via Google Sheets Add-on",
    logoSrc: "/integrations/google-sheets-logo.png",
    logoAlt: "Google Sheets",
    time: "2-3 minutes",
    steps: [
      {
        lead: "Install the BoltRoute add-on",
        body: "from the Google Workspace Marketplace. Open any Google Sheet, go to Extensions → Add-ons → Get add-ons → Search “BoltRoute”.",
      },
      {
        lead: "Connect your BoltRoute account.",
        body: "Enter your API key when prompted. You only need to do this once.",
      },
      {
        lead: "Select the column",
        body: "containing your email addresses. You can also select a specific range.",
      },
      {
        lead: "Click “Verify”",
        body: "in the BoltRoute sidebar. Results appear in new columns: status, catch-all, disposable, role-based.",
      },
      {
        lead: "Filter and export.",
        body: "Use Google Sheets filters to keep only valid emails, or download the cleaned list.",
      },
    ],
  },
];

export default function SetupGuidePage() {
  return (
    <main id="scroll-trigger" className={`${inter.className} min-h-screen bg-[#f9f9f9]`}>
      <section
        className="flex overflow-hidden px-0 pb-[60px] pt-[120px] text-white lg:pb-[120px] lg:pt-[200px]"
        style={{ background: HERO_GRADIENT }}
      >
        <div className="mx-auto w-full max-w-[1176px] px-5">
          <div className="mx-auto flex w-full max-w-[350px] flex-col items-center gap-4 text-center lg:max-w-[777px] lg:gap-6">
            <span className="inline-flex items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-white">
              Integrations
            </span>

            <h1
              className={`${workSans.className} text-[40px] font-semibold leading-[50px] tracking-[-1.2px] text-white lg:text-[64px] lg:leading-[80px] lg:tracking-[-1.92px]`}
            >
              Seamless Native Integrations For
              <br />
              Maximum Efficiency
            </h1>

            <p className="text-[16px] font-medium leading-[26.6667px] text-[#F0F3F6] lg:text-[18px] lg:leading-[30px]">
              Connect BoltRoute to your existing stack with native apps and workflow
              automations.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-10">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="mb-[70px]">
            <h2
              className={`${workSans.className} text-center text-[28px] font-semibold leading-[1.25] text-[#111111]`}
            >
              Native Integrations
            </h2>
            <p className="mt-2 text-center text-[16px] leading-[25.6px] text-[#666666]">
              Direct connections. Full feature access. No middleware.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {nativeCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[12px] border border-[#f0e6d3] bg-[linear-gradient(180deg,#fff8e6_0%,#ffffff_100%)] p-[30px] text-center"
                >
                  <div
                    className={`mx-auto mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-[12px] ${card.badgeClassName}`}
                  >
                    <span className={card.symbolClassName}>{card.symbol}</span>
                  </div>

                  <h3
                    className={`${workSans.className} text-[20px] font-semibold leading-[24px] text-[#111111]`}
                  >
                    {card.title}
                  </h3>
                  <p className="mt-[10px] text-[14px] leading-[22.4px] text-[#666666]">
                    {card.description}
                  </p>
                  <a
                    href={card.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-block text-[14px] font-semibold leading-[21.7px] text-[#f09819]"
                  >
                    {card.ctaLabel} →
                  </a>
                </article>
              ))}
            </div>
          </div>

          <div className="mb-[70px] flex flex-wrap items-center gap-10 rounded-[16px] bg-[linear-gradient(135deg,#1a1a1a_0%,#2d2d2d_100%)] px-6 py-8 md:px-[50px] md:py-[50px]">
            <div className="min-w-[280px] flex-1">
              <span className="inline-flex rounded-[6px] bg-[rgba(240,152,25,0.2)] px-3 py-1.5 text-[12px] font-semibold leading-[18.6px] text-[#f5b800]">
                API
              </span>
              <h2
                className={`${workSans.className} mt-[15px] text-[28px] font-semibold leading-[33.6px] text-white`}
              >
                Build Custom Integrations
              </h2>
              <p className="mt-4 text-[16px] leading-[27.2px] text-[#aaaaaa]">
                RESTful API for real-time single email verification and batch processing.
                Webhook callbacks, comprehensive docs, and code samples in 6 languages.
              </p>
              <div className="mt-[25px] flex flex-wrap gap-[10px]">
                {["Python", "JavaScript", "PHP", "Ruby", "Go", "cURL"].map((lang) => (
                  <span
                    key={lang}
                    className="rounded-[6px] bg-[rgba(255,255,255,0.1)] px-3 py-1.5 text-[13px] leading-[20.15px] text-white"
                  >
                    {lang}
                  </span>
                ))}
              </div>
              <a
                href="https://docs.boltroute.ai/"
                className="mt-[25px] inline-block rounded-[8px] bg-[linear-gradient(135deg,#f5b800_0%,#f09819_100%)] px-6 py-3 text-[14px] font-semibold leading-[21.7px] text-white"
              >
                View API Docs →
              </a>
            </div>

            <div className="min-w-[280px] flex-1">
              <div className="overflow-x-auto rounded-[10px] bg-[#0d0d0d] p-5 font-mono text-[13px] leading-[20.15px] text-[#e0e0e0]">
                <div className="mb-[10px] text-[#666666]"># Verify single email</div>
                <div>
                  <span className="text-[#f5b800]">curl</span> -X POST
                  {" https://api.boltroute.ai/v1/verify \\"}
                </div>
                <div>
                  {"  -H "}
                  <span className="text-[#98c379]">
                    {'"Authorization: Bearer YOUR_API_KEY"'}
                  </span>
                  {" \\"}
                </div>
                <div>
                  {"  -d "}
                  <span className="text-[#98c379]">
                    {'\'{"email":"test@example.com"}\''}
                  </span>
                </div>

                <div className="mt-[15px] border-t border-[#333333] pt-[15px]">
                  <div className="mb-[10px] text-[#666666]"># Response</div>
                  <div>{"{"}</div>
                  <div>
                    {"  "}
                    <span className="text-[#98c379]">{'"email"'}</span>:{" "}
                    <span className="text-[#98c379]">{'"test@example.com"'}</span>,
                  </div>
                  <div>
                    {"  "}
                    <span className="text-[#98c379]">{'"status"'}</span>:{" "}
                    <span className="text-[#98c379]">{'"valid"'}</span>,
                  </div>
                  <div>
                    {"  "}
                    <span className="text-[#98c379]">{'"catch_all"'}</span>:{" "}
                    <span className="text-[#d19a66]">false</span>,
                  </div>
                  <div>
                    {"  "}
                    <span className="text-[#98c379]">{'"disposable"'}</span>:{" "}
                    <span className="text-[#d19a66]">false</span>
                  </div>
                  <div>{"}"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-[70px]">
            <div className="mb-[25px] flex flex-wrap items-center justify-between gap-[15px]">
              <div>
                <h2
                  className={`${workSans.className} text-[28px] font-semibold leading-[33.6px] text-[#111111]`}
                >
                  Workflow Integrations
                </h2>
                <p className="mt-[5px] text-[16px] leading-[25.6px] text-[#666666]">
                  Connect BoltRoute to 70+ tools via Zapier, Make, or n8n
                </p>
              </div>
              <a
                href="#how-to-connect"
                className="whitespace-nowrap rounded-[8px] bg-[linear-gradient(135deg,#f5b800_0%,#f09819_100%)] px-6 py-3 text-[14px] font-semibold leading-[21.7px] text-white"
              >
                How to Connect ↓
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-[14px]">
                <thead>
                  <tr className="bg-[linear-gradient(135deg,#f5b800_0%,#e8a835_50%,#f09819_100%)] text-left text-white">
                    <th className="rounded-l-[8px] px-4 py-[14px] text-[14px] font-semibold leading-[21.7px]">
                      Tool
                    </th>
                    <th className="px-4 py-[14px] text-[14px] font-semibold leading-[21.7px]">
                      Category
                    </th>
                    <th className="px-4 py-[14px] text-[14px] font-semibold leading-[21.7px]">
                      Connection
                    </th>
                    <th className="rounded-r-[8px] px-4 py-[14px] text-[14px] font-semibold leading-[21.7px]">
                      Use Case
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workflowRows.map((row, index) => {
                    const badge = categoryStyles[row.category] ?? {
                      bg: "#f3f4f6",
                      text: "#4b5563",
                    };

                    return (
                      <tr
                        key={`${row.tool}-${row.category}`}
                        className={`border-b border-[#f0e6d3] ${index % 2 === 1 ? "bg-[#fffdf5]" : ""}`}
                      >
                        <td className="px-4 py-3 text-[14px] font-medium leading-[21.7px] text-[#111111]">
                          {row.tool}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex rounded-[12px] px-[10px] py-[3px] text-[12px] leading-[14.4px]"
                            style={{ backgroundColor: badge.bg, color: badge.text }}
                          >
                            {row.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[14px] leading-[21.7px] text-[#555555]">
                          {row.connection}
                        </td>
                        <td className="px-4 py-3 text-[14px] leading-[21.7px] text-[#666666]">
                          {row.useCase}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-[30px] text-center text-[14px] leading-[21.7px] text-[#888888]">
              + 30 more tools including Asana, Linear, Freshdesk, Help Scout, BigCommerce,
              Leadpages, and more
            </p>
          </div>

          <section
            id="how-to-connect"
            className="mb-[70px] rounded-[16px] bg-[linear-gradient(180deg,#fffdf5_0%,#fff8e6_100%)] px-6 py-8 md:px-[50px] md:py-[50px]"
          >
            <h2
              className={`${workSans.className} text-center text-[28px] font-semibold leading-[33.6px] text-[#111111]`}
            >
              How to Connect Any Tool to BoltRoute
            </h2>
            <p className="mt-[10px] text-center text-[16px] leading-[25.6px] text-[#666666]">
              Same process for all 70+ tools. Pick your automation platform.
            </p>

            <div className="mt-[50px]">
              {guideCards.map((guide) => (
                <article
                  key={guide.title}
                  className="mb-[25px] rounded-[12px] border border-[#f0e6d3] bg-white p-[30px]"
                >
                  <div className="mb-5 flex items-center gap-3">
                    <img
                      src={guide.logoSrc}
                      alt={guide.logoAlt}
                      width={80}
                      height={80}
                      className="h-auto w-20 object-contain"
                    />
                    <h3
                      className={`${workSans.className} text-[20px] font-semibold leading-[24px] text-[#111111]`}
                    >
                      {guide.title}
                    </h3>
                  </div>

                  <div className="grid gap-[15px]">
                    {guide.steps.map((step, stepIndex) => (
                      <div key={step.lead} className="flex items-start gap-[15px]">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f5b800_0%,#f09819_100%)] text-[12px] font-semibold leading-[18.6px] text-white">
                          {stepIndex + 1}
                        </span>
                        <p className="text-[16px] leading-[26px] text-[#444444]">
                          <strong>{step.lead}</strong> {step.body}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-5 flex items-center gap-2 text-[13px] leading-[20.15px] text-[#888888]">
                    <Clock3 className="h-4 w-4" />
                    <span>Time to set up: {guide.time}</span>
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-10 rounded-[12px] border-2 border-[#f5b800] bg-white px-6 py-[25px] text-center">
              <p className="text-[16px] leading-[24.8px] text-[#111111]">
                <strong>Need help setting up?</strong>
              </p>
              <p className="mt-2 text-[16px] leading-[25.6px] text-[#666666]">
                We&apos;ll configure your first integration for free.
              </p>
              <a
                href="/contact"
                className="mt-5 inline-block rounded-[8px] bg-[linear-gradient(135deg,#f5b800_0%,#f09819_100%)] px-7 py-3 text-[14px] font-semibold leading-[21.7px] text-white"
              >
                Contact Support →
              </a>
            </div>
          </section>

          <section className="rounded-[16px] bg-[linear-gradient(135deg,#1a1a1a_0%,#2d2d2d_100%)] px-5 py-[50px] text-center md:px-10 md:py-[60px]">
            <h2
              className={`${workSans.className} text-[28px] font-semibold leading-[1.2] text-white md:text-[32px]`}
            >
              Start Verifying in Your Workflow Today
            </h2>
            <p className="mt-[15px] text-[18px] leading-[30.6px] text-[#aaaaaa]">
              100 free verifications. No credit card. Connect in minutes.
            </p>
            <div className="mt-[30px] flex flex-wrap justify-center gap-[15px]">
              <a
                href="https://app.boltroute.ai/"
                className="rounded-[8px] bg-[linear-gradient(135deg,#f5b800_0%,#f09819_100%)] px-8 py-[14px] text-[16px] font-semibold leading-[24.8px] text-white"
              >
                Start Free Trial →
              </a>
              <a
                href="https://docs.boltroute.ai/"
                className="rounded-[8px] border border-[rgba(255,255,255,0.3)] px-8 py-[14px] text-[16px] font-semibold leading-[24.8px] text-white"
              >
                View API Docs
              </a>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
