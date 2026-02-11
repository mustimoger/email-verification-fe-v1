"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";

type ContactSuccessResponse = {
  requestId: string;
  status: "accepted";
  message: string;
};

type ContactErrorResponse = {
  requestId: string;
  error: string;
};

function extractErrorMessage(payload: unknown): { message: string; requestId: string | null } {
  if (payload && typeof payload === "object") {
    const record = payload as Partial<ContactErrorResponse>;
    if (typeof record.error === "string" && record.error.trim().length > 0) {
      return {
        message: record.error,
        requestId: typeof record.requestId === "string" ? record.requestId : null,
      };
    }
  }

  return {
    message: "Unable to submit contact request right now.",
    requestId: null,
  };
}

export function ContactForm(props: { buttonFontClassName?: string }) {
  const { buttonFontClassName } = props;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitDisabled = useMemo(() => {
    return (
      isLoading ||
      name.trim().length === 0 ||
      email.trim().length === 0 ||
      message.trim().length === 0
    );
  }, [email, isLoading, message, name]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
      hp: String(formData.get("hp") ?? "").trim(),
    };

    if (!payload.name) {
      setErrorMessage("A valid name is required.");
      setSuccessMessage(null);
      return;
    }
    if (!payload.email) {
      setErrorMessage("A valid email is required.");
      setSuccessMessage(null);
      return;
    }
    if (!payload.message) {
      setErrorMessage("A valid message is required.");
      setSuccessMessage(null);
      return;
    }

    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let responsePayload: unknown;
      try {
        responsePayload = await response.json();
      } catch {
        responsePayload = null;
      }

      if (!response.ok) {
        const extracted = extractErrorMessage(responsePayload);
        if (extracted.requestId) {
          // eslint-disable-next-line no-console
          console.warn("website.contact.submit_failed", { requestId: extracted.requestId });
        }
        throw new Error(extracted.message);
      }

      if (!responsePayload || typeof responsePayload !== "object") {
        throw new Error("Contact response is missing payload.");
      }

      const success = responsePayload as Partial<ContactSuccessResponse>;
      if (success.status !== "accepted" || typeof success.message !== "string") {
        throw new Error("Contact response is missing status.");
      }

      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setSuccessMessage(success.message);
      setErrorMessage(null);
    } catch (error) {
      const messageText =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to submit contact request right now.";
      setErrorMessage(messageText);
      setSuccessMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="relative mt-5 flex w-full flex-col gap-5" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <label className="flex flex-col text-[16px] font-medium leading-[28px] text-[#001726]">
          Name
          <span className="mt-2 h-14 overflow-hidden rounded-[8px] border border-[#DCE2E8] bg-[#EBF0F5]">
            <input
              type="text"
              name="name"
              required
              maxLength={120}
              autoComplete="name"
              value={name}
              disabled={isLoading}
              onChange={(event) => setName(event.target.value)}
              className="h-full w-full bg-transparent px-5 py-[14px] text-[16px] font-medium leading-[28px] text-[#001726] placeholder:text-[#696969] focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </span>
        </label>

        <label className="flex flex-col text-[16px] font-medium leading-[28px] text-[#001726]">
          Phone
          <span className="mt-2 h-14 overflow-hidden rounded-[8px] border border-[#DCE2E8] bg-[#EBF0F5]">
            <input
              type="tel"
              name="phone"
              maxLength={64}
              autoComplete="tel"
              value={phone}
              disabled={isLoading}
              onChange={(event) => setPhone(event.target.value)}
              className="h-full w-full bg-transparent px-5 py-[14px] text-[16px] font-medium leading-[28px] text-[#001726] placeholder:text-[#696969] focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
            />
          </span>
        </label>
      </div>

      <label className="flex flex-col text-[16px] font-medium leading-[28px] text-[#001726]">
        Email
        <span className="mt-2 h-14 overflow-hidden rounded-[8px] border border-[#DCE2E8] bg-[#EBF0F5]">
          <input
            type="email"
            name="email"
            required
            maxLength={320}
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="email"
            value={email}
            disabled={isLoading}
            onChange={(event) => setEmail(event.target.value)}
            className="h-full w-full bg-transparent px-5 py-[14px] text-[16px] font-medium leading-[28px] text-[#001726] placeholder:text-[#696969] focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
          />
        </span>
      </label>

      <label className="flex flex-col text-[16px] font-medium leading-[28px] text-[#001726]">
        Message
        <span className="mt-2 overflow-hidden rounded-[8px] border border-[#DCE2E8] bg-[#EBF0F5]">
          <textarea
            name="message"
            rows={4}
            required
            maxLength={4000}
            value={message}
            disabled={isLoading}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-[119px] w-full resize-none bg-transparent px-5 py-[14px] text-[16px] font-medium leading-[28px] text-[#001726] placeholder:text-[#696969] focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
          />
        </span>
      </label>

      <div className="sr-only" aria-hidden="true">
        <label>
          Leave this field empty
          <input type="text" name="hp" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className={`${buttonFontClassName ?? ""} inline-flex h-14 w-fit items-center gap-1 rounded-[12px] bg-[#3397F6] px-6 text-[16px] font-semibold leading-[11px] text-white transition hover:bg-[#2e8fec] disabled:cursor-not-allowed disabled:opacity-70`}
      >
        {isLoading ? "Sending..." : "Send Message"}
        <ArrowUpRight className="h-3 w-3" />
      </button>

      {successMessage ? (
        <p className="text-[14px] font-medium leading-[18px] text-emerald-700">{successMessage}</p>
      ) : null}

      {errorMessage ? (
        <p className="text-[14px] font-medium leading-[18px] text-[#b42318]">{errorMessage}</p>
      ) : null}
    </form>
  );
}
