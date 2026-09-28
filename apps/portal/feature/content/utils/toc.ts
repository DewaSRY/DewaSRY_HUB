import type { ArticleDoc } from "../article-schema/types";
import { HeadingIdAllocator } from "./heading-id";
import { inlineText } from "./text";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export const TOC_MIN_HEADINGS = 3;

/**
 * Heading ids for every top-level heading (H2–H4), in document order. The
 * renderer and the TOC both use this, so they always agree.
 */
export function headingIds(doc: ArticleDoc | null | undefined): Map<number, string> {
  const allocator = new HeadingIdAllocator();
  const ids = new Map<number, string>();
  (doc?.content ?? []).forEach((node, index) => {
    if (node?.type === "heading") ids.set(index, allocator.next(inlineText(node)));
  });
  return ids;
}

/**
 * Table of contents from the body's H2 and H3 (ADR-009 §7.2). Returns an
 * empty list when there are fewer than `TOC_MIN_HEADINGS`.
 */
export function buildToc(doc: ArticleDoc | null | undefined): TocItem[] {
  const ids = headingIds(doc);
  const items: TocItem[] = [];
  (doc?.content ?? []).forEach((node, index) => {
    if (node?.type !== "heading") return;
    const level = (node.attrs as { level?: unknown } | undefined)?.level;
    if (level !== 2 && level !== 3) return;
    const text = inlineText(node).trim();
    const id = ids.get(index);
    if (text && id) items.push({ id, text, level });
  });
  return items.length >= TOC_MIN_HEADINGS ? items : [];
}
