import { buildSitemapEntries } from "@/lib/seo/sitemap";
import { resolveSiteUrl } from "@/lib/seo/site-url";

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const buildSitemapXml = (
  entries: Array<{ url: string; lastModified?: Date }>,
): string => {
  const urls = entries.map((entry) => {
    const lastModifiedTag = entry.lastModified
      ? `<lastmod>${entry.lastModified.toISOString()}</lastmod>`
      : "";
    return `<url><loc>${escapeXml(entry.url)}</loc>${lastModifiedTag}</url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("");
};

export async function GET(request: Request) {
  const siteUrl = resolveSiteUrl(request);
  const entries = buildSitemapEntries(siteUrl);
  const body = buildSitemapXml(entries);

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
