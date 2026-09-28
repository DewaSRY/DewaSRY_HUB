import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { isAllowedHref, isMarkType } from "../../article-schema/allowlist";
import { isPaletteKey } from "../../article-schema/palette";
import type { RenderContext } from "./context";

type RawMark = { type?: unknown; attrs?: Record<string, unknown> };

/** Order marks are nested in (outermost first), so output is stable. */
const MARK_ORDER = [
  "link",
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "textColor",
  "highlight",
  "subscript",
  "superscript",
] as const;

function wrap(mark: RawMark, child: ReactNode, key: string, ctx: RenderContext, path: string): ReactNode {
  const attrs = mark.attrs ?? {};
  switch (mark.type) {
    case "bold":
      return <strong key={key}>{child}</strong>;
    case "italic":
      return <em key={key}>{child}</em>;
    case "underline":
      return <u key={key}>{child}</u>;
    case "strike":
      return <s key={key}>{child}</s>;
    case "code":
      return <code key={key}>{child}</code>;
    case "subscript":
      return <sub key={key}>{child}</sub>;
    case "superscript":
      return <sup key={key}>{child}</sup>;
    case "textColor":
      if (!isPaletteKey(attrs.color)) {
        ctx.skip(path, "textColor with an invalid colour");
        return child;
      }
      return (
        <span key={key} className="content-color" data-color={attrs.color}>
          {child}
        </span>
      );
    case "highlight":
      if (!isPaletteKey(attrs.color)) {
        ctx.skip(path, "highlight with an invalid colour");
        return child;
      }
      return (
        <mark key={key} className="content-highlight" data-color={attrs.color}>
          {child}
        </mark>
      );
    case "link": {
      const href = attrs.href;
      if (!isAllowedHref(href)) {
        ctx.skip(path, "link with a disallowed href");
        return child;
      }
      if (href.startsWith("#")) {
        return (
          <a key={key} href={href}>
            {child}
          </a>
        );
      }
      if (href.startsWith("/")) {
        // Site paths use the locale-aware Link (ADR-008).
        return (
          <Link key={key} href={href}>
            {child}
          </Link>
        );
      }
      if (href.startsWith("mailto:")) {
        return (
          <a key={key} href={href}>
            {child}
          </a>
        );
      }
      return (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer">
          {child}
          <span className="sr-only"> {ctx.labels.opensInNewTab}</span>
        </a>
      );
    }
    default:
      ctx.skip(path, `unknown mark ${String(mark.type)}`);
      return child;
  }
}

/** Wraps a text run in its marks. Unknown or invalid marks are skipped (the text stays). */
export function renderMarks(
  text: string,
  marks: unknown,
  key: string,
  ctx: RenderContext,
  path: string,
): ReactNode {
  if (!Array.isArray(marks) || marks.length === 0) return text;
  const known = marks
    .map((mark, index) => ({ mark: mark as RawMark, index }))
    .sort((a, b) => {
      const ai = isMarkType(a.mark?.type) ? MARK_ORDER.indexOf(a.mark.type as never) : 99;
      const bi = isMarkType(b.mark?.type) ? MARK_ORDER.indexOf(b.mark.type as never) : 99;
      return bi - ai; // innermost first, so the outermost wrap is applied last
    });
  let node: ReactNode = text;
  for (const { mark, index } of known) {
    node = wrap(mark ?? {}, node, `${key}-m${index}`, ctx, `${path}.marks[${index}]`);
  }
  return node;
}
