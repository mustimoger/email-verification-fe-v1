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
      className={`rounded-2xl bg-[rgb(0_0_0_/_var(--auth-benefits-bg-opacity))] px-[calc(24px*var(--auth-benefits-scale))] py-[calc(24px*var(--auth-benefits-scale))] text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)]${
        className ? ` ${className}` : ""
      }`}
    >
      <ul className="flex flex-col gap-[calc(16px*var(--auth-benefits-scale))]">
        {BENEFITS.map(({ id, label, Icon }) => (
          <li key={id} className="flex items-center gap-[calc(12px*var(--auth-benefits-scale))]">
            <span className="flex h-[calc(24px*var(--auth-benefits-scale))] w-[calc(24px*var(--auth-benefits-scale))] items-center justify-center">
              <Icon
                weight="bold"
                className="h-[calc(20px*var(--auth-benefits-scale))] w-[calc(20px*var(--auth-benefits-scale))] text-white/85"
                aria-hidden="true"
              />
            </span>
            <span className="text-[calc(14px*var(--auth-benefits-scale))] leading-[calc(20px*var(--auth-benefits-scale))] text-white/95">
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
