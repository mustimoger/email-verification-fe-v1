import assert from "node:assert";
import nodemailer from "nodemailer";

import { POST } from "../../src/app/api/contact/route";

type ContactRouteError = {
  requestId: string;
  error: string;
};

type ContactRouteSuccess = {
  requestId: string;
  status: "accepted";
  message: string;
};

const ENV_KEYS = [
  "SMTP_SERVER",
  "SMTP_PORT",
  "SMTP_USERNAME",
  "SMTP_PASSWORD",
  "SMTP_STARTTLS_REQUIRED",
  "SMTP_FROM_EMAIL",
  "SMTP_FROM_NAME",
  "SMTP_REPLY_TO",
  "CONTACT_SMTP_REPLY_TO_MODE",
  "CONTACT_NOTIFICATION_TO_EMAIL",
  "CONTACT_SMTP_TIMEOUT_MS",
  "CONTACT_RATE_LIMIT_WINDOW_SECONDS",
  "CONTACT_RATE_LIMIT_MAX_PER_WINDOW",
] as const;

const snapshotEnv = () => {
  const snapshot: Record<string, string | undefined> = {};
  for (const key of ENV_KEYS) {
    snapshot[key] = process.env[key];
  }
  return snapshot;
};

const restoreEnv = (snapshot: Record<string, string | undefined>) => {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

const run = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    // eslint-disable-next-line no-console
    console.log(`✓ ${name}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`✗ ${name}`);
    throw error;
  }
};

const makeRequest = (body: object, headers?: Record<string, string>) =>
  new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });

const withSmtpConfig = () => {
  process.env.SMTP_SERVER = "smtp.acumbamail.com";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_USERNAME = "mailer@example.com";
  process.env.SMTP_PASSWORD = "super-secret";
  process.env.SMTP_STARTTLS_REQUIRED = "true";
  process.env.SMTP_FROM_EMAIL = "support@boltroute.ai";
  process.env.SMTP_FROM_NAME = "BoltRoute";
  process.env.SMTP_REPLY_TO = "support@boltroute.ai";
  delete process.env.CONTACT_SMTP_REPLY_TO_MODE;
  process.env.CONTACT_NOTIFICATION_TO_EMAIL = "sales@boltroute.ai";
  delete process.env.CONTACT_RATE_LIMIT_WINDOW_SECONDS;
  delete process.env.CONTACT_RATE_LIMIT_MAX_PER_WINDOW;
};

const main = async () => {
  await run("POST /api/contact returns 500 when SMTP env is missing", async () => {
    const envSnapshot = snapshotEnv();
    try {
      for (const key of ENV_KEYS) {
        delete process.env[key];
      }

      const response = await POST(
        makeRequest({
          name: "QA User",
          email: "qa@example.com",
          message: "Need pricing details.",
        }) as any,
      );
      assert.strictEqual(response.status, 500);

      const payload = (await response.json()) as ContactRouteError;
      assert.strictEqual(payload.error, "Contact SMTP service is not configured.");
      assert.ok(payload.requestId);
    } finally {
      restoreEnv(envSnapshot);
    }
  });

  await run("POST /api/contact returns 400 for invalid email", async () => {
    const envSnapshot = snapshotEnv();
    try {
      withSmtpConfig();

      const response = await POST(
        makeRequest({
          name: "QA User",
          email: "invalid_email",
          message: "Need pricing details.",
        }) as any,
      );

      assert.strictEqual(response.status, 400);
      const payload = (await response.json()) as ContactRouteError;
      assert.strictEqual(payload.error, "A valid email is required.");
      assert.ok(payload.requestId);
    } finally {
      restoreEnv(envSnapshot);
    }
  });

  await run("POST /api/contact returns 500 for invalid reply-to mode", async () => {
    const envSnapshot = snapshotEnv();
    try {
      withSmtpConfig();
      process.env.CONTACT_SMTP_REPLY_TO_MODE = "invalid";

      const response = await POST(
        makeRequest({
          name: "QA User",
          email: "qa@example.com",
          message: "Need pricing details.",
        }) as any,
      );

      assert.strictEqual(response.status, 500);
      const payload = (await response.json()) as ContactRouteError;
      assert.strictEqual(payload.error, "Contact SMTP service is not configured.");
      assert.ok(payload.requestId);
    } finally {
      restoreEnv(envSnapshot);
    }
  });

  await run("POST /api/contact accepts honeypot and skips SMTP send", async () => {
    const envSnapshot = snapshotEnv();
    const originalCreateTransport = nodemailer.createTransport;
    let sendMailCalled = false;

    try {
      withSmtpConfig();

      (nodemailer as any).createTransport = (() => ({
        sendMail: async () => {
          sendMailCalled = true;
          return { messageId: "ignored", accepted: [], rejected: [] };
        },
      })) as typeof nodemailer.createTransport;

      const response = await POST(
        makeRequest({
          name: "QA Bot",
          email: "bot@example.com",
          message: "spam",
          hp: "bot-filled",
        }) as any,
      );

      assert.strictEqual(response.status, 200);
      const payload = (await response.json()) as ContactRouteSuccess;
      assert.strictEqual(payload.status, "accepted");
      assert.strictEqual(payload.message, "Contact request received.");
      assert.strictEqual(sendMailCalled, false);
    } finally {
      (nodemailer as any).createTransport = originalCreateTransport;
      restoreEnv(envSnapshot);
    }
  });

  await run("POST /api/contact sends SMTP message and returns accepted", async () => {
    const envSnapshot = snapshotEnv();
    const originalCreateTransport = nodemailer.createTransport;

    let capturedTransportConfig: Record<string, unknown> | null = null;
    let capturedMailOptions: Record<string, unknown> | null = null;

    try {
      withSmtpConfig();
      process.env.CONTACT_SMTP_TIMEOUT_MS = "5000";

      (nodemailer as any).createTransport = ((transportConfig: Record<string, unknown>) => {
        capturedTransportConfig = transportConfig;

        return {
          sendMail: async (mailOptions: Record<string, unknown>) => {
            capturedMailOptions = mailOptions;
            return {
              messageId: "<smtp-message-id@example.com>",
              accepted: ["sales@boltroute.ai"],
              rejected: [],
            };
          },
        };
      }) as typeof nodemailer.createTransport;

      const response = await POST(
        makeRequest(
          {
            name: "QA Contact",
            email: "qa-contact@example.com",
            phone: "+1 415 555 0001",
            message: "Checking contact route SMTP delivery.",
          },
          {
            "x-forwarded-for": "203.0.113.8",
            "user-agent": "test-agent",
            referer: "https://boltroute.ai/contact",
          },
        ) as any,
      );

      assert.strictEqual(response.status, 200);
      const payload = (await response.json()) as ContactRouteSuccess;
      assert.strictEqual(payload.status, "accepted");
      assert.strictEqual(payload.message, "Contact request received.");
      assert.ok(payload.requestId);

      assert.ok(capturedTransportConfig);
      assert.strictEqual(capturedTransportConfig?.host, "smtp.acumbamail.com");
      assert.strictEqual(capturedTransportConfig?.port, 587);
      assert.strictEqual(capturedTransportConfig?.requireTLS, true);
      assert.strictEqual(capturedTransportConfig?.connectionTimeout, 5000);

      assert.ok(capturedMailOptions);
      assert.strictEqual(capturedMailOptions?.to, "sales@boltroute.ai");
      assert.strictEqual(capturedMailOptions?.replyTo, "support@boltroute.ai");
      assert.strictEqual(capturedMailOptions?.subject, `Contact form submission [${payload.requestId}]`);

      const bodyText = String(capturedMailOptions?.text ?? "");
      assert.ok(bodyText.includes("QA Contact"));
      assert.ok(bodyText.includes("qa-contact@example.com"));
      assert.ok(bodyText.includes("Checking contact route SMTP delivery."));
      assert.ok(bodyText.includes("203.0.113.8"));
    } finally {
      (nodemailer as any).createTransport = originalCreateTransport;
      restoreEnv(envSnapshot);
    }
  });

  await run("POST /api/contact uses submitter reply-to when mode is submitter", async () => {
    const envSnapshot = snapshotEnv();
    const originalCreateTransport = nodemailer.createTransport;

    let capturedMailOptions: Record<string, unknown> | null = null;

    try {
      withSmtpConfig();
      process.env.CONTACT_SMTP_REPLY_TO_MODE = "submitter";

      (nodemailer as any).createTransport = (() => ({
        sendMail: async (mailOptions: Record<string, unknown>) => {
          capturedMailOptions = mailOptions;
          return {
            messageId: "<smtp-message-id@example.com>",
            accepted: ["sales@boltroute.ai"],
            rejected: [],
          };
        },
      })) as typeof nodemailer.createTransport;

      const response = await POST(
        makeRequest({
          name: "QA Contact",
          email: "qa-contact@example.com",
          message: "Checking submitter reply-to mode.",
        }) as any,
      );

      assert.strictEqual(response.status, 200);
      assert.strictEqual(capturedMailOptions?.replyTo, "qa-contact@example.com");
    } finally {
      (nodemailer as any).createTransport = originalCreateTransport;
      restoreEnv(envSnapshot);
    }
  });

  // eslint-disable-next-line no-console
  console.log("contact route tests completed");
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
