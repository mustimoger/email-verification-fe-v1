import { Work_Sans, Inter } from "next/font/google";

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
          <div className="relative overflow-hidden rounded-[12px] bg-[#001726] px-[20px] py-[24px] lg:min-h-[508px] lg:pl-[48px] lg:pr-[32px] lg:pt-[79px] lg:pb-[78px]">
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

            <div className="relative z-10 w-full lg:max-w-[500px]">
              <h3
                className={`${workSans.className} text-[24px] font-semibold leading-[31.2px] tracking-[-0.03em] text-white lg:text-[40px] lg:leading-[52px]`}
              >
                Trusted by Email Marketers &amp; Sales Teams Worldwide
              </h3>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-8">
                {[
                  { value: "300M+", label: "Emails Verified & Counting" },
                  { value: "99.1%", label: "Verification Accuracy Rate" },
                  { value: "0%", label: "Charge for Unknown Results" },
                  { value: "∞", label: "Credits Never Expire" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[10px] bg-white/10 px-4 py-4">
                    <p
                      className={`${workSans.className} text-[30px] font-semibold leading-[1] tracking-[-0.03em] text-white lg:text-[38px]`}
                    >
                      {item.value}
                    </p>
                    <p className="mt-2 text-[14px] font-medium leading-[1.4] text-white/90 lg:text-[15px]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <p
                className={`${workSans.className} mt-6 text-[16px] font-semibold leading-[1.55] tracking-[-0.02em] text-white lg:mt-8 lg:text-[20px] lg:leading-[30px]`}
              >
                Don&apos;t take our word for it — sign up free and verify 100 emails on us. See the
                accuracy yourself.
              </p>

              <a
                href="https://app.boltroute.ai/signup"
                className="mt-6 inline-flex items-center rounded-[999px] bg-[#3397F6] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#2382de] lg:mt-8 lg:text-[16px]"
              >
                Start Free — No Credit Card Required
              </a>
            </div>

            <img
              src="/email-list-cleanup.png"
              alt="Testimonial"
              className="mt-[30px] h-[300px] w-full rounded-[12px] object-cover lg:hidden"
            />
          </div>

          <img
            src="/email-list-cleanup.png"
            alt="Testimonial"
            className="absolute -top-8 right-8 hidden h-[485px] w-[438px] origin-top-right scale-[1.2] rounded-[12px] object-cover lg:block"
          />
        </div>
      </div>
    </section>
  );
}
