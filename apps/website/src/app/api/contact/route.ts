import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  getContactSmtpConfig,
  sendContactNotificationEmail,
  type ContactNotificationPayload,
} from "@/lib/contact/smtp";

export const runtime = "nodejs";

type ContactRequestBody = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  hp?: unknown;
};

type ContactSuccessBody = {
  requestId: string;
  status: "accepted";
  message: string;
};

type ContactErrorBody = {
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

const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 320;
const MAX_PHONE_LENGTH = 64;
const MAX_MESSAGE_LENGTH = 4_000;
const CONTACT_SOURCE = "website_contact_form";
const CONTACT_RECEIVED_MESSAGE = "Contact request received.";
const CONTACT_RATE_LIMIT_WINDOW_SECONDS = "CONTACT_RATE_LIMIT_WINDOW_SECONDS";
const CONTACT_RATE_LIMIT_MAX_PER_WINDOW = "CONTACT_RATE_LIMIT_MAX_PER_WINDOW";

const rateLimitBuckets = new Map<string, RateLimitEntry>();

function buildSuccessResponse(requestId: string): NextResponse<ContactSuccessBody> {
  return NextResponse.json<ContactSuccessBody>(
    {
      requestId,
      status: "accepted",
      message: CONTACT_RECEIVED_MESSAGE,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function buildErrorResponse(
  requestId: string,
  message: string,
  statusCode: number,
): NextResponse<ContactErrorBody> {
  return NextResponse.json<ContactErrorBody>(
    {
      requestId,
      error: message,
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function toPositiveInteger(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function getRateLimitConfig(): RateLimitConfig | null {
  const windowSeconds = toPositiveInteger(process.env[CONTACT_RATE_LIMIT_WINDOW_SECONDS]);
  const maxRequests = toPositiveInteger(process.env[CONTACT_RATE_LIMIT_MAX_PER_WINDOW]);
  if (!windowSeconds || !maxRequests) {
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
  if (!realIp) {
    return null;
  }
  const trimmed = realIp.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getHeaderValue(request: NextRequest, headerName: string, maxLength: number): string | null {
  const raw = request.headers.get(headerName);
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.slice(0, maxLength);
}

function sanitizeRequiredText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return null;
  }
  return trimmed;
}

function sanitizeOptionalText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > maxLength) {
    return null;
  }
  return trimmed;
}

function sanitizeEmail(value: unknown): string | null {
  const email = sanitizeRequiredText(value, MAX_EMAIL_LENGTH);
  if (!email) {
    return null;
  }
  if (email.includes(" ")) {
    return null;
  }

  const separatorIndex = email.indexOf("@");
  if (separatorIndex <= 0 || separatorIndex === email.length - 1) {
    return null;
  }
  if (email.indexOf("@", separatorIndex + 1) !== -1) {
    return null;
  }

  const domain = email.slice(separatorIndex + 1);
  if (domain.startsWith(".") || domain.endsWith(".")) {
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

function applyRateLimit(request: NextRequest, requestId: string): NextResponse<ContactErrorBody> | null {
  const config = getRateLimitConfig();
  if (!config) {
    return null;
  }

  const ip = getClientIp(request);
  const bucketKey = ip ?? "unknown";
  if (!ip) {
    console.warn("website.contact.rate_limit.missing_ip", { requestId });
  }

  const now = Date.now();
  const bucket = rateLimitBuckets.get(bucketKey);
  if (!bucket || now - bucket.windowStartMs >= config.windowMs) {
    rateLimitBuckets.set(bucketKey, { windowStartMs: now, count: 1 });
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

  return NextResponse.json<ContactErrorBody>(
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

export async function POST(request: NextRequest): Promise<NextResponse<ContactSuccessBody | ContactErrorBody>> {
  const requestId = randomUUID();

  const rateLimitResponse = applyRateLimit(request, requestId);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const config = getContactSmtpConfig();
  if (!config) {
    console.error("website.contact.smtp_misconfigured", {
      requestId,
      hasSmtpServer: Boolean(process.env.SMTP_SERVER),
      hasSmtpPort: Boolean(process.env.SMTP_PORT),
      hasSmtpUsername: Boolean(process.env.SMTP_USERNAME),
      hasSmtpPassword: Boolean(process.env.SMTP_PASSWORD),
      hasSmtpStartTlsRequired: Boolean(process.env.SMTP_STARTTLS_REQUIRED),
      hasSmtpFromEmail: Boolean(process.env.SMTP_FROM_EMAIL),
      hasSmtpFromName: Boolean(process.env.SMTP_FROM_NAME),
      hasSmtpReplyTo: Boolean(process.env.SMTP_REPLY_TO),
      hasContactNotificationToEmail: Boolean(process.env.CONTACT_NOTIFICATION_TO_EMAIL),
      hasContactSmtpTimeoutMs: Boolean(process.env.CONTACT_SMTP_TIMEOUT_MS),
    });
    return buildErrorResponse(requestId, "Contact SMTP service is not configured.", 500);
  }

  let requestBody: ContactRequestBody;
  try {
    requestBody = (await request.json()) as ContactRequestBody;
  } catch {
    return buildErrorResponse(requestId, "Invalid JSON payload.", 400);
  }

  const honeypot = sanitizeHoneypot(requestBody.hp);
  if (honeypot.length > 0) {
    console.info("website.contact.honeypot_triggered", { requestId });
    return buildSuccessResponse(requestId);
  }

  const name = sanitizeRequiredText(requestBody.name, MAX_NAME_LENGTH);
  if (!name) {
    return buildErrorResponse(requestId, "A valid name is required.", 400);
  }

  const email = sanitizeEmail(requestBody.email);
  if (!email) {
    return buildErrorResponse(requestId, "A valid email is required.", 400);
  }

  const phone = sanitizeOptionalText(requestBody.phone, MAX_PHONE_LENGTH);
  if (requestBody.phone !== undefined && requestBody.phone !== null && phone === null) {
    return buildErrorResponse(requestId, "Phone must be a valid text value.", 400);
  }

  const message = sanitizeRequiredText(requestBody.message, MAX_MESSAGE_LENGTH);
  if (!message) {
    return buildErrorResponse(requestId, "A valid message is required.", 400);
  }

  const payload: ContactNotificationPayload = {
    requestId,
    source: CONTACT_SOURCE,
    submittedAt: new Date().toISOString(),
    contact: {
      name,
      email,
      phone,
      message,
    },
    context: {
      ip: getClientIp(request),
      userAgent: getHeaderValue(request, "user-agent", 512),
      referer: getHeaderValue(request, "referer", 1024),
    },
  };

  console.info("website.contact.smtp_attempt", {
    requestId,
    envelopeFrom: config.envelopeFrom,
    envelopeTo: [config.recipientEmail],
    headerFrom: `"${config.fromName}" <${config.fromEmail}>`,
    headerSender: config.senderEmail,
    headerReplyTo: payload.contact.email || config.supportReplyTo,
  });

  const deliveryResult = await sendContactNotificationEmail(config, payload);
  if (!deliveryResult.ok) {
    console.warn("website.contact.smtp_delivery_failed", {
      requestId,
      statusCode: deliveryResult.statusCode,
      error: deliveryResult.error,
      providerResponseCode: deliveryResult.providerResponseCode,
      providerResponseText: deliveryResult.providerResponseText,
      smtpCommand: deliveryResult.smtpCommand,
      envelopeFrom: deliveryResult.envelopeFrom,
      envelopeTo: deliveryResult.envelopeTo,
      headerFrom: deliveryResult.headerFrom,
      headerSender: deliveryResult.headerSender,
      headerReplyTo: deliveryResult.headerReplyTo,
    });
    return buildErrorResponse(requestId, deliveryResult.error, deliveryResult.statusCode);
  }

  console.info("website.contact.smtp_submitted", {
    requestId,
    messageId: deliveryResult.messageId,
    providerResponseCode: deliveryResult.providerResponseCode,
    providerResponseText: deliveryResult.providerResponseText,
    acceptedCount: deliveryResult.accepted.length,
    accepted: deliveryResult.accepted,
    rejectedCount: deliveryResult.rejected.length,
    rejected: deliveryResult.rejected,
    pendingCount: deliveryResult.pending.length,
    pending: deliveryResult.pending,
    envelopeFrom: deliveryResult.envelopeFrom,
    envelopeTo: deliveryResult.envelopeTo,
    headerFrom: deliveryResult.headerFrom,
    headerSender: deliveryResult.headerSender,
    headerReplyTo: deliveryResult.headerReplyTo,
  });
  return buildSuccessResponse(requestId);
}
