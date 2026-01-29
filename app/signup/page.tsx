"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { Poppins, Roboto } from "next/font/google";

import { useAuth } from "../components/auth-provider";
import { OAuthButtons } from "../components/oauth-buttons";
import { AuthBenefitsCard } from "../components/auth-benefits-card";
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

function SignUpContent() {
  const { signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => resolveNextPath(searchParams, "/overview"), [searchParams]);
  const nextQuery = useMemo(() => buildNextQuery(searchParams.get("next")), [searchParams]);
  const signinHref = nextQuery ? `/signin${nextQuery}` : "/signin";

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!acceptTerms) {
      setError("Please accept terms and conditions to continue.");
      return;
    }
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: signUpError } = await signUp({ email, password, username, displayName: username });
    if (signUpError) {
      setError(signUpError);
      setLoading(false);
      return;
    }
    router.push(nextPath);
  };

  const togglePasswordVisibility = () => {
    setShowPassword((current) => !current);
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="flex min-h-screen w-full flex-col bg-white lg:flex-row">
        <div className="relative min-h-[260px] w-full sm:min-h-[360px] lg:min-h-screen lg:flex-1">
          <Image
            src="/signin/hero.png"
            alt=""
            fill
            priority
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
              <Image src="/logo.png" alt="Boltroute" width={218} height={39} className="h-8 w-auto" priority />
            </div>

            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <h1
                className={`${poppins.className} text-[20px] font-semibold leading-[28px] text-[color:var(--text-primary)]`}
              >
                Create your account
              </h1>

              <div className="flex flex-col gap-5">
                <label className="flex flex-col gap-2">
                  <span
                    className="text-[11px] leading-[12px] tracking-[0.3px] text-[color:var(--text-secondary)]"
                    style={{ fontFamily: sfProFamily }}
                  >
                    Email address
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    className="auth-input h-12 w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-[15px] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span
                    className="text-[11px] leading-[12px] tracking-[0.3px] text-[color:var(--text-secondary)]"
                    style={{ fontFamily: sfProFamily }}
                  >
                    Username
                  </span>
                  <input
                    type="text"
                    name="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Username"
                    className="auth-input h-12 w-full rounded-[6px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-[15px] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
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

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-3 text-[12px] leading-[20px] tracking-[0.3px] text-[color:var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(event) => setAcceptTerms(event.target.checked)}
                      className="h-5 w-5 rounded border border-[#e5e5e5]"
                    />
                    <span style={{ fontFamily: sfProFamily }}>I accept terms and conditions</span>
                  </label>
                  <p
                    className="text-[11px] leading-[16px] tracking-[0.2px] text-[color:var(--text-muted)]"
                    style={{ fontFamily: sfProFamily }}
                  >
                    By using BoltRoute, you agree to our{" "}
                    <Link href="/privacy-policy" className="text-[#007aff]">
                      Privacy Policy
                    </Link>{" "}
                    and{" "}
                    <Link href="/terms-of-service" className="text-[#007aff]">
                      Terms of Service
                    </Link>
                    .
                  </p>
                </div>

                {error ? (
                  <div className="text-[12px] leading-[18px] text-[#ef4444]" style={{ fontFamily: sfProFamily }}>
                    {error}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-6">
              <button
                type="submit"
                disabled={loading}
                className="h-10 w-full rounded-[6px] bg-[#007aff] text-[15px] font-bold leading-[20px] tracking-[0.3px] text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing Up..." : "Sign up"}
              </button>

              <div className="h-[0.5px] w-full bg-[#e5e5e5]" />

                <div className="flex flex-col gap-4">
                  <OAuthButtons mode="signup" onError={setError} variant="v2" fontFamily={sfProFamily} />
                </div>
              </div>
            </form>
        </div>

        <div
            className="mt-8 flex items-center justify-center gap-2 text-[12px] leading-[20px] tracking-[0.3px]"
            style={{ fontFamily: sfProFamily }}
          >
            <span className="text-[color:var(--text-secondary)]">Already have an account?</span>
            <Link href={signinHref} className="text-[#007aff]">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SignUpV2Page() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-white" aria-label="Loading sign up" />}>
      <SignUpContent />
    </Suspense>
  );
}
