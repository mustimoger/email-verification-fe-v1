import type { Metadata } from "next";
import { Inter, Work_Sans } from "next/font/google";
import { BlogListSection, type BlogListPost } from "@/components/blog/BlogListSection";
import { GetStartedSection } from "@/components/GetStartedSection";
import { posts } from "@/lib/velite";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Our Blogs | BoltROUTE",
  description:
    "As companies strive to streamline operations and enhance customer experiences, adoption of modern SaaS models is accelerating.",
  alternates: {
    canonical: "/blog",
  },
};

const HERO_GRADIENT =
  "linear-gradient(114deg,#101214 36%,#3348F6 73.7904%,#3398F6 85%,#32D9F6 94.1407%,#FFFFFF 100%)";

const sortedPosts: BlogListPost[] = posts
  .filter((post) => !post.draft)
  // Exclude placeholder template entries copied from demo content.
  .filter((post) => !post.canonical?.includes("example.com"))
  .sort(
    (a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime() || a.slug.localeCompare(b.slug),
  )
  .map((post) => ({
    slug: post.slug,
    title: post.title,
    category: post.category,
    coverImage: post.coverImage,
  }));

export default function BlogPage() {
  return (
    <main id="scroll-trigger" className="min-h-screen bg-white">
      <section
        className={`${inter.className} flex overflow-hidden px-0 pb-[120px] pt-[200px] text-white`}
        style={{ background: HERO_GRADIENT }}
      >
        <div className="mx-auto w-full max-w-[1176px] px-5">
          <div className="mx-auto flex w-full max-w-[777px] flex-col items-center text-center">
            <span className="inline-flex items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-white">
              Blogs &amp; Articles
            </span>

            <h1
              className={`${workSans.className} mt-6 text-[40px] font-semibold leading-[50px] tracking-[-0.03em] text-white lg:text-[64px] lg:leading-[80px]`}
            >
              Our Blogs
            </h1>

            <p className="mt-6 text-[16px] font-medium leading-[26.67px] text-[#F0F3F6] lg:text-[18px] lg:leading-[30px]">
              Clear, practical guides on email verification, deliverability, and list hygiene
              — written for teams that send at scale
            </p>
          </div>
        </div>
      </section>

      <BlogListSection posts={sortedPosts} />
      <GetStartedSection />
    </main>
  );
}
