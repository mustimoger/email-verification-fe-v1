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
            className="h-12 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-strong)] px-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
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
            className="h-12 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-strong)] px-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        <div>
          <FieldLabel
            action={
              <Link
                href="/signin"
                className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
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
            className="h-12 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-strong)] px-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            required
          />
        </div>

        <label className="flex items-center gap-3 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="h-5 w-5 rounded border border-[var(--border-strong)] text-[var(--accent)] focus:ring-[var(--ring)]"
          />
          I accept terms and conditions
        </label>

        {error ? <div className="text-sm font-semibold text-rose-600">{error}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-lg bg-[var(--accent)] text-[20px] font-bold text-[var(--accent-contrast)] shadow-sm transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing Up..." : "Sign Up"}
        </button>
      </form>
    </AuthLayout>
  );
}
