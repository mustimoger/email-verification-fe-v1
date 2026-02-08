import { Work_Sans, Inter } from "next/font/google";
import { posts } from "@/lib/velite";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export function BlogSection() {
  const featuredPosts = posts
    .filter((post) => !post.draft)
    // Keep home cards aligned with /blog ordering.
    .filter((post) => !post.canonical?.includes("example.com"))
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() || a.slug.localeCompare(b.slug),
    )
    .slice(0, 2);

  return (
    <section id="blog" className={`${inter.className} bg-white pt-[52px] lg:pt-[50px]`}>
      <div className="mx-auto w-full max-w-[1176px] px-5">
        <div className="flex flex-col items-center gap-4">
          <span className="rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[#3397F6]/20 px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-[#001726]">
            Blog Insight
          </span>
          <div className="flex w-full max-w-[775px] flex-col items-center justify-center lg:min-h-[115px]">
            <h2
              className={`${workSans.className} text-center text-[36px] font-semibold leading-[43.2px] tracking-[-0.03em] text-[#001726] lg:text-[48px] lg:leading-[57.6px]`}
            >
              Practical Guides on Email Verification, Deliverability, List Hygiene
            </h2>
          </div>
        </div>

        <div className="mx-auto mt-[30px] w-full max-w-[480px] lg:mt-[6px] lg:max-w-none">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {featuredPosts.map((post) => (
              <a
                key={post.slug}
                href={`/${post.slug}`}
                className="relative flex items-center gap-3 rounded-[12px] bg-white p-[10px] pr-[23.5px] text-left md:gap-[18px] lg:gap-[27px]"
              >
                <div className="relative h-[108.53125px] w-[108.53125px] shrink-0 overflow-hidden rounded-[6px] md:h-[160.734375px] md:w-[160.734375px] lg:h-[217px] lg:w-[217px] lg:rounded-[8px]">
                  <img
                    src={post.coverImage ?? "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80"}
                    alt={post.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-3 lg:gap-4">
                  {post.category ? (
                    <span className="w-fit rounded-[5px] bg-[#EFF2F5] px-2 py-[6px] text-[14px] font-medium leading-[16.8px] text-[#101214]">
                      {post.category}
                    </span>
                  ) : null}
                  <h3
                    className={`${workSans.className} text-[16px] font-semibold leading-[22.4px] tracking-[-0.02em] text-[#001726] lg:text-[20px] lg:leading-[28px]`}
                  >
                    {post.title}
                  </h3>
                </div>
                <span className="pointer-events-none absolute inset-0 rounded-[12px] border border-[#101214]/10" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
