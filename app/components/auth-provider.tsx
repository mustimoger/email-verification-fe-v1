"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, apiClient } from "../lib/api-client";
import { setEmailConfirmationNotice } from "../lib/auth-notices";
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
  const profileSyncRef = useRef<{ userId: string; email: string } | null>(null);
  const confirmationCheckRef = useRef<string | null>(null);

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
        console.warn("auth.bootstrap_dashboard_key.failed", err);
      }
    };
    void bootstrap();
  }, [session]);

  useEffect(() => {
    const ensureConfirmed = async () => {
      const userId = session?.user?.id;
      if (!userId) {
        confirmationCheckRef.current = null;
        return;
      }
      if (confirmationCheckRef.current === userId) {
        return;
      }
      confirmationCheckRef.current = userId;
      try {
        await apiClient.requireConfirmedEmail();
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setEmailConfirmationNotice(err.message);
          await supabase.auth.signOut();
          console.info("auth.email_unconfirmed_signout", { userId });
          return;
        }
        console.warn("auth.email_confirmation_check_failed", err);
      }
    };
    void ensureConfirmed();
  }, [session, supabase]);

  useEffect(() => {
    if (!session?.user?.email) {
      profileSyncRef.current = null;
      return;
    }
    const userId = session.user.id;
    const email = session.user.email;
    if (profileSyncRef.current?.userId === userId && profileSyncRef.current.email === email) {
      return;
    }
    const syncProfileEmail = async () => {
      try {
        await apiClient.updateProfile({ email });
        profileSyncRef.current = { userId, email };
        console.info("auth.profile_email_synced", { userId });
      } catch (err) {
        console.warn("auth.profile_email_sync_failed", err);
      }
    };
    void syncProfileEmail();
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
        try {
          await apiClient.requireConfirmedEmail();
        } catch (err) {
          const message =
            err instanceof ApiError && err.status === 403
              ? err.message
              : "Unable to verify your email confirmation status.";
          await supabase.auth.signOut();
          console.warn("auth.sign_in_unconfirmed", { message });
          return { error: message };
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
        try {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.warn("auth.signup_bonus.session_lookup_failed", { message: sessionError.message });
          } else if (!data.session) {
            console.info("auth.signup_bonus.skipped_no_session");
          } else {
            const bonus = await apiClient.claimSignupBonus();
            console.info("auth.signup_bonus.result", {
              status: bonus.status,
              creditsGranted: bonus.credits_granted ?? null,
            });
          }
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Signup bonus request failed";
          console.warn("auth.signup_bonus.failed", { message });
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
