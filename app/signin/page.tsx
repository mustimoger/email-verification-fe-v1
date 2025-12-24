"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { AuthLayout, FieldLabel, TextLink } from "../components/auth-layout";
import { useAuth } from "../components/auth-provider";
import { readEmailConfirmationNotice } from "../lib/auth-notices";

export default function SigninPage() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const notice = readEmailConfirmationNotice();
    if (notice) {
      setError(notice);
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn({ email, password });
    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }
    // Supabase persists session by default; remember toggle is informational for now.
    if (!remember) {
      console.info("auth.remember_disabled");
    }
    router.push("/overview");
  };

  return (
    <AuthLayout
      title="Login to Account"
      subtitle="Please enter your email and password to continue"
      footer={
        <>
          Don’t have an account?{" "}
          <TextLink href="/signup">
            Create Account
          </TextLink>
        </>
      }
    >
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div>
          <FieldLabel>Email address:</FieldLabel>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="esteban_schiller@gmail.com"
            className="h-12 w-full rounded-lg border border-[#d8d8d8] bg-[#f1f4f9] px-4 text-slate-900 placeholder:text-[#a6a6a6] focus:border-[#4880ff] focus:outline-none focus:ring-2 focus:ring-[#4880ff]/30"
            required
          />
        </div>

        <div>
          <FieldLabel
            action={
              <button type="button" className="text-sm font-semibold text-slate-700/60 hover:text-slate-900">
                Forget Password?
              </button>
            }
          >
            Password
          </FieldLabel>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="•••••••••"
            className="h-12 w-full rounded-lg border border-[#d8d8d8] bg-[#f1f4f9] px-4 text-slate-900 placeholder:text-[#a6a6a6] focus:border-[#4880ff] focus:outline-none focus:ring-2 focus:ring-[#4880ff]/30"
            required
          />
        </div>

        <label className="flex items-center gap-3 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-5 w-5 rounded border border-[#a3a3a3] text-[#4880ff] focus:ring-[#4880ff]"
          />
          Remember Password
        </label>

        {error ? <div className="text-sm font-semibold text-rose-600">{error}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-lg bg-[#4880ff] text-[20px] font-bold text-white shadow-sm transition hover:bg-[#3b6de0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>
    </AuthLayout>
  );
}
