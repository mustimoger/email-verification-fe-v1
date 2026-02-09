const SITE_URL_ENV_KEYS = ["NEXT_PUBLIC_SITE_URL", "SITE_URL"] as const;

const isSupportedProtocol = (protocol: string) =>
  protocol === "http:" || protocol === "https:";

const parseSiteUrl = (rawValue: string, source: string): URL | null => {
  const value = rawValue.trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (!isSupportedProtocol(parsed.protocol)) {
      console.warn(
        `[seo] Ignoring ${source} because protocol is unsupported: ${parsed.protocol}`,
      );
      return null;
    }
    return new URL(parsed.origin);
  } catch {
    console.warn(`[seo] Ignoring ${source} because it is not a valid URL.`);
    return null;
  }
};

export const getConfiguredSiteUrl = (): URL | null => {
  for (const envKey of SITE_URL_ENV_KEYS) {
    const rawValue = process.env[envKey];
    if (!rawValue) continue;
    const parsed = parseSiteUrl(rawValue, envKey);
    if (parsed) return parsed;
  }
  return null;
};

export const getRequestSiteUrl = (request: Request): URL | null => {
  try {
    const parsed = new URL(request.url);
    if (!isSupportedProtocol(parsed.protocol)) {
      console.warn(
        `[seo] Ignoring request URL because protocol is unsupported: ${parsed.protocol}`,
      );
      return null;
    }
    return new URL(parsed.origin);
  } catch {
    console.warn("[seo] Unable to derive site URL from request.");
    return null;
  }
};

export const resolveSiteUrl = (request: Request): URL | null =>
  getConfiguredSiteUrl() ?? getRequestSiteUrl(request);

export const toAbsoluteUrl = (path: string, siteUrl: URL | null): string | null => {
  if (!siteUrl) return null;
  try {
    return new URL(path, siteUrl).toString();
  } catch {
    console.warn(`[seo] Unable to resolve absolute URL for path: ${path}`);
    return null;
  }
};
