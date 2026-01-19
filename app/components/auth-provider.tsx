"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, apiClient } from "../lib/api-client";
import { setEmailConfirmationNotice } from "../lib/auth-notices";
import type { Provider, Session, SupabaseClient, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import { getOAuthRedirectUrl, runOAuthSignIn } from "../lib/oauth-providers";

type AuthContextValue = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (params: { email: string; password: string }) => Promise<{ error: string | null }>;
  signUp: (params: { email: string; password: string; username?: string; displayName?: string }) => Promise<{ error: string | null }>;
  requestPasswordReset: (params: { email: string; redirectTo?: string }) => Promise<{ error: string | null }>;
  updatePassword: (params: { password: string }) => Promise<{ error: string | null }>;
  signInWithOAuth: (provider: Provider) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const profileSyncRef = useRef<{ userId: string; email: string } | null>(null);
  const confirmationCheckRef = useRef<string | null>(null);
  const signupBonusAttemptedRef = useRef<string | null>(null);
  const trialBonusAttemptedRef = useRef<string | null>(null);
  const recoverySessionRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const searchParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
      const flowType = hashParams.get("type") ?? searchParams.get("type");
      if (flowType === "recovery") {
        recoverySessionRef.current = true;
      }
    }
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

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "PASSWORD_RECOVERY") {
        recoverySessionRef.current = true;
      }
      if (event === "SIGNED_OUT") {
        recoverySessionRef.current = false;
      }
    });

    return () => {
      mounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const ensureConfirmed = async () => {
      const userId = session?.user?.id;
      if (!userId) {
        confirmationCheckRef.current = null;
        signupBonusAttemptedRef.current = null;
        trialBonusAttemptedRef.current = null;
        return;
      }
      if (recoverySessionRef.current) {
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
        return;
      }
      if (signupBonusAttemptedRef.current === userId && trialBonusAttemptedRef.current === userId) {
        return;
      }
      if (signupBonusAttemptedRef.current !== userId) {
        try {
          const bonus = await apiClient.claimSignupBonus();
          signupBonusAttemptedRef.current = userId;
          console.info("auth.signup_bonus.result", {
            status: bonus.status,
            creditsGranted: bonus.credits_granted ?? null,
            source: "confirmed_session",
          });
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Signup bonus request failed";
          console.warn("auth.signup_bonus.failed", { message, source: "confirmed_session" });
        }
      }
      if (trialBonusAttemptedRef.current !== userId) {
        try {
          const bonus = await apiClient.claimTrialBonus();
          trialBonusAttemptedRef.current = userId;
          console.info("auth.trial_bonus.result", {
            status: bonus.status,
            creditsGranted: bonus.credits_granted ?? null,
            source: "confirmed_session",
          });
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Free trial request failed";
          console.warn("auth.trial_bonus.failed", { message, source: "confirmed_session" });
        }
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
        return { error: null };
      },
      requestPasswordReset: async ({ email, redirectTo }) => {
        const resolvedRedirect =
          redirectTo ?? `${typeof window !== "undefined" ? window.location.origin : ""}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: resolvedRedirect,
        });
        if (error) {
          console.error("auth.password_reset_failed", { message: error.message });
          return { error: error.message };
        }
        return { error: null };
      },
      updatePassword: async ({ password }) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          console.error("auth.password_update_failed", { message: error.message });
          return { error: error.message };
        }
        return { error: null };
      },
      signInWithOAuth: async (provider) => {
        const redirectTo = getOAuthRedirectUrl();
        const { error } = await runOAuthSignIn({ supabase, provider, redirectUrl: redirectTo });
        if (error) {
          console.error("auth.oauth_sign_in_failed", { message: error, provider });
          return { error };
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
