"use client";

import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { useAuth } from "./auth-provider";
import { resolveAuthState } from "./auth-guard-utils";

export function RequireAuth({ children, redirectTo = "/signin" }: { children: ReactNode; redirectTo?: string }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const state = resolveAuthState({ loading, hasSession: Boolean(session) });

  useEffect(() => {
    if (state === "unauthenticated") {
      console.info("auth.redirect_no_session", { redirectTo });
      router.replace(redirectTo);
    }
  }, [state, redirectTo, router]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-700">
        Checking session...
      </div>
    );
  }

  if (state === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}
