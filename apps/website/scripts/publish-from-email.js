const { execFileSync } = require("node:child_process");
const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const matter = require("gray-matter");
const {
  normalizeFrontmatter,
  normalizeMdxText,
  normalizeMessageMetadata,
  shouldFailRun,
  writeContentFile,
} = require("./publish-from-email-core");
require("dotenv").config();

const requiredEnv = ["IMAP_HOST", "IMAP_PORT", "IMAP_USER", "IMAP_PASS"];

const config = {
  host: process.env.IMAP_HOST || process.env.MAIL_HOST,
  port: Number(process.env.IMAP_PORT || process.env.MAIL_PORT),
  secure: process.env.IMAP_SECURE !== "false",
  user: process.env.IMAP_USER || process.env.MAIL_USER,
  pass: process.env.IMAP_PASS || process.env.MAIL_PASS,
  folder: process.env.IMAP_FOLDER || process.env.MAIL_FOLDER || "INBOX",
  processedFolder: process.env.PROCESSED_FOLDER || "",
  rejectUnauthorized: process.env.IMAP_TLS_REJECT_UNAUTHORIZED !== "false",
  allowedSenders: (process.env.ALLOWED_SENDERS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
  gitAuthorName: process.env.GIT_AUTHOR_NAME || "email-publisher",
  gitAuthorEmail: process.env.GIT_AUTHOR_EMAIL || "email-publisher@users.noreply.github.com",
  dryRun: process.env.PUBLISH_DRY_RUN === "true",
  skipPush: process.env.PUBLISH_SKIP_PUSH === "true",
};

const ensureEnv = () => {
  if (!process.env.IMAP_HOST && process.env.SMTP_SERVER) {
    console.error(
      "SMTP settings are for sending mail only. Provide IMAP_* env vars to read incoming messages.",
    );
    process.exit(1);
  }

  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
};

const extractMdx = (parsed) => {
  const attachment =
    parsed.attachments?.find((item) => item.filename?.toLowerCase().endsWith(".mdx")) ||
    parsed.attachments?.find((item) => item.filename?.toLowerCase().endsWith(".md"));

  if (attachment) {
    return {
      mdx: attachment.content.toString("utf8"),
      filename: attachment.filename,
    };
  }

  if (parsed.text) {
    return { mdx: parsed.text, filename: undefined };
  }

  return { mdx: null, filename: undefined };
};

const withTimeout = (promise, label, ms = 5000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), ms),
    ),
  ]);

const markMessage = async (client, uid, success) => {
  if (success && config.processedFolder) {
    try {
      await withTimeout(
        client.messageMove(uid, config.processedFolder, { uid: true }),
        "move",
      );
      return;
    } catch (error) {
      console.warn(`Failed to move message ${uid} to ${config.processedFolder}:`, error.message);
    }
  }

  try {
    await withTimeout(client.messageFlagsAdd(uid, ["\\Seen"], { uid: true }), "flags");
  } catch (error) {
    console.warn(`Failed to mark message ${uid} as seen:`, error.message);
  }
};

const runGit = (args) => execFileSync("git", args, { stdio: "inherit" });

const main = async () => {
  ensureEnv();

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    tls: {
      rejectUnauthorized: config.rejectUnauthorized,
    },
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await client.connect();

  const lock = await client.getMailboxLock(config.folder);
  const changedFiles = [];
  const failures = [];

  try {
    const uids = (await client.search({ seen: false }, { uid: true })) || [];
    if (!uids.length) {
      console.log("No new messages to process.");
      return;
    }

    for await (const message of client.fetch(uids, { source: true }, { uid: true })) {
      console.log(`Processing message UID ${message.uid}`);
      let success = false;
      try {
        const parsed = await simpleParser(message.source);
        console.log(`Parsed message UID ${message.uid}`);
        const fromAddress = parsed.from?.value?.[0]?.address?.toLowerCase() || "";

        if (config.allowedSenders.length && !config.allowedSenders.includes(fromAddress)) {
          console.warn(`Skipping message ${message.uid} from unauthorized sender: ${fromAddress}`);
          await markMessage(client, message.uid, false);
          continue;
        }

        const { mdx, filename } = extractMdx(parsed);
        if (!mdx) {
          console.warn(`Skipping message ${message.uid}: no MDX content found.`);
          await markMessage(client, message.uid, false);
          continue;
        }

        const normalizedMdx = normalizeMdxText(mdx);
        const parsedMatter = matter(normalizedMdx);
        console.log(`Parsed frontmatter for UID ${message.uid}`);
        const normalizedMetadata = normalizeMessageMetadata({
          data: parsedMatter.data,
          subject: parsed.subject,
          filename,
        });

        const normalized = normalizeFrontmatter({
          data: normalizedMetadata.data,
          content: parsedMatter.content,
        });

        const { filePath, changed } = await writeContentFile({
          type: normalizedMetadata.type,
          slug: normalizedMetadata.slug,
          content: normalized,
        });
        console.log(`Wrote content for UID ${message.uid} -> ${filePath}`);
        if (changed) {
          changedFiles.push(filePath);
        }

        success = true;
      } catch (error) {
        failures.push({ uid: message.uid, error: error.message });
        console.error(`Failed to process message ${message.uid}: ${error.message}`);
      }

      console.log(`Marking message UID ${message.uid} as ${success ? "processed" : "seen"}`);
      await markMessage(client, message.uid, success);
    }
  } finally {
    lock.release();
    await client.logout();
  }

  if (!changedFiles.length) {
    console.log("No content changes to publish.");
  } else if (config.dryRun) {
    console.log("Dry run enabled. Skipping git commit and push.");
  } else {
    runGit(["config", "user.name", config.gitAuthorName]);
    runGit(["config", "user.email", config.gitAuthorEmail]);
    runGit(["add", ...changedFiles]);

    const status = execFileSync("git", ["status", "--porcelain"]).toString().trim();
    if (!status) {
      console.log("No git changes detected after processing.");
    } else {
      const commitMessage = `chore(content): publish ${changedFiles.length} item(s)`;
      runGit(["commit", "-m", commitMessage]);
      if (!config.skipPush) {
        runGit(["push"]);
      }
    }
  }

  if (shouldFailRun(failures)) {
    const summary = failures.map((item) => `UID ${item.uid}: ${item.error}`).join(" | ");
    throw new Error(`Completed with ${failures.length} failed message(s): ${summary}`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
