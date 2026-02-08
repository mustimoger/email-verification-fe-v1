import type { Metadata } from "next";
import { Inter, Work_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { BlogSection } from "@/components/BlogSection";
import { GetStartedSection } from "@/components/GetStartedSection";
import { CTACard } from "@/components/landing/CTACard";
import { mdxComponents } from "@/components/mdx/MDXComponents";
import { getMDXComponent } from "@/lib/mdx";
import { landings, pages, posts } from "@/lib/velite";

type ContentResult =
  | { type: "post"; data: (typeof posts)[number] }
  | { type: "page"; data: (typeof pages)[number] }
  | { type: "landing"; data: (typeof landings)[number] };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
const LEGAL_PAGE_SLUGS = new Set([
  "privacy-policy",
  "terms",
  "gdpr-compliance",
  "refund-policy",
]);
const HERO_GRADIENT =
  "linear-gradient(113deg,#101214 36%,#3348F6 73.7904%,#3398F6 87%,#32D9F6 94.1407%,#FFFFFF 100%)";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const publishedPosts = posts.filter((post) => !post.draft);
const publishedPages = pages.filter((page) => !page.draft);
const publishedLandings = landings.filter((landing) => !landing.draft);

const getContentBySlug = (slug: string): ContentResult | null => {
  const page = publishedPages.find((item) => item.slug === slug);
  if (page) {
    return { type: "page", data: page };
  }
  const landing = publishedLandings.find((item) => item.slug === slug);
  if (landing) {
    return { type: "landing", data: landing };
  }
  const post = publishedPosts.find((item) => item.slug === slug);
  if (post) {
    return { type: "post", data: post };
  }
  return null;
};

const toAbsoluteUrl = (path: string) => {
  if (!siteUrl) return undefined;
  try {
    return new URL(path, siteUrl).toString();
  } catch {
    return undefined;
  }
};

const stripUndefined = (value: Record<string, unknown>) =>
  JSON.parse(
    JSON.stringify(value, (_key, val) => (val === undefined ? undefined : val)),
  ) as Record<string, unknown>;

const formatPostDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const buildPostArticleSchema = (post: (typeof posts)[number], url?: string) => {
  const image = post.coverImage ? toAbsoluteUrl(post.coverImage) ?? post.coverImage : undefined;

  return stripUndefined({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: post.author
      ? {
          "@type": "Person",
          name: post.author.name,
          url: post.author.url,
        }
      : undefined,
    image: image ? [image] : undefined,
    url,
    mainEntityOfPage: url
      ? {
          "@type": "WebPage",
          "@id": url,
        }
      : undefined,
  });
};

const buildLandingWebPageSchema = (
  landing: (typeof landings)[number],
  url?: string,
) => {
  const image = landing.featuredImage
    ? toAbsoluteUrl(landing.featuredImage) ?? landing.featuredImage
    : undefined;

  return stripUndefined({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: landing.metaTitle ?? landing.title,
    description: landing.metaDescription ?? landing.description,
    url,
    primaryImageOfPage: image
      ? {
          "@type": "ImageObject",
          url: image,
        }
      : undefined,
  });
};

type ContentWithFaq = {
  faq?: Array<{ question: string; answer: string }>;
};

const buildFaqSchema = (content: ContentWithFaq) => {
  if (!content.faq?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
};

export async function generateStaticParams() {
  return [...publishedPages, ...publishedLandings, ...publishedPosts].map((item) => ({
    slug: item.slug,
  }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const content = getContentBySlug(params.slug);
  if (!content) return {};

  const canonical = content.data.canonical ?? toAbsoluteUrl(`/${content.data.slug}`);
  const title = content.data.metaTitle ?? content.data.title;
  const description = (() => {
    if (content.type === "post") return content.data.metaDescription ?? content.data.excerpt;
    return content.data.metaDescription ?? content.data.description;
  })();
  const image = (() => {
    if (content.type === "post") return content.data.coverImage;
    if (content.type === "landing") return content.data.featuredImage;
    return undefined;
  })();

  return {
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph:
      content.type === "post"
        ? {
            type: "article",
            title,
            description,
            url: canonical,
            images: image ? [image] : undefined,
          }
        : {
            type: "website",
            title,
            description,
            url: canonical,
            images: image ? [image] : undefined,
          },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

export default function ContentPage({ params }: { params: { slug: string } }) {
  const content = getContentBySlug(params.slug);

  if (!content) {
    notFound();
  }

  const MDXContent = getMDXComponent(content.data.body);
  const canonical = content.data.canonical ?? toAbsoluteUrl(`/${content.data.slug}`);
  const postSchema =
    content.type === "post" ? buildPostArticleSchema(content.data, canonical) : null;
  const landingSchema =
    content.type === "landing" ? buildLandingWebPageSchema(content.data, canonical) : null;
  const faqSchema =
    content.type === "post" || content.type === "landing"
      ? buildFaqSchema(content.data)
      : null;

  if (content.type === "post") {
    const formattedDate = formatPostDate(content.data.date);

    return (
      <main className="min-h-screen bg-white">
        {postSchema ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(postSchema) }}
          />
        ) : null}
        {faqSchema ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
          />
        ) : null}

        <article>
          <section className="relative pb-8 sm:pb-12">
            <div className="absolute inset-x-0 top-0 h-[620px] bg-[linear-gradient(130deg,#101214_0%,#101214_36.55%,#3348F6_72.26%,#3398F6_81.82%,#32D9F6_90.33%,#FFFFFF_100%)] sm:h-[780px] lg:h-[1006px]" />
            <div className="relative mx-auto flex w-full max-w-[1216px] flex-col items-center gap-12 px-5 pb-0 pt-[150px] sm:gap-14 sm:pt-[200px]">
              <div className="flex w-full max-w-[778px] flex-col items-center gap-5 text-center sm:gap-6">
                {content.data.category ? (
                  <span className="rounded-[8px] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-white">
                    {content.data.category}
                  </span>
                ) : null}
                <h1 className="text-[34px] font-semibold leading-[1.15] tracking-[-0.03em] text-white sm:text-[48px] sm:leading-[57.6px]">
                  {content.data.title}
                </h1>
                <p className="text-[17px] font-medium leading-[30px] text-[#EFF2F5] sm:text-[18px]">
                  {formattedDate}
                </p>
              </div>

              {content.data.coverImage ? (
                <div className="w-full">
                  <img
                    src={content.data.coverImage}
                    alt={content.data.title}
                    className="mx-auto h-auto w-full rounded-[8px] object-cover"
                  />
                </div>
              ) : null}
            </div>
          </section>

          <div className="mx-auto w-full max-w-[778px] px-5 pb-20 pt-10 sm:pt-14">
            <div className="blog-content space-y-4">
              <MDXContent components={mdxComponents} />
            </div>

            {content.data.relatedLinks?.length ? (
              <section className="mt-12 rounded-[16px] border border-[#001726]/10 bg-[#F8FAFC] p-6">
                <h2 className="mb-4 text-[20px] font-semibold text-[#001726]">
                  Related links
                </h2>
                <ul className="space-y-2 text-[16px] text-[#0F172A]">
                  {content.data.relatedLinks.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-[#3397F6] underline-offset-4 hover:underline"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </article>

        <BlogSection />
        <GetStartedSection />
      </main>
    );
  }

  if (content.type === "landing") {
    return (
      <main className="min-h-screen bg-white">
        {landingSchema ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(landingSchema) }}
          />
        ) : null}
        {faqSchema ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
          />
        ) : null}

        <article>
          <section className="relative overflow-hidden pb-10 pt-[140px] sm:pb-14 sm:pt-[184px]">
            <div className="absolute inset-x-0 top-0 h-[560px] bg-[linear-gradient(130deg,#101214_0%,#101214_38%,#1E3A8A_74%,#38BDF8_100%)] sm:h-[620px]" />
            <div className="relative mx-auto w-full max-w-[1216px] px-5">
              <div className="mx-auto flex max-w-[920px] flex-col items-center text-center">
                <h1 className="text-[34px] font-semibold leading-[1.15] tracking-[-0.03em] text-white sm:text-[48px] sm:leading-[57.6px]">
                  {content.data.title}
                </h1>
                {content.data.description ? (
                  <p className="mt-4 max-w-[760px] text-[18px] leading-[30px] text-[#E2E8F0]">
                    {content.data.description}
                  </p>
                ) : null}
              </div>

              {content.data.featuredImage ? (
                <div className="mx-auto mt-10 w-full max-w-[980px]">
                  <img
                    src={content.data.featuredImage}
                    alt={content.data.title}
                    className="h-auto w-full rounded-[12px] object-cover shadow-[0_14px_46px_rgba(15,23,42,0.28)]"
                  />
                </div>
              ) : null}

              {content.data.heroCta ? (
                <CTACard
                  variant="hero"
                  className="mx-auto mt-8 w-full max-w-[980px]"
                  {...content.data.heroCta}
                />
              ) : null}
            </div>
          </section>

          <section className="mx-auto w-full max-w-[920px] px-5 pb-20 pt-8 sm:pt-10">
            <div className="blog-content space-y-4">
              <MDXContent components={mdxComponents} />
            </div>

            {content.data.faq?.length ? (
              <section className="mt-14">
                <h2 className="mb-6 text-[30px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#001726] sm:text-[36px]">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-4">
                  {content.data.faq.map((item) => (
                    <article
                      key={item.question}
                      className="rounded-[14px] border border-[#001726]/10 bg-[#F8FAFC] p-5 sm:p-6"
                    >
                      <h3 className="text-[20px] font-semibold leading-[1.35] text-[#001726]">
                        {item.question}
                      </h3>
                      <p className="mt-2 text-[16px] leading-[28px] text-[#334155]">
                        {item.answer}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {content.data.endCta ? (
              <CTACard
                variant="end"
                className="mt-14"
                {...content.data.endCta}
              />
            ) : null}
          </section>
        </article>
      </main>
    );
  }

  if (LEGAL_PAGE_SLUGS.has(content.data.slug)) {
    return (
      <main id="scroll-trigger" className={`${inter.className} min-h-screen bg-white`}>
        <article>
          <section
            className="flex overflow-hidden px-0 pb-[60px] pt-[120px] text-white lg:pb-[120px] lg:pt-[200px]"
            style={{ background: HERO_GRADIENT }}
          >
            <div className="mx-auto w-full max-w-[1176px] px-5">
              <div className="mx-auto flex w-full max-w-[350px] flex-col items-center gap-4 text-center lg:max-w-[777px] lg:gap-6">
                <span className="inline-flex items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-white">
                  Legal
                </span>

                <h1
                  className={`${workSans.className} text-[40px] font-semibold leading-[50px] tracking-[-1.2px] text-white lg:text-[64px] lg:leading-[80px] lg:tracking-[-1.92px]`}
                >
                  {content.data.title}
                </h1>

                {content.data.description ? (
                  <p className="text-[16px] font-medium leading-[26.6667px] text-[#F0F3F6] lg:text-[18px] lg:leading-[30px]">
                    {content.data.description}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="bg-[#f6f6f6] py-[60px] lg:py-[120px]">
            <div className="mx-auto w-full max-w-[1216px] px-5">
              <div className="relative rounded-[12px] bg-white px-4 py-5 lg:px-12 lg:py-12">
                <div className="pointer-events-none absolute inset-0 rounded-[12px] border border-[rgba(16,18,20,0.1)]" />

                <div className="blog-content relative space-y-4">
                  <MDXContent components={mdxComponents} />
                </div>
              </div>
            </div>
          </section>
        </article>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <article className="mx-auto w-full max-w-[920px] px-5 pb-20 pt-12 lg:pt-16">
        <header className="mb-10">
          <h1 className="text-[36px] font-semibold leading-[44px] text-[#001726] lg:text-[48px] lg:leading-[58px]">
            {content.data.title}
          </h1>
          {content.data.description ? (
            <p className="mt-4 text-[18px] leading-[30px] text-[#475569]">
              {content.data.description}
            </p>
          ) : null}
        </header>

        <div className="blog-content space-y-4">
          <MDXContent components={mdxComponents} />
        </div>
      </article>
    </main>
  );
}
