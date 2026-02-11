"use client";

import { FormEvent, useMemo, useState } from "react";

import EmailVerificationPopup from "@/components/EmailVerificationPopup";
import { type PopupVerificationResult } from "@/lib/email-verification";

type VerificationRouteSuccess = {
  requestId: string;
  result: PopupVerificationResult;
};

type VerificationRouteError = {
  requestId: string;
  error: string;
};

function extractErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const record = payload as Partial<VerificationRouteError>;
    if (typeof record.error === "string" && record.error.trim().length > 0) {
      return record.error;
    }
  }
  return "Verification failed. Please try again.";
}

export function HeroVerificationForm() {
  const [email, setEmail] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PopupVerificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitDisabled = useMemo(
    () => isLoading || email.trim().length === 0,
    [email, isLoading],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const candidate = email.trim();
    if (candidate.length === 0) {
      return;
    }

    setIsPopupOpen(true);
    setIsLoading(true);
    setResult(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/email-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: candidate }),
      });

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(extractErrorMessage(payload));
      }

      if (!payload || typeof payload !== "object") {
        throw new Error("Verification service returned an empty response.");
      }

      const successPayload = payload as VerificationRouteSuccess;
      if (!successPayload.result) {
        throw new Error("Verification service response is missing result data.");
      }

      setResult(successPayload.result);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Verification failed. Please try again.";
      setErrorMessage(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form
        className="flex w-full flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={handleSubmit}
      >
        <input
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="email"
          placeholder="Enter email to validate"
          value={email}
          required
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading}
          className="h-[56px] w-full rounded-[14px] border border-[rgba(255,255,255,0.2)] bg-white px-4 text-[16px] font-medium text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.12)] outline-none placeholder:text-slate-400 focus:border-[#f9cf4a] focus:ring-2 focus:ring-[#f9cf4a]/40 disabled:cursor-not-allowed disabled:opacity-80"
        />
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="h-[56px] shrink-0 rounded-[14px] bg-[#ffa742] px-8 text-[16px] font-semibold text-[#6c6c6c] shadow-[0_12px_24px_rgba(255,167,66,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Verifying..." : "Verify"}
        </button>
      </form>

      <EmailVerificationPopup
        isOpen={isPopupOpen}
        onClose={() => {
          setIsPopupOpen(false);
          setResult(null);
          setErrorMessage(null);
        }}
        result={result}
        isLoading={isLoading}
        email={email.trim()}
        errorMessage={errorMessage}
      />
    </>
  );
}
