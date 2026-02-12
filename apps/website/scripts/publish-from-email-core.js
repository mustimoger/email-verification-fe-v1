const path = require("node:path");
const fs = require("node:fs/promises");
const matter = require("gray-matter");

const REQUIRED_POST_FIELDS = ["metaTitle", "metaDescription", "date"];

const slugify = (value) =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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

const normalizeMessageMetadata = ({ data: rawData, subject, filename }) => {
  const data = { ...rawData };

  if (!data.author && (data.name || data.url)) {
    data.author = {
      name: data.name,
      url: data.url,
    };
    delete data.name;
    delete data.url;
  }

  const type = (data.type || "").toString().toLowerCase();
  if (!type || !["post", "page"].includes(type)) {
    throw new Error('Frontmatter must include type: "post" or "page".');
  }

  const title = data.title || subject;
  if (!title) {
    throw new Error("Frontmatter must include a title.");
  }

  const slug = data.slug || (filename ? path.basename(filename, path.extname(filename)) : slugify(title));
  if (!slug) {
    throw new Error("Could not infer slug. Add slug to frontmatter.");
  }

  if (type === "post") {
    const missingFields = REQUIRED_POST_FIELDS.filter((field) => !data[field]);
    if (missingFields.length) {
      throw new Error(`Missing required fields for post: ${missingFields.join(", ")}`);
    }
  }

  const normalizedData = {
    ...data,
    title,
    slug,
    type,
  };

  return {
    type,
    title,
    slug,
    data: normalizedData,
  };
};

const getContentBaseDir = ({ type, rootDir = process.cwd() }) => {
  if (type === "post") {
    return path.join(rootDir, "content", "posts");
  }
  if (type === "page") {
    return path.join(rootDir, "content", "pages");
  }
  throw new Error(`Unsupported content type: ${type}`);
};

const writeContentFile = async ({ type, slug, content, rootDir = process.cwd(), fsModule = fs }) => {
  const baseDir = getContentBaseDir({ type, rootDir });
  await fsModule.mkdir(baseDir, { recursive: true });

  const filePath = path.join(baseDir, `${slug}.mdx`);
  let existing = "";

  try {
    existing = await fsModule.readFile(filePath, "utf8");
  } catch {
    existing = "";
  }

  if (existing.trim() === content.trim()) {
    return { filePath, changed: false };
  }

  await fsModule.writeFile(filePath, content, "utf8");
  return { filePath, changed: true };
};

const shouldFailRun = (failures) => Array.isArray(failures) && failures.length > 0;

module.exports = {
  normalizeFrontmatter,
  normalizeMdxText,
  normalizeMessageMetadata,
  getContentBaseDir,
  slugify,
  writeContentFile,
  shouldFailRun,
};
