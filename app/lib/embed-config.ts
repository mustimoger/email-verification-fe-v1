export type EmbedOriginConfig = {
  origins: string[];
};

const EMBED_PARENT_ORIGINS_ENV = "NEXT_PUBLIC_PRICING_EMBED_PARENT_ORIGINS";
const DEFAULT_EMBED_PARENT_ORIGINS = [
  "https://boltroute.ai",
  "https://www.boltroute.ai",
  "http://127.0.0.1:3010",
  "http://localhost:3010",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
];

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch (error) {
    console.warn("pricing_embed.parent_origin_invalid", { value, error });
    return null;
  }
};

export const parseEmbedOrigins = (value: string): string[] => {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => Boolean(entry));
};

export const buildFrameAncestorsDirective = (origins: string[]): string => {
  if (!origins.length) {
    return "frame-ancestors 'none'";
  }
  return `frame-ancestors ${origins.join(" ")}`;
};

export const resolveAllowedParentOrigin = ({
  allowedOrigins,
  value,
}: {
  allowedOrigins: string[];
  value: string | null | undefined;
}): string | null => {
  const candidate = value ? normalizeOrigin(value) : null;
  if (!candidate) return null;
  return allowedOrigins.includes(candidate) ? candidate : null;
};

export const getEmbedParentOrigins = (): EmbedOriginConfig => {
  const raw = process.env.NEXT_PUBLIC_PRICING_EMBED_PARENT_ORIGINS;
  const defaults = parseEmbedOrigins(DEFAULT_EMBED_PARENT_ORIGINS.join(","));
  if (!raw) {
    console.warn("pricing_embed.parent_origins_missing", { env: EMBED_PARENT_ORIGINS_ENV });
    return { origins: defaults };
  }
  const configuredOrigins = parseEmbedOrigins(raw);
  if (!configuredOrigins.length) {
    console.warn("pricing_embed.parent_origins_invalid", { env: EMBED_PARENT_ORIGINS_ENV });
  }
  const origins = Array.from(new Set([...defaults, ...configuredOrigins]));
  return { origins };
};
