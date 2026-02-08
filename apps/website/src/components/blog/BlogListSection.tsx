"use client";

import { Inter, Work_Sans } from "next/font/google";
import { useState } from "react";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80";
const PAGE_SIZE = 4;

export type BlogListPost = {
  slug: string;
  title: string;
  category?: string;
  coverImage?: string;
};

type BlogListSectionProps = {
  posts: BlogListPost[];
};

export function BlogListSection({ posts }: BlogListSectionProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visiblePosts = posts.slice(0, visibleCount);
  const hasMore = visibleCount < posts.length;

  return (
    <section className={`${inter.className} bg-white pb-0 pt-[120px]`}>
      <div className="mx-auto w-full max-w-[1176px] px-5">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {visiblePosts.map((post) => (
            <a
              key={post.slug}
              href={`/${post.slug}`}
              className="relative flex min-h-[180px] items-center gap-3 rounded-[12px] bg-white p-[10px] pr-[23.5px] text-left md:gap-[18px] lg:min-h-[237px] lg:gap-[27px]"
            >
              <div className="relative h-[108.53125px] w-[108.53125px] shrink-0 overflow-hidden rounded-[6px] md:h-[160.734375px] md:w-[160.734375px] lg:h-[217px] lg:w-[217px] lg:rounded-[8px]">
                <img
                  src={post.coverImage ?? FALLBACK_COVER}
                  alt={post.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-col gap-3 lg:gap-4">
                <span className="w-fit rounded-[5px] bg-[#EFF2F5] px-2 py-[6px] text-[14px] font-medium leading-[16.8px] text-[#101214]">
                  {post.category ?? "Software"}
                </span>
                <h2
                  className={`${workSans.className} text-[16px] font-semibold leading-[22.4px] tracking-[-0.02em] text-[#001726] lg:text-[20px] lg:leading-[28px]`}
                >
                  {post.title}
                </h2>
              </div>

              <span className="pointer-events-none absolute inset-0 rounded-[12px] border border-[#101214]/10" />
            </a>
          ))}
        </div>

        {hasMore ? (
          <div className="pt-6 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, posts.length))}
              className={`${workSans.className} inline-flex items-center justify-center rounded-[8px] bg-[#3397F6] px-4 py-2 text-[16px] font-semibold leading-[24px] text-white transition-colors hover:bg-[#2C89E8]`}
            >
              Load More
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
