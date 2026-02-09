import { landings, pages, posts } from "@/lib/velite";
import { buildSitemapEntriesFromSource } from "@/lib/seo/sitemap-core";

export {
  PUBLIC_STATIC_PATHS,
  buildSitemapEntriesFromSource,
  type SitemapEntry,
  type SitemapSource,
} from "@/lib/seo/sitemap-core";

export const buildSitemapEntries = (baseUrl: URL | null) =>
  buildSitemapEntriesFromSource(
    {
      posts,
      pages,
      landings,
    },
    baseUrl,
  );
