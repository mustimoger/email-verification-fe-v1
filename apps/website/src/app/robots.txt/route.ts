import { resolveSiteUrl, toAbsoluteUrl } from "@/lib/seo/site-url";

const buildRobotsTxt = (sitemapUrl: string | null): string => {
  const lines = ["User-agent: *", "Allow: /"];
  if (sitemapUrl) {
    lines.push("", `Sitemap: ${sitemapUrl}`);
  }
  return `${lines.join("\n")}\n`;
};

export async function GET(request: Request) {
  const siteUrl = resolveSiteUrl(request);
  const sitemapUrl = toAbsoluteUrl("/sitemap.xml", siteUrl);
  const body = buildRobotsTxt(sitemapUrl);

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
