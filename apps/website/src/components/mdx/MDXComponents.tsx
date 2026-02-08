import type { ComponentProps, ComponentType, ReactNode } from "react";
import Link from "next/link";
import { Callout } from "./Callout";
import { Button } from "./Button";
import { Card } from "./Card";
import { CTACard } from "@/components/landing/CTACard";

type MDXComponent = ComponentType<Record<string, unknown>>;
type CustomMDXComponent = typeof Callout | typeof Button | typeof Card | typeof CTACard;

type AnchorProps = ComponentProps<"a">;
type TableProps = ComponentProps<"table">;
type TableSectionProps = ComponentProps<"thead">;
type TableRowProps = ComponentProps<"tr">;
type TableCellProps = ComponentProps<"th">;

const mergeClassNames = (base: string, custom?: string) =>
  custom ? `${base} ${custom}` : base;

const getTextContent = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getTextContent).join("");
  if (node && typeof node === "object" && "props" in node) {
    const maybeNode = node as { props?: { children?: ReactNode } };
    return getTextContent(maybeNode.props?.children ?? "");
  }
  return "";
};

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getHeadingId = (
  props: Pick<ComponentProps<"h2">, "id" | "children">,
) => props.id ?? toSlug(getTextContent(props.children));

const A = ({ href = "", children, ...rest }: AnchorProps) => {
  const isInternalRoute = /^(\/(?!\/)|\.{1,2}\/)/.test(href);
  const isHttpLink = /^https?:\/\//.test(href);

  if (!isInternalRoute) {
    return (
      <a
        href={href}
        target={isHttpLink ? "_blank" : undefined}
        rel={isHttpLink ? "noreferrer" : undefined}
        className="text-[#3397F6] underline-offset-4 hover:underline"
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className="text-[#3397F6] underline-offset-4 hover:underline">
      {children}
    </Link>
  );
};

export const mdxComponents: Record<string, MDXComponent | CustomMDXComponent> = {
  h1: ({ className, ...props }: ComponentProps<"h1">) => (
    <h1
      className={mergeClassNames("mb-4 text-[36px] font-semibold text-[#001726]", className)}
      {...props}
    />
  ),
  h2: ({ className, ...props }: ComponentProps<"h2">) => (
    <h2
      id={getHeadingId(props)}
      className={mergeClassNames(
        "mb-3 mt-8 scroll-mt-40 text-[28px] font-semibold text-[#001726]",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: ComponentProps<"h3">) => (
    <h3
      id={getHeadingId(props)}
      className={mergeClassNames(
        "mb-3 mt-6 scroll-mt-40 text-[22px] font-semibold text-[#001726]",
        className,
      )}
      {...props}
    />
  ),
  p: (props: ComponentProps<"p">) => (
    <p className="mb-4 text-[16px] leading-[28px] text-[#0F172A]" {...props} />
  ),
  ul: (props: ComponentProps<"ul">) => (
    <ul className="mb-4 list-disc pl-6 text-[16px] text-[#0F172A]" {...props} />
  ),
  ol: (props: ComponentProps<"ol">) => (
    <ol className="mb-4 list-decimal pl-6 text-[16px] text-[#0F172A]" {...props} />
  ),
  li: (props: ComponentProps<"li">) => <li className="mb-2" {...props} />,
  blockquote: (props: ComponentProps<"blockquote">) => (
    <blockquote
      className="mb-4 border-l-4 border-[#3397F6] pl-4 text-[16px] italic text-[#1F2937]"
      {...props}
    />
  ),
  table: ({ className, ...props }: TableProps) => (
    <div className="mb-6 w-full overflow-x-auto">
      <table
        className={mergeClassNames(
          "w-full min-w-[640px] border-collapse border border-[#001726]/70 bg-white text-left text-[16px] leading-[24px] text-[#0F172A]",
          className,
        )}
        {...props}
      />
    </div>
  ),
  thead: (props: TableSectionProps) => <thead className="bg-white" {...props} />,
  tbody: (props: TableSectionProps) => <tbody className="bg-white" {...props} />,
  tr: (props: TableRowProps) => <tr className="align-top" {...props} />,
  th: ({ className, ...props }: TableCellProps) => (
    <th
      className={mergeClassNames(
        "border border-[#001726]/70 px-3 py-2 text-[16px] font-semibold leading-[1.35] text-[#001726] md:px-4 md:py-3",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: TableCellProps) => (
    <td
      className={mergeClassNames(
        "border border-[#001726]/70 px-3 py-2 align-top text-[16px] font-medium leading-[1.45] text-[#0F172A] md:px-4 md:py-3",
        className,
      )}
      {...props}
    />
  ),
  a: A,
  Callout,
  Button,
  Card,
  CTACard,
};
