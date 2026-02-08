import { defineCollection, defineConfig, s } from "velite";
import remarkGfm from "remark-gfm";

const faqSchema = s.object({
  question: s.string(),
  answer: s.string(),
});

const ctaSchema = s.object({
  badge: s.string().optional(),
  title: s.string(),
  description: s.string().optional(),
  primaryLabel: s.string(),
  primaryHref: s.string(),
  secondaryLabel: s.string().optional(),
  secondaryHref: s.string().optional(),
  bullets: s.array(s.string()).optional(),
});

const posts = defineCollection({
  name: "Post",
  pattern: "posts/*.mdx",
  schema: s.object({
    title: s.string(),
    slug: s.slug(),
    date: s.isodate(),
    excerpt: s.excerpt(),
    category: s.string().optional(),
    tags: s.array(s.string()).optional(),
    coverImage: s.string().optional(),
    metaTitle: s.string(),
    metaDescription: s.string(),
    canonical: s.string().url().optional(),
    author: s
      .object({
        name: s.string(),
        url: s.string().url().optional(),
      })
      .optional(),
    faq: s
      .array(faqSchema)
      .optional(),
    relatedLinks: s
      .array(
        s.object({
          label: s.string(),
          href: s.string().url(),
        }),
      )
      .optional(),
    draft: s.boolean().optional(),
    body: s.mdx(),
  }),
});

const pages = defineCollection({
  name: "Page",
  pattern: "pages/*.mdx",
  schema: s.object({
    title: s.string(),
    slug: s.slug(),
    description: s.string().optional(),
    metaTitle: s.string().optional(),
    metaDescription: s.string().optional(),
    canonical: s.string().url().optional(),
    draft: s.boolean().optional(),
    body: s.mdx(),
  }),
});

const landings = defineCollection({
  name: "LandingPage",
  pattern: "landing/*.mdx",
  schema: s.object({
    title: s.string(),
    slug: s.slug(),
    description: s.string().optional(),
    metaTitle: s.string().optional(),
    metaDescription: s.string().optional(),
    canonical: s.string().url().optional(),
    featuredImage: s.string().optional(),
    heroCta: ctaSchema.optional(),
    endCta: ctaSchema.optional(),
    faq: s.array(faqSchema).optional(),
    draft: s.boolean().optional(),
    body: s.mdx(),
  }),
});

export default defineConfig({
  root: "content",
  output: {
    data: "src/lib/velite",
    assets: "public/static",
    base: "/static/",
    clean: true,
  },
  mdx: {
    remarkPlugins: [remarkGfm],
  },
  collections: { posts, pages, landings },
});
