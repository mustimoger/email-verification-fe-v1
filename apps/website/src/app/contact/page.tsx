import type { Metadata } from "next";
import { Inter, Work_Sans } from "next/font/google";
import { ArrowUpRight, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Contact Us | BoltROUTE",
  description:
    "We're here to help you take your business to the next level with our cutting-edge SaaS solutions.",
  alternates: {
    canonical: "/contact",
  },
};

const HERO_GRADIENT =
  "linear-gradient(113deg,#101214 36%,#3348F6 73.7904%,#3398F6 87%,#32D9F6 94.1407%,#FFFFFF 100%)";

const contactDetails: { label: string; href: string; Icon: LucideIcon }[] = [
  {
    label: "sales@boltroute.ai",
    href: "mailto:sales@boltroute.ai",
    Icon: Mail,
  },
  {
    label: "Premier Campus Istanbul / TURKIYE",
    href: "https://www.google.com/maps",
    Icon: MapPin,
  },
  {
    label: "+90 (216) 522 98 90",
    href: "tel:+902165229890",
    Icon: Phone,
  },
];

export default function ContactPage() {
  return (
    <main id="scroll-trigger" className={`${inter.className} min-h-screen bg-white`}>
      <section
        className="flex overflow-hidden px-0 pb-[60px] pt-[120px] text-white lg:pb-[120px] lg:pt-[200px]"
        style={{ background: HERO_GRADIENT }}
      >
        <div className="mx-auto w-full max-w-[1176px] px-5">
          <div className="mx-auto flex w-full max-w-[350px] flex-col items-center gap-4 text-center lg:max-w-[777px] lg:gap-6">
            <span className="inline-flex items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-white">
              Let&apos;s Connect
            </span>

            <h1
              className={`${workSans.className} text-[40px] font-semibold leading-[50px] tracking-[-1.2px] text-white lg:text-[64px] lg:leading-[80px] lg:tracking-[-1.92px]`}
            >
              Contact Us
            </h1>

            <p className="text-[16px] font-medium leading-[26.6667px] text-[#F0F3F6] lg:text-[18px] lg:leading-[30px]">
              We&apos;re here to help you take your business to the next level with our
              cutting-edge SaaS solutions.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f6f6] py-[60px] lg:py-[120px]">
        <div className="mx-auto w-full max-w-[1216px] px-5">
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,476px)_minmax(0,676px)] lg:justify-center lg:gap-[30px]">
            <div className="flex h-full flex-col gap-5 rounded-[12px] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(51,151,246,0.2)_100%)] px-4 py-5 lg:gap-[30px] lg:px-12 lg:py-12">
              <div className="flex flex-col gap-4 lg:gap-6">
                <span className="inline-flex w-fit items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-[#001726]">
                  Get In Touch
                </span>

                <h3
                  className={`${workSans.className} text-[24px] font-semibold leading-[31.2px] tracking-[-0.72px] text-[#001726] lg:text-[40px] lg:leading-[52px] lg:tracking-[-1.2px]`}
                >
                  Need Any Support
                  <br />
                  for your SaaS ?
                </h3>
              </div>

              <p className="text-[16px] font-medium leading-[28px] text-[#696969]">
                We&apos;re here to help you take your business to the next level with our
                cutting-edge SaaS solutions.
              </p>

              <div className="flex flex-col gap-5 lg:gap-[30px]">
                {contactDetails.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    className="flex items-center gap-3 text-[#001726] lg:flex-nowrap"
                  >
                    <Icon className="h-8 w-8 shrink-0 text-[#3397F6]" strokeWidth={1.8} />
                    <span className="text-[16px] font-medium leading-[28px]">{label}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="relative h-full rounded-[12px] bg-white px-4 py-5 lg:px-12 lg:py-12">
              <div className="pointer-events-none absolute inset-0 rounded-[12px] border border-[rgba(16,18,20,0.1)]" />

              <h6
                className={`${workSans.className} relative text-[16px] font-semibold leading-[22.4px] tracking-[-0.32px] text-[#001726] lg:text-[20px] lg:leading-[28px] lg:tracking-[-0.4px]`}
              >
                Send Us Message
              </h6>

              <form className="relative mt-5 flex w-full flex-col gap-5">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <label className="flex flex-col text-[16px] font-medium leading-[28px] text-[#001726]">
                    Name
                    <span className="mt-2 h-14 overflow-hidden rounded-[8px] border border-[#DCE2E8] bg-[#EBF0F5]">
                      <input
                        type="text"
                        name="name"
                        className="h-full w-full bg-transparent px-5 py-[14px] text-[16px] font-medium leading-[28px] text-[#001726] placeholder:text-[#696969] focus:outline-none"
                      />
                    </span>
                  </label>

                  <label className="flex flex-col text-[16px] font-medium leading-[28px] text-[#001726]">
                    Phone
                    <span className="mt-2 h-14 overflow-hidden rounded-[8px] border border-[#DCE2E8] bg-[#EBF0F5]">
                      <input
                        type="tel"
                        name="phone"
                        className="h-full w-full bg-transparent px-5 py-[14px] text-[16px] font-medium leading-[28px] text-[#001726] placeholder:text-[#696969] focus:outline-none"
                      />
                    </span>
                  </label>
                </div>

                <label className="flex flex-col text-[16px] font-medium leading-[28px] text-[#001726]">
                  Email
                  <span className="mt-2 h-14 overflow-hidden rounded-[8px] border border-[#DCE2E8] bg-[#EBF0F5]">
                    <input
                      type="email"
                      name="email"
                      className="h-full w-full bg-transparent px-5 py-[14px] text-[16px] font-medium leading-[28px] text-[#001726] placeholder:text-[#696969] focus:outline-none"
                    />
                  </span>
                </label>

                <label className="flex flex-col text-[16px] font-medium leading-[28px] text-[#001726]">
                  Message
                  <span className="mt-2 overflow-hidden rounded-[8px] border border-[#DCE2E8] bg-[#EBF0F5]">
                    <textarea
                      name="message"
                      rows={4}
                      className="min-h-[119px] w-full resize-none bg-transparent px-5 py-[14px] text-[16px] font-medium leading-[28px] text-[#001726] placeholder:text-[#696969] focus:outline-none"
                    />
                  </span>
                </label>

                <button
                  type="submit"
                  className={`${workSans.className} inline-flex h-14 w-fit items-center gap-1 rounded-[12px] bg-[#3397F6] px-6 text-[16px] font-semibold leading-[11px] text-white transition hover:bg-[#2e8fec]`}
                >
                  Send Message
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
