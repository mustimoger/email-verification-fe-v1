import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { addSubscriber, getAcumbamailConfig } from "@/lib/newsletter/acumbamail";

export const runtime = "nodejs";

type SubscribeRequestBody = {
  email?: unknown;
  hp?: unknown;
};

type SubscribeSuccessBody = {
  requestId: string;
  status: "subscribed";
};

type SubscribeErrorBody = {
  requestId: string;
  error: string;
};

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

type RateLimitEntry = {
  windowStartMs: number;
  count: number;
};

const rateLimitBuckets = new Map<string, RateLimitEntry>();

function getRateLimitConfig(): RateLimitConfig | null {
  const windowSecondsRaw = process.env.NEWSLETTER_RATE_LIMIT_WINDOW_SECONDS;
  const maxRequestsRaw = process.env.NEWSLETTER_RATE_LIMIT_MAX_PER_WINDOW;

  if (!windowSecondsRaw || !maxRequestsRaw) {
    return null;
  }

  const windowSeconds = Number.parseInt(windowSecondsRaw, 10);
  const maxRequests = Number.parseInt(maxRequestsRaw, 10);

  if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) {
    return null;
  }

  if (!Number.isFinite(maxRequests) || maxRequests <= 0) {
    return null;
  }

  return {
    windowMs: windowSeconds * 1000,
    maxRequests,
  };
}

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const parts = forwardedFor
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (parts.length > 0) {
    return parts[0] ?? null;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }

  return null;
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

function sanitizeHoneypot(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function buildErrorResponse(message: string, requestId: string, statusCode: number) {
  return NextResponse.json<SubscribeErrorBody>(
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

function buildSuccessResponse(requestId: string) {
  return NextResponse.json<SubscribeSuccessBody>(
    {
      requestId,
      status: "subscribed",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function applyRateLimit(request: NextRequest, requestId: string): NextResponse | null {
  const config = getRateLimitConfig();
  if (!config) {
    return null;
  }

  const ip = getClientIp(request);
  if (!ip) {
    console.warn("website.newsletter.rate_limit.missing_ip", { requestId });
    return null;
  }

  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip);

  if (!bucket || now - bucket.windowStartMs >= config.windowMs) {
    rateLimitBuckets.set(ip, { windowStartMs: now, count: 1 });
    return null;
  }

  bucket.count += 1;

  if (bucket.count <= config.maxRequests) {
    return null;
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((config.windowMs - (now - bucket.windowStartMs)) / 1000),
  );

  return NextResponse.json<SubscribeErrorBody>(
    {
      requestId,
      error: "Too many requests. Please wait and try again.",
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();

  const rateLimitResponse = applyRateLimit(request, requestId);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const config = getAcumbamailConfig();
  if (!config) {
    console.error("website.newsletter.misconfigured", {
      requestId,
      hasBaseUrl: Boolean(process.env.ACUMBAMAIL_API_BASE_URL),
      hasAuthToken: Boolean(process.env.ACUMBAMAIL_AUTH_TOKEN),
      hasListId: Boolean(process.env.ACUMBAMAIL_LIST_ID),
    });
    return buildErrorResponse("Newsletter service is not configured.", requestId, 500);
  }

  let requestBody: SubscribeRequestBody;
  try {
    requestBody = (await request.json()) as SubscribeRequestBody;
  } catch {
    return buildErrorResponse("Invalid JSON payload.", requestId, 400);
  }

  const honeypot = sanitizeHoneypot(requestBody.hp);
  if (honeypot.length > 0) {
    console.info("website.newsletter.honeypot_triggered", { requestId });
    return buildSuccessResponse(requestId);
  }

  const email = sanitizeEmail(requestBody.email);
  if (!email) {
    return buildErrorResponse("A valid email is required.", requestId, 400);
  }

  const result = await addSubscriber(config, email);

  if (!result.ok) {
    console.warn("website.newsletter.subscribe_failed", {
      requestId,
      statusCode: result.statusCode,
      error: result.error,
    });

    return buildErrorResponse(result.error, requestId, result.statusCode);
  }

  console.info("website.newsletter.subscribed", {
    requestId,
    subscriberId: result.subscriberId,
  });

  return buildSuccessResponse(requestId);
}

