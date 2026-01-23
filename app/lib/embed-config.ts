export type EmbedOriginConfig = {
  origins: string[];
};

const EMBED_PARENT_ORIGINS_ENV = "NEXT_PUBLIC_PRICING_EMBED_PARENT_ORIGINS";

const normalizeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin;
  } catch (error) {
    console.warn("pricing_embed.parent_origin_invalid", { value, error });
    return null;
  }
};

export const getEmbedParentOrigins = (): EmbedOriginConfig => {
  const raw = process.env.NEXT_PUBLIC_PRICING_EMBED_PARENT_ORIGINS;
  if (!raw) {
    console.warn("pricing_embed.parent_origins_missing", { env: EMBED_PARENT_ORIGINS_ENV });
    return { origins: [] };
  }
  const origins = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => Boolean(entry));
  if (!origins.length) {
    console.warn("pricing_embed.parent_origins_invalid", { env: EMBED_PARENT_ORIGINS_ENV });
  }
  return { origins: Array.from(new Set(origins)) };
};
