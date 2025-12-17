"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "../lib/api-client";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "../lib/supabase-browser";

type AuthContextValue = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (params: { email: string; password: string }) => Promise<{ error: string | null }>;
  signUp: (params: { email: string; password: string; username?: string; displayName?: string }) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const bootstrapAttemptedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (mounted) {
        if (error) {
          console.error("auth.load_session_failed", error);
        }
        setSession(data.session ?? null);
        setLoading(false);
      }
    };
    void init();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const bootstrap = async () => {
      if (!session || bootstrapAttemptedRef.current) return;
      bootstrapAttemptedRef.current = true;
      try {
        await apiClient.bootstrapDashboardKey();
        console.info("auth.bootstrap_dashboard_key.ok");
      } catch (err) {
        console.error("auth.bootstrap_dashboard_key.failed", err);
      }
    };
    void bootstrap();
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      supabase,
      session,
      user: session?.user ?? null,
      loading,
      signIn: async ({ email, password }) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("auth.sign_in_failed", { message: error.message });
          return { error: error.message };
        }
        return { error: null };
      },
      signUp: async ({ email, password, username, displayName }) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/overview`,
            data: {
              username,
              display_name: displayName,
            },
          },
        });
        if (error) {
          console.error("auth.sign_up_failed", { message: error.message });
          return { error: error.message };
        }
        return { error: null };
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("auth.sign_out_failed", { message: error.message });
          return { error: error.message };
        }
        return { error: null };
      },
    }),
    [supabase, session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
