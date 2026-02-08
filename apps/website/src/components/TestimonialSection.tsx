import { Work_Sans, Inter } from "next/font/google";
import { Star } from "lucide-react";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export function TestimonialSection() {
  return (
    <section
      className={`${inter.className} bg-white pt-0 pb-[60px] lg:pt-8 lg:pb-[120px]`}
    >
      <div className="mx-auto w-full max-w-[1176px] px-5">
        <div className="relative mx-auto w-full max-w-[480px] lg:max-w-none">
          <div className="relative overflow-hidden rounded-[12px] bg-[#001726] px-[20px] py-[24px] lg:h-[508px] lg:pl-[48px] lg:pr-[32px] lg:pt-[79px] lg:pb-[78px]">
            {/* Subtle angled rounded-rectangle highlight behind the copy */}
            <div
              className="pointer-events-none absolute left-[-190px] bottom-[-40px] h-[330px] w-[420px] rounded-[60px] bg-white/10 md:left-[-210px] md:bottom-[-90px] md:h-[390px] md:w-[520px] md:rounded-[70px] lg:left-[-230px] lg:bottom-[-130px] lg:h-[450px] lg:w-[620px] lg:rounded-[80px]"
              style={{ transform: "rotate(-30deg)" }}
            />

            <div className="pointer-events-none absolute left-[-17px] top-[602px] h-[228px] w-[355px] -translate-x-1/2 -translate-y-1/2 md:left-[-24px] md:top-[582px] md:h-[327px] md:w-[509px] lg:left-[-59px] lg:top-[462px] lg:h-[801px] lg:w-[1247px]">
              <div className="absolute inset-0 md:hidden">
                <div
                  className="absolute h-[138px] w-[227px] rounded-[106px] bg-[#101214]/[0.04]"
                  style={{
                    transform:
                      "matrix(0.951057, -0.309017, 0.309017, 0.951057, 0, 0)",
                  }}
                />
                <div
                  className="absolute h-[138px] w-[227px] rounded-[106px] bg-white/[0.08]"
                  style={{
                    transform:
                      "matrix(0.951057, -0.309017, 0.309017, 0.951057, -113.625, -68.9062)",
                  }}
                />
              </div>

              <div className="absolute inset-0 hidden md:block lg:hidden">
                <div
                  className="absolute h-[197px] w-[326px] rounded-[106px] bg-[#101214]/[0.04]"
                  style={{
                    transform:
                      "matrix(0.951057, -0.309017, 0.309017, 0.951057, 0, 0)",
                  }}
                />
                <div
                  className="absolute h-[197px] w-[326px] rounded-[106px] bg-white/[0.08]"
                  style={{
                    transform:
                      "matrix(0.951057, -0.309017, 0.309017, 0.951057, -162.812, -98.7344)",
                  }}
                />
              </div>

              <div className="absolute inset-0 hidden lg:block">
                <div
                  className="absolute h-[484px] w-[798px] rounded-[106px] bg-[#101214]/[0.04]"
                  style={{
                    transform:
                      "matrix(0.951057, -0.309017, 0.309017, 0.951057, 0, 0)",
                  }}
                />
                <div
                  className="absolute h-[484px] w-[798px] rounded-[106px] bg-white/[0.08]"
                  style={{
                    transform:
                      "matrix(0.951057, -0.309017, 0.309017, 0.951057, -398.891, -241.914)",
                  }}
                />
              </div>
            </div>

            <div className="relative z-10 w-full lg:max-w-[528px]">
              <div className="flex items-center gap-4 lg:gap-[25px]">
                <img
                  src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80"
                  alt="Dennis J. Lester"
                  className="h-[55px] w-[55px] rounded-full object-cover lg:h-[65px] lg:w-[65px]"
                />
                <div>
                  <p
                    className={`${workSans.className} text-[18px] font-semibold leading-[24px] tracking-[-0.02em] text-white lg:text-[24px] lg:leading-[32px]`}
                  >
                    Dennis J. Lester
                  </p>
                  <p className="text-[15px] font-medium leading-[26.25px] text-white lg:text-[16px] lg:leading-[28px]">
                    CEO & Founder
                  </p>
                </div>
              </div>

              <p
                className={`${workSans.className} mt-4 text-[16px] font-semibold leading-[22.4px] tracking-[-0.02em] text-white lg:mt-10 lg:text-[20px] lg:leading-[28px]`}
              >
                The financial reports and insights have given me a much clearer
                picture of my spending habits. I used to think I was budgeting
                properly, but this platform helped me identify areas where I could
                save more. It&apos;s a game-changer.
              </p>

              <div className="mt-6 lg:mt-10">
                <div className="flex items-center gap-[5px]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span
                      key={`star-${index}`}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-[1px] bg-[#3397F6] text-white"
                    >
                      {/* Lucide Star is the closest match to the filled star icon. */}
                      <Star className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[16px] font-semibold leading-[26.6667px] text-white lg:text-[18px] lg:leading-[30px]">
                  4.7/5 on Trustp
                </p>
              </div>
            </div>

            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80"
              alt="Testimonial"
              className="mt-[30px] h-[300px] w-full rounded-[12px] object-cover lg:hidden"
            />
          </div>

          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
            alt="Testimonial"
            className="absolute -top-8 right-8 hidden h-[485px] w-[438px] rounded-[12px] object-cover lg:block"
          />
        </div>
      </div>
    </section>
  );
}
