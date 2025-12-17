"use client";

import Link from "next/link";
import { ReactNode } from "react";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Shared layout for auth screens: blue organic background with centered card.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#4880ff] px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.12),transparent_35%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_80%,rgba(255,255,255,0.1),transparent_38%)]" />
      </div>

      <div className="relative w-full max-w-xl rounded-[24px] border border-slate-200/60 bg-white px-6 py-8 shadow-xl sm:px-10 sm:py-12">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-700/80">{subtitle}</p>
        </header>
        <div className="mt-8 flex flex-col gap-6 sm:mt-10">{children}</div>
        {footer ? <div className="mt-8 text-center text-sm font-semibold text-slate-700">{footer}</div> : null}
      </div>
    </div>
  );
}

export function FieldLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-800">
      <span>{children}</span>
      {action}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-bold text-[#5a8cff] underline underline-offset-2 hover:text-[#3b6de0]">
      {children}
    </Link>
  );
}
