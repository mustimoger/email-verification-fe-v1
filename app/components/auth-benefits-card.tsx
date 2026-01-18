import type { ComponentType } from "react";

import {
  ChartLineUp,
  ChatCircleDots,
  Plug,
  ShieldCheck,
  Stack,
  TerminalWindow,
} from "@phosphor-icons/react";

type BenefitItem = {
  id: string;
  label: string;
  Icon: ComponentType<{ size?: number; className?: string; weight?: "regular" | "fill" | "bold" }>;
};

const BENEFITS: BenefitItem[] = [
  { id: "reputation", label: "Protect Your Sender Reputation", Icon: ShieldCheck },
  { id: "bulk", label: "Bulk,Manual,Real-Time Email Verification", Icon: Stack },
  { id: "workflows", label: "Workflow Integrations", Icon: Plug },
  { id: "scale", label: "High-Volume API Built for Scale", Icon: TerminalWindow },
  { id: "support", label: "24/7 Email & Chat Support", Icon: ChatCircleDots },
  { id: "analytics", label: "Deliverability Analytics Dashboard", Icon: ChartLineUp },
];

type AuthBenefitsCardProps = {
  className?: string;
};

export function AuthBenefitsCard({ className }: AuthBenefitsCardProps) {
  return (
    <div
      className={`rounded-2xl bg-black/35 px-6 py-6 text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)]${
        className ? ` ${className}` : ""
      }`}
    >
      <ul className="flex flex-col gap-4">
        {BENEFITS.map(({ id, label, Icon }) => (
          <li key={id} className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center">
              <Icon size={20} weight="bold" className="text-white/85" aria-hidden="true" />
            </span>
            <span className="text-[14px] leading-[20px] text-white/95">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
