import type { ReactNode } from "react";
import type { HeadingLevel } from "../../../article-schema/types";

/** `<h2>`–`<h4>` with an id and a hover `#` link to the section. */
export function Heading({
  level,
  id,
  align,
  anchorLabel,
  children,
}: {
  level: HeadingLevel;
  id: string;
  align?: string;
  anchorLabel: string;
  children: ReactNode;
}) {
  const Tag = `h${level}` as "h2" | "h3" | "h4";
  return (
    <Tag id={id} className={`group scroll-mt-24 ${align ?? ""}`.trim()}>
      {children}
      <a
        href={`#${id}`}
        className="ml-2 font-normal text-muted-foreground no-underline opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={anchorLabel}
      >
        #
      </a>
    </Tag>
  );
}
