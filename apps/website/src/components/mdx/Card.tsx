import Link from "next/link";
import type { ReactNode } from "react";

type CardProps = {
  title: string;
  href?: string;
  children: ReactNode;
};

export function Card({ title, href, children }: CardProps) {
  const content = (
    <div className="rounded-[14px] border border-[#001726]/10 bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition-transform hover:-translate-y-0.5">
      <h3 className="mb-2 text-[18px] font-semibold text-[#001726]">{title}</h3>
      <div className="text-[15px] leading-[24px] text-[#4B5563]">{children}</div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
