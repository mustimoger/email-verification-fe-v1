"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Poppins, Roboto } from "next/font/google";

import { useAuth } from "../components/auth-provider";

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

export default function ResetPasswordPage() {
  const { updatePassword, session, loading: authLoading, signOut } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session && !resetComplete) {
      console.warn("auth.reset_password_missing_session");
      setError("Reset link is invalid or expired. Request a new email to continue.");
    }
  }, [authLoading, resetComplete, session]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || authLoading) return;
    if (!session) {
      setNotice(null);
      setError("Reset link is invalid or expired. Request a new email to continue.");
      return;
    }
    if (!password || !confirmPassword) {
      setNotice(null);
      setError("Enter and confirm your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setNotice(null);
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setNotice(null);
    setSaving(true);
    const { error: updateError } = await updatePassword({ password });
    if (updateError) {
      setError(updateError);
      setSaving(false);
      return;
    }
    const { error: signOutError } = await signOut();
    if (signOutError) {
      console.warn("auth.reset_password_signout_failed", { message: signOutError });
    }
    setNotice("Password updated successfully. Please sign in with your new password.");
    setResetComplete(true);
    setSaving(false);
    setPassword("");
    setConfirmPassword("");
  };

  const togglePasswordVisibility = () => {
    setShowPassword((current) => !current);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((current) => !current);
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
        </div>

        <div className={`${roboto.className} flex w-full flex-col justify-between px-6 py-8 sm:px-10 sm:py-12 lg:w-[456px]`}>
          <div className="flex flex-col gap-12">
            <div className="flex items-center justify-center">
              <Image src="/logo.png" alt="Boltroute" width={218} height={39} className="h-8 w-auto" priority />
            </div>

            <div className="flex flex-col gap-6">
              <h1 className={`${poppins.className} text-[20px] font-semibold leading-[28px] text-[#1a1a1a]`}>
                Reset your password
              </h1>

              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-2">
                  <span
                    className="text-[11px] leading-[12px] tracking-[0.3px] text-[#333]"
                    style={{ fontFamily: sfProFamily }}
                  >
                    New password
                  </span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter new password"
                      className="h-12 w-full rounded-[6px] border-[0.5px] border-[#e5e5e5] bg-[#f2f2f2] px-4 pr-12 text-[15px] text-[#1a1a1a] placeholder:text-[#808080] focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                      required
                      disabled={saving}
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

                <label className="flex flex-col gap-2">
                  <span
                    className="text-[11px] leading-[12px] tracking-[0.3px] text-[#333]"
                    style={{ fontFamily: sfProFamily }}
                  >
                    Confirm password
                  </span>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm new password"
                      className="h-12 w-full rounded-[6px] border-[0.5px] border-[#e5e5e5] bg-[#f2f2f2] px-4 pr-12 text-[15px] text-[#1a1a1a] placeholder:text-[#808080] focus:outline-none focus:ring-2 focus:ring-[#007aff]/20"
                      required
                      disabled={saving}
                    />
                    <button
                      type="button"
                      onClick={toggleConfirmPasswordVisibility}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <img src="/signin/eye.svg" alt="" width={16} height={16} aria-hidden="true" />
                    </button>
                  </div>
                </label>

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

                <button
                  type="submit"
                  disabled={saving || authLoading}
                  className="h-10 w-full rounded-[6px] bg-[#007aff] text-[15px] font-bold leading-[20px] tracking-[0.3px] text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Updating..." : "Update password"}
                </button>
              </form>
            </div>
          </div>

          <div
            className="mt-8 flex items-center justify-center gap-2 text-[12px] leading-[20px] tracking-[0.3px]"
            style={{ fontFamily: sfProFamily }}
          >
            <span className="text-[#1a1a1a]">Remembered your password?</span>
            <Link href="/signin" className="text-[#007aff]">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
