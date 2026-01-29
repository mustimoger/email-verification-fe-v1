export type LegalLink = {
  key: "privacy" | "terms" | "gdpr";
  label: string;
  href: string;
};

type LegalLinkSource = {
  key: LegalLink["key"];
  label: string;
  href: string | undefined;
  env: string;
};

const LEGAL_LINK_SOURCES: LegalLinkSource[] = [
  {
    key: "privacy",
    label: "Privacy Policy",
    href: process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL,
    env: "NEXT_PUBLIC_PRIVACY_POLICY_URL",
  },
  {
    key: "terms",
    label: "Terms of Service",
    href: process.env.NEXT_PUBLIC_TERMS_URL,
    env: "NEXT_PUBLIC_TERMS_URL",
  },
  {
    key: "gdpr",
    label: "GDPR Compliance",
    href: process.env.NEXT_PUBLIC_GDPR_URL,
    env: "NEXT_PUBLIC_GDPR_URL",
  },
];

const warnedMissing = new Set<string>();

const warnMissingLink = (source: LegalLinkSource) => {
  if (warnedMissing.has(source.env)) {
    return;
  }
  warnedMissing.add(source.env);
  // eslint-disable-next-line no-console
  console.warn("legal.link_missing", { env: source.env, key: source.key });
};

export const getLegalLinks = (): LegalLink[] => {
  return LEGAL_LINK_SOURCES.flatMap((source) => {
    const trimmed = source.href?.trim();
    if (!trimmed) {
      warnMissingLink(source);
      return [];
    }
    return [
      {
        key: source.key,
        label: source.label,
        href: trimmed,
      },
    ];
  });
};
