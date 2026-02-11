import nodemailer from "nodemailer";

export type ContactNotificationPayload = {
  requestId: string;
  source: string;
  submittedAt: string;
  contact: {
    name: string;
    email: string;
    phone: string | null;
    message: string;
  };
  context: {
    ip: string | null;
    userAgent: string | null;
    referer: string | null;
  };
};

type ContactReplyToMode = "support" | "submitter";

type ContactSmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  startTlsRequired: boolean;
  fromEmail: string;
  fromName: string;
  supportReplyTo: string;
  replyToMode: ContactReplyToMode;
  recipientEmail: string;
  envelopeFrom: string;
  senderEmail: string | null;
  timeoutMs: number;
};

export type ContactSmtpDeliveryResult =
  | {
      ok: true;
      messageId: string;
      providerResponseCode: string | null;
      providerResponseText: string | null;
      accepted: string[];
      rejected: string[];
      pending: string[];
      envelopeFrom: string;
      envelopeTo: string[];
      headerFrom: string;
      headerSender: string | null;
      headerReplyTo: string;
      headerReplyToMode: ContactReplyToMode;
    }
  | {
      ok: false;
      error: string;
      statusCode: number;
      providerResponseCode: string | null;
      providerResponseText: string | null;
      smtpCommand: string | null;
      envelopeFrom: string;
      envelopeTo: string[];
      headerFrom: string;
      headerSender: string | null;
      headerReplyTo: string;
      headerReplyToMode: ContactReplyToMode;
    };

const DEFAULT_SMTP_TIMEOUT_MS = 30_000;

function asRequiredString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function toBoolean(value: string | undefined): boolean | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return null;
}

function toReplyToMode(value: string | undefined): ContactReplyToMode | null {
  if (!value) {
    return "support";
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return "support";
  }
  if (normalized === "support" || normalized === "submitter") {
    return normalized;
  }
  return null;
}

export function getContactSmtpConfig(): ContactSmtpConfig | null {
  const host = asRequiredString(process.env.SMTP_SERVER);
  const port = toPositiveInteger(process.env.SMTP_PORT);
  const username = asRequiredString(process.env.SMTP_USERNAME);
  const password = asRequiredString(process.env.SMTP_PASSWORD);
  const startTlsRequired = toBoolean(process.env.SMTP_STARTTLS_REQUIRED);
  const fromEmail = asRequiredString(process.env.SMTP_FROM_EMAIL);
  const fromName = asRequiredString(process.env.SMTP_FROM_NAME);
  const supportReplyTo = asRequiredString(process.env.SMTP_REPLY_TO);
  const replyToMode = toReplyToMode(process.env.CONTACT_SMTP_REPLY_TO_MODE);

  const configuredRecipient = asRequiredString(process.env.CONTACT_NOTIFICATION_TO_EMAIL);
  const recipientEmail = configuredRecipient ?? supportReplyTo ?? fromEmail;
  const configuredEnvelopeFrom = asRequiredString(process.env.CONTACT_SMTP_ENVELOPE_FROM);
  const envelopeFrom = configuredEnvelopeFrom ?? fromEmail;
  const senderEmail = asRequiredString(process.env.CONTACT_SMTP_SENDER_EMAIL);

  if (
    !host ||
    !port ||
    !username ||
    !password ||
    startTlsRequired === null ||
    !fromEmail ||
    !fromName ||
    !supportReplyTo ||
    !replyToMode ||
    !recipientEmail ||
    !envelopeFrom
  ) {
    return null;
  }

  const timeoutMs = toPositiveInteger(process.env.CONTACT_SMTP_TIMEOUT_MS) ?? DEFAULT_SMTP_TIMEOUT_MS;

  return {
    host,
    port,
    username,
    password,
    startTlsRequired,
    fromEmail,
    fromName,
    supportReplyTo,
    replyToMode,
    recipientEmail,
    envelopeFrom,
    senderEmail,
    timeoutMs,
  };
}

function buildSubject(payload: ContactNotificationPayload): string {
  return `Contact form submission [${payload.requestId}]`;
}

function buildBody(payload: ContactNotificationPayload): string {
  return [
    "New website contact submission received.",
    "",
    `Request ID: ${payload.requestId}`,
    `Source: ${payload.source}`,
    `Submitted At: ${payload.submittedAt}`,
    "",
    "Contact:",
    `- Name: ${payload.contact.name}`,
    `- Email: ${payload.contact.email}`,
    `- Phone: ${payload.contact.phone ?? "not_provided"}`,
    "",
    "Message:",
    payload.contact.message,
    "",
    "Context:",
    `- IP: ${payload.context.ip ?? "unknown"}`,
    `- User-Agent: ${payload.context.userAgent ?? "unknown"}`,
    `- Referer: ${payload.context.referer ?? "unknown"}`,
  ].join("\n");
}

function normalizeAddressEntries(entries: unknown[] | undefined): string[] {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }
      if (entry && typeof entry === "object") {
        const value = (entry as { address?: unknown }).address;
        if (typeof value === "string") {
          return value.trim();
        }
      }
      return "";
    })
    .filter((entry) => entry.length > 0);
}

function extractProviderResponseCode(responseText: string | null): string | null {
  if (!responseText) {
    return null;
  }
  const firstToken = responseText.trim().split(" ")[0] ?? "";
  if (firstToken.length !== 3) {
    return null;
  }
  const parsed = Number.parseInt(firstToken, 10);
  if (!Number.isFinite(parsed) || parsed < 100 || parsed > 599) {
    return null;
  }
  return String(parsed);
}

export function resolveContactReplyTo(
  config: Pick<ContactSmtpConfig, "replyToMode" | "supportReplyTo">,
  payload: Pick<ContactNotificationPayload, "contact">,
): string {
  if (config.replyToMode === "submitter") {
    const submitterEmail = asRequiredString(payload.contact.email);
    if (submitterEmail) {
      return submitterEmail;
    }
  }
  return config.supportReplyTo;
}

export async function sendContactNotificationEmail(
  config: ContactSmtpConfig,
  payload: ContactNotificationPayload,
): Promise<ContactSmtpDeliveryResult> {
  const headerFrom = `"${config.fromName}" <${config.fromEmail}>`;
  const headerSender = config.senderEmail;
  const headerReplyTo = resolveContactReplyTo(config, payload);
  const envelopeFrom = config.envelopeFrom;
  const envelopeTo = [config.recipientEmail];

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.startTlsRequired,
    auth: {
      user: config.username,
      pass: config.password,
    },
    connectionTimeout: config.timeoutMs,
    greetingTimeout: config.timeoutMs,
    socketTimeout: config.timeoutMs,
  });

  try {
    const info = await transport.sendMail({
      envelope: {
        from: envelopeFrom,
        to: envelopeTo,
      },
      from: headerFrom,
      sender: headerSender ?? undefined,
      to: config.recipientEmail,
      replyTo: headerReplyTo,
      subject: buildSubject(payload),
      text: buildBody(payload),
      headers: {
        "X-Contact-Request-ID": payload.requestId,
        "X-Contact-Source": payload.source,
      },
    });

    const providerResponseText =
      typeof info.response === "string" && info.response.trim().length > 0 ? info.response.trim() : null;
    const providerResponseCode = extractProviderResponseCode(providerResponseText);

    return {
      ok: true,
      messageId: info.messageId,
      providerResponseCode,
      providerResponseText,
      accepted: normalizeAddressEntries(info.accepted as unknown[]),
      rejected: normalizeAddressEntries(info.rejected as unknown[]),
      pending: normalizeAddressEntries((info as { pending?: unknown[] }).pending),
      envelopeFrom,
      envelopeTo,
      headerFrom,
      headerSender,
      headerReplyTo,
      headerReplyToMode: config.replyToMode,
    };
  } catch (error) {
    const errorRecord =
      error && typeof error === "object" ? (error as { response?: unknown; responseCode?: unknown; command?: unknown }) : null;
    const providerResponseText =
      typeof errorRecord?.response === "string" && errorRecord.response.trim().length > 0
        ? errorRecord.response.trim()
        : null;
    const providerResponseCode =
      typeof errorRecord?.responseCode === "number" && Number.isFinite(errorRecord.responseCode)
        ? String(errorRecord.responseCode)
        : extractProviderResponseCode(providerResponseText);
    const smtpCommand =
      typeof errorRecord?.command === "string" && errorRecord.command.trim().length > 0
        ? errorRecord.command.trim()
        : null;

    return {
      ok: false,
      statusCode: 502,
      error: error instanceof Error ? error.message : "SMTP send failed.",
      providerResponseCode,
      providerResponseText,
      smtpCommand,
      envelopeFrom,
      envelopeTo,
      headerFrom,
      headerSender,
      headerReplyTo,
      headerReplyToMode: config.replyToMode,
    };
  }
}
