import type { ReactNode } from "react";

const variantStyles = {
  info: "border-[#3397F6]/30 bg-[#3397F6]/10 text-[#001726]",
  warn: "border-[#FF8A00]/30 bg-[#FF8A00]/10 text-[#1A1400]",
  success: "border-[#19C37D]/30 bg-[#19C37D]/10 text-[#001726]",
};

type CalloutProps = {
  variant?: keyof typeof variantStyles;
  title?: string;
  children: ReactNode;
};

export function Callout({ variant = "info", title, children }: CalloutProps) {
  return (
    <div className={`rounded-[12px] border px-4 py-3 ${variantStyles[variant]}`}>
      {title ? <p className="mb-1 text-[14px] font-semibold uppercase">{title}</p> : null}
      <div className="text-[16px] leading-[26px]">{children}</div>
    </div>
  );
}
