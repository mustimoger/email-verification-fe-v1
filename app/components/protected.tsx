"use client";

import Link from "next/link";
import { ReactNode } from "react";

import { useAuth } from "./auth-provider";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-sm font-semibold text-slate-700">
        Checking session...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Sign in required</h2>
        <p className="max-w-md text-sm font-semibold text-slate-700">
          Please sign in to view this page. Your session is needed to fetch your tasks, API keys, and account details.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/signin"
            className="rounded-lg bg-[#4880ff] px-4 py-2 text-sm font-bold text-white shadow hover:bg-[#3b6de0]"
          >
            Go to Sign In
          </Link>
          <Link href="/signup" className="text-sm font-bold text-[#5a8cff] underline hover:text-[#3b6de0]">
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
