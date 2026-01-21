"use client";

import type { Provider, SupabaseClient } from "@supabase/supabase-js";

export type OAuthMode = "signin" | "signup";

const PROVIDER_ENV = process.env.NEXT_PUBLIC_OAUTH_PROVIDERS;
const REDIRECT_URL_ENV = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URL;

let loggedMissingProviders = false;
let loggedUnknownProviders = false;
let loggedMissingIcons = false;

const PROVIDER_ICON_MAP: Record<string, string> = {
  google: "/signin/google.svg",
};

export function parseOAuthProviders(value?: string | null): string[] {
  if (!value) return [];
  const raw = value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(raw));
}

export function getEnabledOAuthProviders(): string[] {
  const providers = parseOAuthProviders(PROVIDER_ENV);
  if (!providers.length && !loggedMissingProviders) {
    loggedMissingProviders = true;
    // eslint-disable-next-line no-console
    console.info("auth.oauth.providers_missing", { env: "NEXT_PUBLIC_OAUTH_PROVIDERS" });
  }
  return providers;
}

export function getOAuthRedirectUrl(): string | undefined {
  if (REDIRECT_URL_ENV && REDIRECT_URL_ENV.trim()) {
    return REDIRECT_URL_ENV.trim();
  }
  return undefined;
}

export function getOAuthProviderLabel(provider: string, _mode: OAuthMode): string | null {
  const normalized = provider.toLowerCase();
  switch (normalized) {
    case "google":
      return _mode === "signup" ? "Sign up with Google" : "Sign in with Google";
    default:
      if (!loggedUnknownProviders) {
        loggedUnknownProviders = true;
        // eslint-disable-next-line no-console
        console.warn("auth.oauth.unknown_provider", { provider: normalized });
      }
      return null;
  }
}

export function getOAuthProviderIcon(provider: string): string | null {
  const normalized = provider.toLowerCase();
  const icon = PROVIDER_ICON_MAP[normalized];
  if (!icon) {
    if (!loggedMissingIcons) {
      loggedMissingIcons = true;
      // eslint-disable-next-line no-console
      console.warn("auth.oauth.icon_missing", { provider: normalized });
    }
    return null;
  }
  return icon;
}

export async function runOAuthSignIn(params: {
  supabase: SupabaseClient;
  provider: Provider;
  redirectUrl?: string;
}): Promise<{ error: string | null }> {
  const { supabase, provider, redirectUrl } = params;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: redirectUrl ? { redirectTo: redirectUrl } : undefined,
  });
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}
