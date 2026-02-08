import { Work_Sans, Inter } from "next/font/google";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export function CoreFeaturesSection() {
  return (
    <section className={`${inter.className} bg-white pt-[120px] pb-[62px]`}>
      <div className="mx-auto flex max-w-[1176px] flex-col items-center px-5 text-center">
        <span className="inline-flex items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-[#001726]">
          Verification Results
        </span>
        <h2
          className={`${workSans.className} mt-[26px] max-w-[776px] text-[48px] font-semibold leading-[57.6px] tracking-[-0.03em] text-[#001726]`}
        >
          Know what you’re sending to—before you hit send
        </h2>
        <p className="mt-6 max-w-[776px] text-[18px] font-medium leading-[28px] text-[#696969]">
          Across real lists, verification typically uncovers a mix of deliverable, risky,
          and undeliverable addresses. BoltRoute helps you separate them fast
        </p>

        <div className="mt-[48px] grid w-full grid-cols-1 justify-center gap-[25px] md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 */}
          <div className="relative flex h-auto items-center justify-center rounded-[12px] bg-[#f6b169] bg-[url('/invalid-emails.png')] bg-cover bg-center p-[40px] text-center text-white lg:h-[517px]">
            <div className="absolute inset-0 rounded-[12px] bg-black/50" />
            <h5
              className={`${workSans.className} relative z-10 text-[28px] font-semibold leading-[32px] tracking-[-0.02em]`}
            >
              Invalid emails caught before they bounce
            </h5>
          </div>

          {/* Card 2 */}
          <div className="relative flex h-auto items-center justify-center rounded-[12px] bg-[#EFF2F5] bg-[url('/catch-all.svg')] bg-cover bg-center p-[40px] text-center text-white lg:h-[517px]">
            <div className="absolute inset-0 rounded-[12px] bg-black/50" />
            <h5
              className={`${workSans.className} relative z-10 text-[28px] font-semibold leading-[32px] tracking-[-0.02em]`}
            >
              Catch-alls flagged so you can route them safely
            </h5>
          </div>

          {/* Card 3 */}
          <div
            className="relative flex h-auto items-center justify-center rounded-[12px] bg-[#3397F6] bg-[url('/disposable.svg')] bg-cover bg-center p-[40px] text-center text-white lg:h-[517px]"
          >
            <div className="absolute inset-0 rounded-[12px] bg-black/50" />
            <h5
              className={`${workSans.className} relative z-10 text-[28px] font-semibold leading-[32px] tracking-[-0.02em]`}
            >
              Disposable & role-based detection for cleaner targeting
            </h5>
          </div>
        </div>
      </div>
    </section>
  );
}
