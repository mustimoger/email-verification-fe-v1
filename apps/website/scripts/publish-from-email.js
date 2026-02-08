const path = require("node:path");
const fs = require("node:fs/promises");
const { execFileSync } = require("node:child_process");
const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const matter = require("gray-matter");
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

const slugify = (value) =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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

const normalizeMdxText = (raw) => {
  if (!raw) return raw;
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimStart();
  if (normalized.startsWith("---")) return normalized;

  const lines = normalized.split("\n");
  const separatorIndex = lines.findIndex((line) => line.trim() === "---");
  if (separatorIndex > 0) {
    const headerLines = lines.slice(0, separatorIndex);
    const hasYamlKey = headerLines.some((line) => /^\s*[A-Za-z0-9_-]+:\s*/.test(line));
    if (hasYamlKey) {
      return ["---", ...headerLines, "---", ...lines.slice(separatorIndex + 1)].join("\n");
    }
  }

  const firstBlank = lines.findIndex((line) => line.trim() === "");
  if (firstBlank > 0) {
    const headerLines = lines.slice(0, firstBlank);
    const hasYamlKey = headerLines.some((line) => /^\s*[A-Za-z0-9_-]+:\s*/.test(line));
    if (hasYamlKey) {
      return ["---", ...headerLines, "---", ...lines.slice(firstBlank + 1)].join("\n");
    }
  }

  return normalized;
};

const normalizeFrontmatter = ({ data, content }) => {
  const body = content.trim().length ? `${content.trim()}\n` : "";
  return matter.stringify(body, data);
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

const writeContentFile = async (type, slug, content) => {
  const baseDir =
    type === "post" ? path.join("content", "posts") : path.join("content", "pages");
  await fs.mkdir(baseDir, { recursive: true });
  const filePath = path.join(baseDir, `${slug}.mdx`);
  let existing = "";
  try {
    existing = await fs.readFile(filePath, "utf8");
  } catch {
    existing = "";
  }

  if (existing.trim() === content.trim()) {
    return { filePath, changed: false };
  }

  await fs.writeFile(filePath, content, "utf8");
  return { filePath, changed: true };
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
        const data = { ...parsedMatter.data };

        if (!data.author && (data.name || data.url)) {
          data.author = {
            name: data.name,
            url: data.url,
          };
          delete data.name;
          delete data.url;
        }

        const type = (data.type || "").toString().toLowerCase();
        if (!["post", "page"].includes(type)) {
          throw new Error('Frontmatter must include type: "post" or "page".');
        }

        const title = data.title || parsed.subject;
        if (!title) {
          throw new Error("Frontmatter must include a title.");
        }

        const slug =
          data.slug ||
          (filename ? path.basename(filename, path.extname(filename)) : slugify(title));

        if (!slug) {
          throw new Error("Could not infer slug. Add slug to frontmatter.");
        }

        if (type === "post") {
          const requiredFields = ["metaTitle", "metaDescription", "date"];
          const missingFields = requiredFields.filter((field) => !data[field]);
          if (missingFields.length) {
            throw new Error(`Missing required fields for post: ${missingFields.join(", ")}`);
          }
        }

        data.title = title;
        data.slug = slug;
        data.type = type;

        const normalized = normalizeFrontmatter({
          data,
          content: parsedMatter.content,
        });

        const { filePath, changed } = await writeContentFile(type, slug, normalized);
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
    return;
  }

  if (config.dryRun) {
    console.log("Dry run enabled. Skipping git commit and push.");
    return;
  }

  runGit(["config", "user.name", config.gitAuthorName]);
  runGit(["config", "user.email", config.gitAuthorEmail]);
  runGit(["add", ...changedFiles]);

  const status = execFileSync("git", ["status", "--porcelain"]).toString().trim();
  if (!status) {
    console.log("No git changes detected after processing.");
    return;
  }

  const commitMessage = `chore(content): publish ${changedFiles.length} item(s)`;
  runGit(["commit", "-m", commitMessage]);
  if (!config.skipPush) {
    runGit(["push"]);
  }

  if (failures.length) {
    console.warn(`Completed with ${failures.length} failed message(s).`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
