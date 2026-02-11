import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  normalizeVerificationResult,
  type ExternalVerificationResponse,
} from "@/lib/email-verification";

export const runtime = "nodejs";

type VerifyRequestBody = {
  email?: unknown;
};

type VerifyErrorBody = {
  error: string;
  requestId: string;
};

const VERIFY_PATH = "/api/v1/verify";
const REQUEST_TIMEOUT_MS = 15_000;

function getVerificationConfig(): { endpoint: URL; apiKey: string } | null {
  const baseUrl = process.env.BOLTROUTE_VERIFY_API_BASE_URL;
  const apiKey = process.env.BOLTROUTE_VERIFY_API_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  try {
    const endpoint = new URL(VERIFY_PATH, baseUrl);
    return { endpoint, apiKey };
  } catch {
    return null;
  }
}

function buildErrorResponse(message: string, requestId: string, statusCode: number) {
  return NextResponse.json<VerifyErrorBody>(
    {
      error: message,
      requestId,
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function resolveErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    const errorField = record.error;
    if (typeof errorField === "string" && errorField.trim().length > 0) {
      return errorField;
    }

    if (errorField && typeof errorField === "object") {
      const nested = errorField as Record<string, unknown>;
      const message = nested.message;
      if (typeof message === "string" && message.trim().length > 0) {
        return message;
      }
    }

    const messageField = record.message;
    if (typeof messageField === "string" && messageField.trim().length > 0) {
      return messageField;
    }
  }

  return fallback;
}

function sanitizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const email = value.trim();
  if (email.length === 0 || email.length > 320 || email.includes(" ")) {
    return null;
  }
  return email;
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const config = getVerificationConfig();

  if (!config) {
    console.error("website.email_verification.misconfigured", {
      requestId,
      hasBaseUrl: Boolean(process.env.BOLTROUTE_VERIFY_API_BASE_URL),
      hasApiKey: Boolean(process.env.BOLTROUTE_VERIFY_API_KEY),
    });
    return buildErrorResponse("Email verification service is not configured.", requestId, 500);
  }

  let requestBody: VerifyRequestBody;
  try {
    requestBody = (await request.json()) as VerifyRequestBody;
  } catch {
    return buildErrorResponse("Invalid JSON payload.", requestId, 400);
  }

  const email = sanitizeEmail(requestBody.email);
  if (!email) {
    return buildErrorResponse("A valid email is required.", requestId, 400);
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    console.error("website.email_verification.upstream_request_failed", {
      requestId,
      email,
      error: error instanceof Error ? error.message : String(error),
    });
    return buildErrorResponse("Unable to verify this email right now. Please try again.", requestId, 502);
  }

  let upstreamPayload: unknown;
  try {
    upstreamPayload = await upstreamResponse.json();
  } catch {
    return buildErrorResponse("Unexpected response from verification service.", requestId, 502);
  }

  if (!upstreamResponse.ok) {
    const fallbackMessage =
      upstreamResponse.status === 402
        ? "Insufficient credits to complete verification."
        : upstreamResponse.status === 429
          ? "Too many requests. Please wait and try again."
          : "Verification request failed.";

    const message = resolveErrorMessage(upstreamPayload, fallbackMessage);

    console.warn("website.email_verification.upstream_error", {
      requestId,
      email,
      statusCode: upstreamResponse.status,
      message,
    });

    return buildErrorResponse(message, requestId, upstreamResponse.status);
  }

  const normalizedResult = normalizeVerificationResult(
    upstreamPayload as ExternalVerificationResponse,
    email,
  );

  return NextResponse.json(
    {
      requestId,
      result: normalizedResult,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
