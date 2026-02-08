import type { Metadata } from "next";
import { Inter, Work_Sans } from "next/font/google";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Integrations | BoltROUTE",
  description:
    "Seamless native and workflow integrations for BoltRoute across Zapier, Make, n8n, CRMs, forms, and marketing tools.",
  alternates: {
    canonical: "/integrations",
  },
};

const HERO_GRADIENT =
  "linear-gradient(113deg,#101214 36%,#3348F6 73.7904%,#3398F6 87%,#32D9F6 94.1407%,#FFFFFF 100%)";

type NativeIntegration = {
  logoSrc: string;
  logoAlt: string;
  logoWidth: number;
  logoHeight: number;
  title: string;
  description: string;
};

type WorkflowRow = {
  tool: string;
  category: string;
  connection: string;
  useCase: string;
};

const nativeIntegrations: NativeIntegration[] = [
  {
    logoSrc: "/integrations/zapier-logo.png",
    logoAlt: "Zapier",
    logoWidth: 116,
    logoHeight: 65,
    title: "Automate Verification in Any Zap",
    description:
      "Trigger email verification when new leads arrive, forms submit, or lists update. Full result data flows back to any connected tool.",
  },
  {
    logoSrc: "/integrations/google-sheets-logo.png",
    logoAlt: "Google Sheets",
    logoWidth: 109,
    logoHeight: 67,
    title: "Verify Directly in Your Spreadsheet",
    description:
      "Select a column, click verify, get results. No exports, no imports, no tab switching, no confusion. Works with any Google account.",
  },
  {
    logoSrc: "/integrations/n8n-logo.png",
    logoAlt: "n8n",
    logoWidth: 120,
    logoHeight: 48,
    title: "Native Node for Self-Hosted Workflows",
    description:
      "Full BoltRoute node for n8n cloud or self-hosted. Verify emails inside complex automations with complete result access, verify you already work.",
  },
  {
    logoSrc: "/integrations/make-logo.png",
    logoAlt: "Make",
    logoWidth: 116,
    logoHeight: 71,
    title: "Visual Workflows With Your Full Control",
    description:
      "Build multi-step verification scenarios. Route emails by status, handle errors gracefully, process batches automatically.",
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
    tool: "Copper",
    category: "CRM",
    connection: "Zapier",
    useCase: "Clean Google Workspace contacts",
  },
  {
    tool: "Freshsales",
    category: "CRM",
    connection: "Zapier, Make",
    useCase: "Validate new leads automatically",
  },
  {
    tool: "Zoho CRM",
    category: "CRM",
    connection: "Zapier, Make, n8n",
    useCase: "Verify contacts on import",
  },
  {
    tool: "Monday CRM",
    category: "CRM",
    connection: "Zapier, Make, n8n",
    useCase: "Clean sales pipeline data",
  },
  {
    tool: "Streak",
    category: "CRM",
    connection: "Zapier",
    useCase: "Verify Gmail contacts",
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
    tool: "Lusha",
    category: "Lead Gen",
    connection: "Zapier",
    useCase: "Verify prospecting data",
  },
  {
    tool: "Leadfeeder",
    category: "Lead Gen",
    connection: "Zapier",
    useCase: "Clean identified website visitors",
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
    tool: "Drip",
    category: "Email Marketing",
    connection: "Zapier, Make",
    useCase: "Verify e-commerce subscribers",
  },
  {
    tool: "Brevo",
    category: "Email Marketing",
    connection: "Zapier, Make",
    useCase: "Clean transactional email lists",
  },
  {
    tool: "GetResponse",
    category: "Email Marketing",
    connection: "Zapier",
    useCase: "Verify webinar registrants",
  },
  {
    tool: "MailerLite",
    category: "Email Marketing",
    connection: "Zapier, Make",
    useCase: "Clean newsletter subscribers",
  },
  {
    tool: "AWeber",
    category: "Email Marketing",
    connection: "Zapier",
    useCase: "Validate opt-in lists",
  },
  {
    tool: "Constant Contact",
    category: "Email Marketing",
    connection: "Zapier",
    useCase: "Clean legacy email lists",
  },
  {
    tool: "Omnisend",
    category: "Email Marketing",
    connection: "Zapier",
    useCase: "Verify Shopify customers",
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
    tool: "Google Forms",
    category: "Forms",
    connection: "Zapier, Make",
    useCase: "Clean spreadsheet form data",
  },
  {
    tool: "Paperform",
    category: "Forms",
    connection: "Zapier",
    useCase: "Verify before adding to list",
  },
  {
    tool: "Formstack",
    category: "Forms",
    connection: "Zapier",
    useCase: "Validate enterprise form data",
  },
  {
    tool: "Wufoo",
    category: "Forms",
    connection: "Zapier",
    useCase: "Clean legacy form submissions",
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
    tool: "Smartsheet",
    category: "Database",
    connection: "Zapier",
    useCase: "Validate spreadsheet data",
  },
  {
    tool: "Coda",
    category: "Database",
    connection: "Zapier, Make",
    useCase: "Verify doc-based lists",
  },
  {
    tool: "Baserow",
    category: "Database",
    connection: "n8n",
    useCase: "Clean self-hosted databases",
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
    tool: "Leadpages",
    category: "Landing Page",
    connection: "Zapier",
    useCase: "Verify opt-in submissions",
  },
  {
    tool: "ClickFunnels",
    category: "Landing Page",
    connection: "Zapier",
    useCase: "Validate funnel leads",
  },
  {
    tool: "Carrd",
    category: "Landing Page",
    connection: "Zapier",
    useCase: "Verify simple site forms",
  },
  {
    tool: "Instapage",
    category: "Landing Page",
    connection: "Zapier",
    useCase: "Clean A/B test submissions",
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
    tool: "BigCommerce",
    category: "E-commerce",
    connection: "Zapier",
    useCase: "Validate customer signups",
  },
  {
    tool: "Squarespace",
    category: "E-commerce",
    connection: "Zapier",
    useCase: "Verify store customers",
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
    tool: "Freshdesk",
    category: "Support",
    connection: "Zapier",
    useCase: "Validate ticket submissions",
  },
  {
    tool: "Help Scout",
    category: "Support",
    connection: "Zapier",
    useCase: "Verify customer emails",
  },
  {
    tool: "Crisp",
    category: "Support",
    connection: "Zapier, Make",
    useCase: "Clean chatbot leads",
  },
  {
    tool: "Drift",
    category: "Support",
    connection: "Zapier",
    useCase: "Verify conversational leads",
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
    tool: "Microsoft Teams",
    category: "Communication",
    connection: "Zapier, Make",
    useCase: "Alert sales on bad leads",
  },
  {
    tool: "Calendly",
    category: "Scheduling",
    connection: "Zapier, Make",
    useCase: "Verify meeting bookers",
  },
  {
    tool: "Cal.com",
    category: "Scheduling",
    connection: "Zapier, n8n",
    useCase: "Clean scheduling contacts",
  },
  {
    tool: "Acuity",
    category: "Scheduling",
    connection: "Zapier",
    useCase: "Validate appointment emails",
  },
  {
    tool: "Trello",
    category: "Project Mgmt",
    connection: "Zapier, Make, n8n",
    useCase: "Verify contacts on cards",
  },
  {
    tool: "Asana",
    category: "Project Mgmt",
    connection: "Zapier, Make",
    useCase: "Clean task-assigned emails",
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
  {
    tool: "Linear",
    category: "Project Mgmt",
    connection: "Zapier",
    useCase: "Clean issue reporter emails",
  },
];

export default function IntegrationsPage() {
  return (
    <main id="scroll-trigger" className={`${inter.className} min-h-screen bg-white`}>
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

      <section className="bg-[#ececec] px-5 pb-[60px] pt-[60px]">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="mx-auto w-full max-w-[800px] text-center">
            <h2
              className={`${workSans.className} text-[28px] font-semibold leading-[1.25] text-[#111111] md:text-[36px]`}
            >
              Native Integrations
            </h2>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-4">
            {nativeIntegrations.map((integration) => (
              <article
                key={integration.title}
                className="mx-auto w-full max-w-[250px] rounded-[24px] border border-[#b5bdbc] bg-[#edc100] px-[30px] pb-[28px] pt-[20px] lg:mx-0 lg:min-h-[436px]"
              >
                <div className="flex min-h-[72px] items-center justify-center">
                  <img
                    src={integration.logoSrc}
                    alt={integration.logoAlt}
                    width={integration.logoWidth}
                    height={integration.logoHeight}
                    className="h-auto"
                  />
                </div>

                <div className="mx-auto mt-[12px] max-w-[198px]">
                  <h2
                    className={`${workSans.className} text-[26px] font-normal leading-[31.2px] text-[#5f6375]`}
                  >
                    {integration.title}
                  </h2>
                  <p
                    className={`${inter.className} pt-[10px] text-[16px] leading-[24.8px] text-[#646a74]`}
                  >
                    {integration.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="my-7 px-5 pb-[60px]">
        <div className="mx-auto w-full max-w-[1100px]">
          <h2
            className={`${workSans.className} text-center text-[28px] font-semibold leading-[1.25] text-[#111111] md:text-[36px]`}
          >
            Workflow Integrations
          </h2>
          <p
            className={`${inter.className} mt-2 text-center text-[16.8px] leading-[26.04px] text-[#111111]`}
          >
            Connect BoltRoute to these tools via Zapier, Make, or n8n
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className={`${inter.className} min-w-[980px] w-full border-collapse text-left text-[15px]`}>
              <thead>
                <tr className="bg-[linear-gradient(135deg,#f5b800_0%,#e8a835_50%,#f09819_100%)] text-white">
                  <th className="px-[14px] py-[14px] text-[15px] font-semibold leading-[23.25px]">
                    Tool
                  </th>
                  <th className="px-[14px] py-[14px] text-[15px] font-semibold leading-[23.25px]">
                    Category
                  </th>
                  <th className="px-[14px] py-[14px] text-[15px] font-semibold leading-[23.25px]">
                    Connection
                  </th>
                  <th className="px-[14px] py-[14px] text-[15px] font-semibold leading-[23.25px]">
                    Use Case
                  </th>
                </tr>
              </thead>
              <tbody>
                {workflowRows.map((row, index) => (
                  <tr
                    key={`${row.tool}-${row.category}`}
                    className={`border-b border-[#f0e6d3] ${index % 2 === 1 ? "bg-[#fffdf5]" : "bg-transparent"}`}
                  >
                    <td className="px-3 py-3 text-[15px] font-medium leading-[23.25px] text-[#111111]">
                      {row.tool}
                    </td>
                    <td className="px-3 py-3 text-[15px] font-normal leading-[23.25px] text-[#111111]">
                      {row.category}
                    </td>
                    <td className="px-3 py-3 text-[15px] font-normal leading-[23.25px] text-[#555555]">
                      {row.connection}
                    </td>
                    <td className="px-3 py-3 text-[15px] font-normal leading-[23.25px] text-[#666666]">
                      {row.useCase}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 text-center">
            <p
              className={`${inter.className} inline-flex flex-wrap items-center justify-center gap-x-1 rounded-[16px] bg-[#f09819] px-5 py-3 text-[16.8px] leading-[26.04px] text-[#111111]`}
            >
              <strong>Don’t see your tool?</strong>
              <span>If it connects to Zapier, Make, or n8n, it works with BoltRoute.</span>
              <a
                href="/setup-guide"
                className="font-semibold text-[#111111] underline-offset-4 transition hover:underline"
              >
                SETUP GUIDE →
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
