import type { AnchorHTMLAttributes } from "react";
import Link from "next/link";

export type CTACardVariant = "hero" | "inline" | "end";

export type CTACardProps = {
  variant?: CTACardVariant;
  badge?: string;
  title: string;
  description?: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  bullets?: string[];
  className?: string;
};

const isExternalLink = (href: string) => /^https?:\/\//.test(href);

const mergeClassNames = (...classNames: Array<string | undefined>) =>
  classNames.filter(Boolean).join(" ");

const variantStyles: Record<CTACardVariant, string> = {
  hero:
    "rounded-[20px] bg-[linear-gradient(135deg,#101214_0%,#15335A_50%,#101214_100%)] p-7 text-white shadow-[0_16px_44px_rgba(16,18,20,0.32)] sm:p-10",
  inline:
    "rounded-[16px] border border-[#001726]/10 bg-[#F8FAFC] p-6 text-[#001726] shadow-[0_8px_28px_rgba(15,23,42,0.06)] sm:p-8",
  end: "rounded-[20px] bg-[linear-gradient(140deg,#0B1222_0%,#1D4ED8_65%,#38BDF8_100%)] p-7 text-white shadow-[0_18px_46px_rgba(29,78,216,0.28)] sm:p-10",
};

const badgeStyles: Record<CTACardVariant, string> = {
  hero: "bg-white/15 text-white",
  inline: "bg-[#3397F6]/15 text-[#1D4ED8]",
  end: "bg-white/20 text-white",
};

const titleStyles: Record<CTACardVariant, string> = {
  hero: "text-[28px] leading-[1.2] sm:text-[36px]",
  inline: "text-[24px] leading-[1.25] sm:text-[28px]",
  end: "text-[28px] leading-[1.2] sm:text-[34px]",
};

const descriptionStyles: Record<CTACardVariant, string> = {
  hero: "text-[#E2E8F0]",
  inline: "text-[#334155]",
  end: "text-[#E2E8F0]",
};

const primaryButtonStyles: Record<CTACardVariant, string> = {
  hero: "bg-white text-[#0F172A] hover:bg-[#F8FAFC]",
  inline: "bg-[#2563EB] text-white hover:bg-[#1D4ED8]",
  end: "bg-white text-[#0F172A] hover:bg-[#E2E8F0]",
};

const secondaryButtonStyles: Record<CTACardVariant, string> = {
  hero: "border border-white/35 text-white hover:bg-white/10",
  inline: "border border-[#2563EB] text-[#1D4ED8] hover:bg-[#EFF6FF]",
  end: "border border-white/35 text-white hover:bg-white/10",
};

const bulletTextStyles: Record<CTACardVariant, string> = {
  hero: "text-[#E2E8F0]",
  inline: "text-[#334155]",
  end: "text-[#E2E8F0]",
};

const LinkOrAnchor = ({
  href,
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => {
  if (isExternalLink(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  );
};

export function CTACard({
  variant = "inline",
  badge,
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  bullets = [],
  className,
}: CTACardProps) {
  return (
    <section className={mergeClassNames(variantStyles[variant], className)}>
      <div className="mx-auto flex max-w-[860px] flex-col items-start gap-5">
        {badge ? (
          <span
            className={mergeClassNames(
              "inline-flex rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.04em]",
              badgeStyles[variant],
            )}
          >
            {badge}
          </span>
        ) : null}

        <h3 className={mergeClassNames("font-semibold tracking-[-0.02em]", titleStyles[variant])}>
          {title}
        </h3>

        {description ? (
          <p className={mergeClassNames("max-w-[760px] text-[17px] leading-[1.6]", descriptionStyles[variant])}>
            {description}
          </p>
        ) : null}

        {bullets.length ? (
          <ul className="grid w-full gap-2 sm:grid-cols-2">
            {bullets.map((bullet) => (
              <li
                key={bullet}
                className={mergeClassNames(
                  "flex items-start gap-2 text-[15px] leading-[1.5]",
                  bulletTextStyles[variant],
                )}
              >
                <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-current" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-1">
          <LinkOrAnchor
            href={primaryHref}
            className={mergeClassNames(
              "inline-flex min-h-[46px] items-center justify-center rounded-[10px] px-5 text-[15px] font-semibold transition-colors",
              primaryButtonStyles[variant],
            )}
          >
            {primaryLabel}
          </LinkOrAnchor>

          {secondaryLabel && secondaryHref ? (
            <LinkOrAnchor
              href={secondaryHref}
              className={mergeClassNames(
                "inline-flex min-h-[46px] items-center justify-center rounded-[10px] px-5 text-[15px] font-semibold transition-colors",
                secondaryButtonStyles[variant],
              )}
            >
              {secondaryLabel}
            </LinkOrAnchor>
          ) : null}
        </div>
      </div>
    </section>
  );
}
