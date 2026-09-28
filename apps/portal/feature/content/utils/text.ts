import type { ArticleDoc } from "../article-schema/types";

type Loose = { type?: unknown; text?: unknown; content?: unknown };

/** Plain text of an inline subtree (used for heading ids, TOC labels, alt fallbacks). */
export function inlineText(node: unknown): string {
  if (typeof node !== "object" || node === null) return "";
  const loose = node as Loose;
  if (loose.type === "text" && typeof loose.text === "string") return loose.text;
  if (loose.type === "hardBreak") return " ";
  if (Array.isArray(loose.content)) return loose.content.map(inlineText).join("");
  return "";
}

/** Nodes whose inline children form one line of `body_text`. */
const TEXT_BLOCKS = new Set(["paragraph", "heading", "codeBlock", "detailsSummary"]);

/**
 * Mirrors the API's `body_text` (ADR-009 §4.4): all text joined, blocks
 * separated by newlines, no image or embed data.
 */
export function docToPlainText(doc: ArticleDoc | null | undefined): string {
  const lines: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node !== "object" || node === null) return;
    const loose = node as Loose;
    if (typeof loose.type === "string" && TEXT_BLOCKS.has(loose.type)) {
      const text = inlineText(node).trim();
      if (text) lines.push(text);
      return;
    }
    if (Array.isArray(loose.content)) loose.content.forEach(walk);
  };
  walk(doc);
  return lines.join("\n");
}

export function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

/** First `max` characters of the body text, cut on a word boundary. */
export function excerptFromDoc(doc: ArticleDoc | null | undefined, max = 160): string {
  const text = docToPlainText(doc).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
