"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthLayout, FieldLabel, TextLink } from "../components/auth-layout";
import { useAuth } from "../components/auth-provider";

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    router.push("/overview");
  };

  return (
    <AuthLayout
      title="Create an Account"
      subtitle="Create a account to continue"
      footer={
        <>
          Already have an account?{" "}
          <TextLink href="/signin">
            Login
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
          <FieldLabel>Username</FieldLabel>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="h-12 w-full rounded-lg border border-[#d8d8d8] bg-[#f1f4f9] px-4 text-slate-900 placeholder:text-[#a6a6a6] focus:border-[#4880ff] focus:outline-none focus:ring-2 focus:ring-[#4880ff]/30"
          />
        </div>

        <div>
          <FieldLabel
            action={
              <Link href="/signin" className="text-sm font-semibold text-slate-700/60 hover:text-slate-900">
                Forget Password?
              </Link>
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
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="h-5 w-5 rounded border border-[#a3a3a3] text-[#4880ff] focus:ring-[#4880ff]"
          />
          I accept terms and conditions
        </label>

        {error ? <div className="text-sm font-semibold text-rose-600">{error}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-lg bg-[#4880ff] text-[20px] font-bold text-white shadow-sm transition hover:bg-[#3b6de0] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing Up..." : "Sign Up"}
        </button>
      </form>
    </AuthLayout>
  );
}
