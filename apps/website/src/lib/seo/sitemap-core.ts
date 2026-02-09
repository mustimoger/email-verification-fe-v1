import { toAbsoluteUrl } from "@/lib/seo/site-url";

type BaseContentItem = {
  slug: string;
  canonical?: string;
  draft?: boolean;
};

type PostContentItem = BaseContentItem & {
  date?: string;
};

export type SitemapSource = {
  posts: PostContentItem[];
  pages: BaseContentItem[];
  landings: BaseContentItem[];
};

export type SitemapEntry = {
  url: string;
  lastModified?: Date;
};

export const PUBLIC_STATIC_PATHS = [
  "/",
  "/blog",
  "/contact",
  "/features",
  "/help",
  "/integrations",
  "/pricing",
  "/setup-guide",
] as const;

const isPlaceholderCanonical = (canonical?: string): boolean => {
  if (!canonical) return false;
  const normalized = canonical.toLowerCase();
  return normalized.includes("example.com");
};

const parseCanonicalUrl = (
  canonical: string,
  typeLabel: string,
  slug: string,
): string | null => {
  try {
    const parsed = new URL(canonical);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      console.warn(
        `[seo:sitemap] Skipping canonical URL with unsupported protocol for ${typeLabel} "${slug}".`,
      );
      return null;
    }
    return parsed.toString();
  } catch {
    console.warn(
      `[seo:sitemap] Ignoring invalid canonical URL for ${typeLabel} "${slug}".`,
    );
    return null;
  }
};

const normalizeSlug = (slug: string): string => {
  const trimmed = slug.trim();
  return trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
};

const parseLastModified = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};

const upsertEntry = (
  entriesByUrl: Map<string, SitemapEntry>,
  url: string,
  lastModified?: Date,
) => {
  const existing = entriesByUrl.get(url);
  if (!existing) {
    entriesByUrl.set(url, { url, lastModified });
    return;
  }

  if (!existing.lastModified && lastModified) {
    existing.lastModified = lastModified;
    return;
  }

  if (existing.lastModified && lastModified && lastModified > existing.lastModified) {
    existing.lastModified = lastModified;
  }
};

const resolveItemUrl = (
  item: BaseContentItem,
  baseUrl: URL | null,
  typeLabel: string,
): string | null => {
  if (item.canonical) {
    const canonicalUrl = parseCanonicalUrl(item.canonical, typeLabel, item.slug);
    if (canonicalUrl) return canonicalUrl;
  }

  const slug = normalizeSlug(item.slug);
  if (!slug) {
    console.warn(`[seo:sitemap] Skipping ${typeLabel} with empty slug.`);
    return null;
  }

  return toAbsoluteUrl(`/${slug}`, baseUrl);
};

const addStaticPaths = (
  entriesByUrl: Map<string, SitemapEntry>,
  baseUrl: URL | null,
) => {
  for (const path of PUBLIC_STATIC_PATHS) {
    const url = toAbsoluteUrl(path, baseUrl);
    if (!url) {
      console.warn(`[seo:sitemap] Skipping static path "${path}" because site URL is unavailable.`);
      continue;
    }
    upsertEntry(entriesByUrl, url);
  }
};

const addContentItems = (
  entriesByUrl: Map<string, SitemapEntry>,
  items: BaseContentItem[],
  baseUrl: URL | null,
  typeLabel: string,
) => {
  for (const item of items) {
    if (item.draft) continue;
    if (isPlaceholderCanonical(item.canonical)) continue;

    const url = resolveItemUrl(item, baseUrl, typeLabel);
    if (!url) {
      console.warn(
        `[seo:sitemap] Skipping ${typeLabel} "${item.slug}" because URL could not be resolved.`,
      );
      continue;
    }
    upsertEntry(entriesByUrl, url);
  }
};

const addPostItems = (
  entriesByUrl: Map<string, SitemapEntry>,
  items: PostContentItem[],
  baseUrl: URL | null,
) => {
  for (const item of items) {
    if (item.draft) continue;
    if (isPlaceholderCanonical(item.canonical)) continue;

    const url = resolveItemUrl(item, baseUrl, "post");
    if (!url) {
      console.warn(
        `[seo:sitemap] Skipping post "${item.slug}" because URL could not be resolved.`,
      );
      continue;
    }
    upsertEntry(entriesByUrl, url, parseLastModified(item.date));
  }
};

export const buildSitemapEntriesFromSource = (
  source: SitemapSource,
  baseUrl: URL | null,
): SitemapEntry[] => {
  const entriesByUrl = new Map<string, SitemapEntry>();

  addStaticPaths(entriesByUrl, baseUrl);
  addPostItems(entriesByUrl, source.posts, baseUrl);
  addContentItems(entriesByUrl, source.pages, baseUrl, "page");
  addContentItems(entriesByUrl, source.landings, baseUrl, "landing");

  return Array.from(entriesByUrl.values()).sort((a, b) => a.url.localeCompare(b.url));
};
