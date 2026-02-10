"use client";

import { FormEvent, useMemo, useState } from "react";

type SubscribeSuccess = {
  requestId: string;
  status: "subscribed";
};

type SubscribeError = {
  requestId: string;
  error: string;
};

function extractErrorMessage(payload: unknown): { message: string; requestId: string | null } {
  if (payload && typeof payload === "object") {
    const record = payload as Partial<SubscribeError>;
    if (typeof record.error === "string" && record.error.trim().length > 0) {
      return {
        message: record.error,
        requestId: typeof record.requestId === "string" ? record.requestId : null,
      };
    }
  }

  return { message: "Subscription failed. Please try again.", requestId: null };
}

export function NewsletterSignupForm(props: { buttonFontClassName?: string }) {
  const { buttonFontClassName } = props;

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitDisabled = useMemo(
    () => isLoading || email.trim().length === 0,
    [email, isLoading],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    const candidate = String(formData.get("email") ?? "").trim();
    if (candidate.length === 0) {
      setErrorMessage("A valid email is required.");
      setSuccessMessage(null);
      return;
    }

    const hp = String(formData.get("hp") ?? "").trim();

    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: candidate, hp }),
      });

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const extracted = extractErrorMessage(payload);
        if (extracted.requestId) {
          // eslint-disable-next-line no-console
          console.warn("newsletter_subscribe_failed", { requestId: extracted.requestId });
        }
        throw new Error(extracted.message);
      }

      if (!payload || typeof payload !== "object") {
        throw new Error("Subscription returned an empty response.");
      }

      const successPayload = payload as SubscribeSuccess;
      if (successPayload.status !== "subscribed") {
        throw new Error("Subscription response is missing status.");
      }

      setEmail("");
      setSuccessMessage("Subscribed. Thank you.");
      setErrorMessage(null);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Subscription failed. Please try again.";
      setErrorMessage(message);
      setSuccessMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="relative" onSubmit={handleSubmit}>
      <div className="h-[47px] rounded-[10px] bg-[#f6f6f6] lg:h-[58px]">
        <input
          type="email"
          name="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="email"
          placeholder="Email Address"
          value={email}
          required
          disabled={isLoading}
          onChange={(event) => setEmail(event.target.value)}
          className="h-full w-full bg-transparent px-[14px] py-[14px] text-[16px] font-medium leading-[19.2px] text-[#001726] placeholder:text-[#696969] focus:outline-none disabled:cursor-not-allowed disabled:opacity-80 lg:py-[19.5px] lg:pl-6 lg:pr-[8.5px]"
        />
      </div>

      {/* Honeypot to deter basic bots. Human users should never fill this. */}
      <div className="sr-only" aria-hidden="true">
        <label>
          Leave this field empty
          <input type="text" name="hp" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className={`${buttonFontClassName ?? ""} mt-3 flex h-[47px] w-full items-center justify-center rounded-[10px] bg-[#3397F6] text-[16px] font-semibold leading-[19.2px] text-white transition disabled:cursor-not-allowed disabled:opacity-70 lg:absolute lg:right-[10px] lg:top-1/2 lg:mt-0 lg:h-[41px] lg:w-[118px] lg:-translate-y-1/2`}
      >
        {isLoading ? "Subscribing..." : "Subscribe"}
      </button>

      {successMessage ? (
        <p className="mt-3 text-[14px] font-medium leading-[18px] text-emerald-200">
          {successMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-3 text-[14px] font-medium leading-[18px] text-red-200">{errorMessage}</p>
      ) : null}
    </form>
  );
}

