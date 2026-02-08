"use client";

import { useMemo, useState } from "react";
import { Work_Sans, Inter } from "next/font/google";
import { ArrowRightCircle } from "lucide-react";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export function FaqSection() {
  const faqs = useMemo(
    () => [
      {
        question: "Do credits expire?",
        answer:
          "Never. Credits remain valid indefinitely until used.",
      },
      {
        question: "What happens if an email can't be verified?",
        answer:
          "You're not charged for unknown results; credits are only deducted for definitive valid or invalid results.",
      },
      {
        question: "How accurate is the email verification?",
        answer:
          "99%+ accuracy using multiple verification layers including syntax, domain, SMTP, and catch-all checks.",
      },
      {
        question: "What do valid, invalid, and unknown mean?",
        answer:
          "Valid = exists and can receive mail; Invalid = doesn't exist; Unknown = couldn't verify due to server restrictions (not charged).",
      },
      {
        question: "How fast is the verification process?",
        answer:
          "Single verifications complete in 2-5 seconds; bulk processed at 10,000-50,000 emails/hour.",
      },
      {
        question: "Can I verify emails in bulk?",
        answer:
          "Yes - upload CSV/XLSX files with up to 1 million emails and get automated results.",
      },
      {
        question: "Is there an API available?",
        answer:
          "Yes, comprehensive REST API with full documentation.",
      },
      {
        question: "Do you offer a free trial?",
        answer:
          "Yes, new accounts get free credits to test the service with no credit card required.",
      },
      {
        question: "Can I verify role-based emails (e.g., info@)?",
        answer:
          "Yes - role-based emails are verified and flagged for segmentation.",
      },
      {
        question: "Do you verify disposable or temporary emails?",
        answer:
          "Yes - disposable/temporary emails are detected and flagged.",
      },
    ],
    []
  );

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const leftColumn = faqs.filter((_, index) => index % 2 === 0);
  const rightColumn = faqs.filter((_, index) => index % 2 === 1);

  return (
    <section
      className={`${inter.className} bg-white pt-[62px] pb-[60px] lg:pt-[62px] lg:pb-[120px]`}
    >
      <div className="mx-auto w-full max-w-[1176px] px-5">
        <div className="mx-auto flex w-full max-w-[480px] flex-col items-start text-left lg:max-w-[775px] lg:items-center lg:text-center">
          <span className="inline-flex items-center rounded-[8px] border border-[rgba(51,151,246,0.3)] bg-[rgba(51,151,246,0.2)] px-[15px] py-[10px] text-[14px] font-medium leading-[16.8px] text-[#001726]">
            FAQs
          </span>
          <h2
            className={`${workSans.className} mt-4 text-[36px] font-semibold leading-[43.2px] tracking-[-0.03em] text-[#001726] lg:text-[48px] lg:leading-[57.6px]`}
          >
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mx-auto mt-12 w-full max-w-[480px] lg:max-w-none">
          <div className="grid grid-cols-1 gap-[15px] lg:grid-cols-2 lg:gap-6">
            {[leftColumn, rightColumn].map((column, columnIndex) => (
              <div key={`faq-col-${columnIndex}`} className="flex flex-col gap-[15px]">
                {column.map((item, index) => {
                  const itemIndex =
                    columnIndex === 0 ? index : index + leftColumn.length;
                  const isOpen = itemIndex === openIndex;
                  return (
                    <div
                      key={item.question}
                      className={`flex flex-col gap-[15px] rounded-[10px] bg-[#EFF2F5] px-[24px] pr-[39px] transition-colors hover:bg-[#E8EDF2] ${
                        isOpen ? "pt-[31px] pb-[32px]" : "py-[22px]"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-[15px] text-left"
                        onClick={() => setOpenIndex(isOpen ? null : itemIndex)}
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${itemIndex}`}
                      >
                        {/* Icon: ArrowRightCircle is the closest match to the outlined arrow-circle in the reference. */}
                        <ArrowRightCircle
                          className="h-5 w-5 text-[#001726]"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <p className="text-[18px] font-semibold leading-[21.6px] text-[#001726]">
                          {item.question}
                        </p>
                      </button>
                      {isOpen ? (
                        <p
                          id={`faq-answer-${itemIndex}`}
                          className="text-[16px] font-medium leading-[28px] text-[#696969]"
                        >
                          {item.answer}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
