"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { Poppins, Roboto } from "next/font/google";

import { useAuth } from "../components/auth-provider";
import { readEmailConfirmationNotice } from "../lib/auth-notices";
import { clearRememberedEmail, readRememberedEmail, setRememberedEmail } from "../lib/auth-remember";
import { OAuthButtons } from "../components/oauth-buttons";
import { AuthBenefitsCard } from "../components/auth-benefits-card";
import { useTheme } from "../components/theme-provider";
import { buildNextQuery, resolveNextPath } from "../lib/redirect-utils";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const sfProFamily =
  "SF Pro Display, SF Pro Text, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function SignInContent() {
  const { signIn, requestPasswordReset } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => resolveNextPath(searchParams, "/overview"), [searchParams]);
  const nextQuery = useMemo(() => buildNextQuery(searchParams.get("next")), [searchParams]);
  const signupHref = nextQuery ? `/signup${nextQuery}` : "/signup";
  const [hasMounted, setHasMounted] = useState(false);
  const logoSrc = hasMounted && resolvedTheme === "dark" ? "/logo-white.svg" : "/logo.png";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const notice = readEmailConfirmationNotice();
    if (notice) {
      setError(notice);
    }
  }, []);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const rememberedEmail = readRememberedEmail();
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRemember(true);
    }
  }, []);

  const handleForgotPassword = async () => {
    if (resetLoading) return;
    if (!email) {
      setNotice(null);
      setError("Enter your email address to reset your password.");
      return;
    }
    setError(null);
    setNotice(null);
    setResetLoading(true);
    const { error: resetError } = await requestPasswordReset({ email });
    if (resetError) {
      setError(resetError);
      setResetLoading(false);
      return;
    }
    setNotice("Password reset email sent. Check your inbox for the next steps.");
    setResetLoading(false);
  };

  const handleRememberChange = (checked: boolean) => {
    setRemember(checked);
    if (!checked) {
      clearRememberedEmail();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((current) => !current);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (resetLoading) return;
    if (!email || !password) {
      setNotice(null);
      setError("Email and password are required.");
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);
    const { error: signInError } = await signIn({ email, password });
    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }
    if (!remember) {
      clearRememberedEmail();
      console.info("auth.remember_disabled");
    } else {
      setRememberedEmail(email);
    }
    router.push(nextPath);
  };

  return (
    <main className="min-h-screen bg-white">
        <div className="flex min-h-screen w-full flex-col bg-white lg:flex-row">
        <div className="relative hidden min-h-[260px] w-full sm:min-h-[360px] lg:flex lg:min-h-screen lg:flex-1">
          <Image
            src="/background.jpg"
            alt=""
            fill
            priority
            quality={100}
            unoptimized
            className="object-cover"
            sizes="(min-width: 1024px) 65vw, 100vw"
          />
          <div className="absolute inset-0 hidden items-center justify-center px-6 py-8 lg:flex">
            <AuthBenefitsCard className="w-full max-w-[calc(360px*var(--auth-benefits-scale))]" />
          </div>
        </div>

        <div className={`${roboto.className} flex w-full flex-col justify-between px-6 py-8 sm:px-10 sm:py-12 lg:w-[456px]`}>
          <div className="flex flex-col gap-12">
            <div className="flex items-center justify-center">
              <Image src={logoSrc} alt="Boltroute" width={218} height={39} className="h-8 w-auto" priority />
            </div>

            <div className="flex flex-col gap-6">
              <h1
                className={`${poppins.className} text-[20px] font-semibold leading-[28px] text-[color:var(--text-primary)]`}
              >
                Nice to see you again
              </h1>

              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-2">
                  <span
                    className="text-[11px] leading-[12px] tracking-[0.3px] text-[color:var(--text-secondary)]"
                    style={{ fontFamily: sfProFamily }}
                  >
                    Login
                  </span>
                  <input
                    type="email"
                    name="login"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email or phone number"
                    className="auth-input h-12 w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-[15px] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span
                    className="text-[11px] leading-[12px] tracking-[0.3px] text-[color:var(--text-secondary)]"
                    style={{ fontFamily: sfProFamily }}
                  >
                    Password
                  </span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                      className="auth-input h-12 w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 pr-12 text-[15px] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <img src="/signin/eye.svg" alt="" width={16} height={16} aria-hidden="true" />
                    </button>
                  </div>
                </label>

                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 text-[12px] leading-[20px] tracking-[0.3px] text-[color:var(--text-secondary)]">
                    <span className="relative inline-flex h-5 w-10 items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={remember}
                        onChange={(event) => handleRememberChange(event.target.checked)}
                      />
                      <span className="absolute inset-0 rounded-full border-[0.5px] border-[var(--border)] bg-[var(--surface-strong)] transition-colors peer-checked:border-[var(--accent)] peer-checked:bg-[var(--accent)]" />
                      <span className="absolute left-[2px] top-[2px] h-4 w-4 rounded-full bg-[var(--surface-elevated)] shadow-[1px_1px_2px_rgba(51,51,51,0.3)] transition peer-checked:translate-x-5 peer-checked:bg-[var(--accent-contrast)]" />
                    </span>
                    <span style={{ fontFamily: sfProFamily }}>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="text-[12px] leading-[20px] tracking-[0.3px] text-[#007aff]"
                    style={{ fontFamily: sfProFamily }}
                  >
                    {resetLoading ? "Sending..." : "Forgot password?"}
                  </button>
                </div>

                {notice ? (
                  <div className="text-[12px] leading-[18px] text-[#16a34a]" style={{ fontFamily: sfProFamily }}>
                    {notice}
                  </div>
                ) : null}

                {error ? (
                  <div className="text-[12px] leading-[18px] text-[#ef4444]" style={{ fontFamily: sfProFamily }}>
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-col gap-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-10 w-full rounded-[6px] bg-[#007aff] text-[15px] font-bold leading-[20px] tracking-[0.3px] text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Signing In..." : "Sign in"}
                  </button>

                  <div className="h-[0.5px] w-full bg-[#e5e5e5]" />

                  <div className="flex flex-col gap-4">
                    <OAuthButtons mode="signin" onError={setError} variant="v2" fontFamily={sfProFamily} />
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div
            className="mt-8 flex items-center justify-center gap-2 text-[12px] leading-[20px] tracking-[0.3px]"
            style={{ fontFamily: sfProFamily }}
          >
            <span className="text-[color:var(--text-secondary)]">Dont have an account?</span>
            <Link href={signupHref} className="text-[#007aff]">
              Sign up now
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SignInV2Page() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-white" aria-label="Loading sign in" />}>
      <SignInContent />
    </Suspense>
  );
}
