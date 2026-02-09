import { resolveSiteUrl, toAbsoluteUrl } from "@/lib/seo/site-url";

const removeTrailingSlash = (url: string): string =>
  url.endsWith("/") ? url.slice(0, -1) : url;

const buildLlmsTxt = (siteUrl: URL | null): string => {
  const siteOrigin = siteUrl ? removeTrailingSlash(siteUrl.toString()) : "Unavailable";
  const sitemapUrl = toAbsoluteUrl("/sitemap.xml", siteUrl) ?? "Unavailable";

  const sections = [
    "# BoltRoute",
    "",
    "BoltRoute is a platform for email verification, list hygiene, and deliverability operations.",
    "",
    "Policy: All AI/LLM crawlers are allowed to access public website content.",
    "",
    `Site: ${siteOrigin}`,
    `Sitemap: ${sitemapUrl}`,
    "",
    "Primary public resources:",
    `- ${toAbsoluteUrl("/", siteUrl) ?? "/"}`,
    `- ${toAbsoluteUrl("/blog", siteUrl) ?? "/blog"}`,
    `- ${toAbsoluteUrl("/help", siteUrl) ?? "/help"}`,
    `- ${toAbsoluteUrl("/integrations", siteUrl) ?? "/integrations"}`,
    `- ${toAbsoluteUrl("/pricing", siteUrl) ?? "/pricing"}`,
    `- ${toAbsoluteUrl("/contact", siteUrl) ?? "/contact"}`,
    "",
    "Legal pages:",
    `- ${toAbsoluteUrl("/privacy-policy", siteUrl) ?? "/privacy-policy"}`,
    `- ${toAbsoluteUrl("/terms", siteUrl) ?? "/terms"}`,
    `- ${toAbsoluteUrl("/gdpr-compliance", siteUrl) ?? "/gdpr-compliance"}`,
    `- ${toAbsoluteUrl("/refund-policy", siteUrl) ?? "/refund-policy"}`,
    "",
  ];

  return sections.join("\n");
};

export async function GET(request: Request) {
  const siteUrl = resolveSiteUrl(request);
  const body = buildLlmsTxt(siteUrl);

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
