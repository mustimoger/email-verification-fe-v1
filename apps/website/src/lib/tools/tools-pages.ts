import { landings } from "@/lib/velite";

export const TOOLS_LANDING_SLUG_ALLOWLIST = [
  "data-enrichment-tools",
  "email-consulting",
  "email-deliverability",
  "email-list-cleaning-service",
  "email-regex",
  "email-sequence-verification",
  "email-validation-api",
  "email-verification-tools",
  "reverse-email-lookup-free",
  "verify-email-addresses-list",
  "warmup-inbox-email-verification",
] as const;

type LandingSourceItem = {
  slug: string;
  title: string;
  description?: string;
  metaDescription?: string;
  canonical?: string;
  featuredImage?: string;
  draft?: boolean;
};

export type ToolsPageCard = {
  slug: string;
  title: string;
  description: string;
  href: string;
  imageSrc?: string;
};

const isSupportedProtocol = (protocol: string) => protocol === "http:" || protocol === "https:";

const resolveHref = (item: LandingSourceItem): string => {
  if (item.canonical) {
    const value = item.canonical.trim();
    if (value) {
      try {
        const parsed = new URL(value);
        if (isSupportedProtocol(parsed.protocol)) {
          return parsed.toString();
        }
        console.warn(
          `[tools] Unsupported canonical protocol for landing \"${item.slug}\": ${parsed.protocol}`,
        );
      } catch {
        console.warn(`[tools] Ignoring invalid canonical URL for landing \"${item.slug}\".`);
      }
    }
  }

  return `/${item.slug}`;
};

const resolveDescription = (item: LandingSourceItem): string | null => {
  const description = item.description?.trim();
  if (description) {
    return description;
  }

  const metaDescription = item.metaDescription?.trim();
  if (metaDescription) {
    return metaDescription;
  }

  console.warn(`[tools] Missing description for landing \"${item.slug}\".`);
  return null;
};

const resolveImage = (item: LandingSourceItem): string | undefined => {
  const featuredImage = item.featuredImage?.trim();
  return featuredImage || undefined;
};

export const buildToolsPageCardsFromSource = (
  source: LandingSourceItem[],
): ToolsPageCard[] => {
  const publishedBySlug = new Map(
    source.filter((item) => !item.draft).map((item) => [item.slug, item]),
  );

  const cards: ToolsPageCard[] = [];

  for (const slug of TOOLS_LANDING_SLUG_ALLOWLIST) {
    const item = publishedBySlug.get(slug);

    if (!item) {
      console.warn(`[tools] Landing \"${slug}\" is missing or draft and will be skipped.`);
      continue;
    }

    const title = item.title?.trim();
    if (!title) {
      console.warn(`[tools] Landing \"${slug}\" has no title and will be skipped.`);
      continue;
    }

    const description = resolveDescription(item);
    if (!description) {
      continue;
    }

    cards.push({
      slug: item.slug,
      title,
      description,
      href: resolveHref(item),
      imageSrc: resolveImage(item),
    });
  }

  return cards;
};

export const getToolsPageCards = (): ToolsPageCard[] =>
  buildToolsPageCardsFromSource(landings);
