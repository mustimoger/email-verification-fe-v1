import Link from "next/link";
import type { ReactNode } from "react";

const variants = {
  primary: "bg-[#3397F6] text-white hover:bg-[#2A86DD]",
  secondary: "bg-white text-[#001726] border border-[#001726]/10 hover:bg-[#F3F6FA]",
};

type ButtonProps = {
  href: string;
  variant?: keyof typeof variants;
  children: ReactNode;
};

export function Button({ href, variant = "primary", children }: ButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-[14px] font-semibold transition-colors ${variants[variant]}`}
    >
      {children}
    </Link>
  );
}
