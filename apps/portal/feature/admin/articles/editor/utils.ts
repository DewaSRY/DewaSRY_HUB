import type { Node as PMNode } from "@tiptap/pm/model";
import {
  countWords,
  docToPlainText,
  isCodeLanguage,
  normalizeDoc,
  type ArticleDoc,
  type CodeLanguage,
} from "@/feature/content";
import { parseBodyPath } from "../utils";
import type { ArticleEditorStats } from "./types";

/**
 * Pure helpers for the Tiptap editor. Kept free of editor state so they can
 * be unit tested in Node.
 */

/** Common fence names (```js) mapped onto the §7.4 language list. */
const LANGUAGE_ALIASES: Record<string, CodeLanguage> = {
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  yml: "yaml",
  md: "markdown",
  py: "python",
  kt: "kotlin",
  golang: "go",
  xml: "html",
  svg: "html",
  tf: "hcl",
  terraform: "hcl",
  docker: "dockerfile",
  text: "plaintext",
  txt: "plaintext",
  plain: "plaintext",
};

/** A code block language on the allowlist, or `null` (renders as plain text). */
export function toCodeLanguage(value: unknown): CodeLanguage | null {
  if (typeof value !== "string" || !value) return null;
  const lower = value.trim().toLowerCase();
  if (isCodeLanguage(lower)) return lower;
  return LANGUAGE_ALIASES[lower] ?? null;
}

type LooseNode = { type?: unknown; attrs?: Record<string, unknown>; content?: unknown };

/**
 * `editor.getJSON()` → the body the API stores: `normalizeDoc()` drops
 * attributes that are not on the allowlist (Tiptap adds `link.target`,
 * `orderedList.type`, …), and code block languages are mapped onto the
 * §7.4 list so a ```` ```js ```` fence does not fail validation.
 */
export function sanitizeEditorDoc(doc: ArticleDoc): ArticleDoc {
  const walk = (node: LooseNode): LooseNode => {
    if (!node || typeof node !== "object") return node;
    let next = node;
    if (node.type === "codeBlock" && node.attrs && "language" in node.attrs) {
      const language = toCodeLanguage(node.attrs.language);
      const attrs = { ...node.attrs };
      if (language) attrs.language = language;
      else delete attrs.language;
      next = { ...node, attrs };
      if (!Object.keys(attrs).length) delete next.attrs;
    }
    if (Array.isArray(next.content)) next = { ...next, content: (next.content as LooseNode[]).map(walk) };
    return next;
  };
  return walk(normalizeDoc(doc) as LooseNode) as ArticleDoc;
}

/** Words and characters of the body text (same counting as the API's `word_count`). */
export function docStats(doc: ArticleDoc): ArticleEditorStats {
  const text = docToPlainText(doc);
  return { words: countWords(text), characters: text.replace(/\n/g, "").length };
}

/**
 * Pasted HTML that carries images (from another site, a doc, a mail). Those
 * images are never hotlinked (ADR-009 §5.4): the schema drops them and the
 * editor tells the admin to upload them first.
 */
export function htmlHasImages(html: string | null | undefined): boolean {
  if (!html) return false;
  return /<(img|picture)\b/i.test(html) || /<image\b/i.test(html);
}

/** The pasted text when it is exactly one `http(s)` URL, else `null`. */
export function singleUrl(text: string | null | undefined): string | null {
  const value = text?.trim();
  if (!value || /\s/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Adds `https://` to a bare domain typed into the link dialog (`example.com/x`). */
export function withProtocol(input: string): string {
  const value = input.trim();
  if (!value) return value;
  if (/^(https?:|mailto:|\/|#)/i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(value)) return `https://${value}`;
  return value;
}

export interface CommandMatch {
  id: string;
  label: string;
  keywords: readonly string[];
}

/**
 * Slash menu filter: every word of the query must prefix the label or a
 * keyword. Label matches rank before keyword-only matches.
 */
export function filterCommands<T extends CommandMatch>(items: readonly T[], query: string): T[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...items];
  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const label = item.label.toLowerCase();
    const labelWords = label.split(/[\s/]+/);
    const haystack = [...labelWords, ...item.keywords.map((keyword) => keyword.toLowerCase()), item.id.toLowerCase()];
    if (!words.every((word) => haystack.some((entry) => entry.startsWith(word)) || label.includes(word))) continue;
    const labelHit = words.every((word) => labelWords.some((entry) => entry.startsWith(word)));
    scored.push({ item, score: labelHit ? 0 : 1 });
  }
  return scored.sort((a, b) => a.score - b.score).map((entry) => entry.item);
}

/**
 * ProseMirror position of the block an API error path points at
 * (`body.content[12].content[0]`), or `null` when the path does not resolve.
 */
export function positionForPath(doc: PMNode, path: string): number | null {
  const indices = parseBodyPath(path);
  if (!indices || !indices.length) return null;
  let node = doc;
  let pos = 0;
  for (let depth = 0; depth < indices.length; depth++) {
    const index = indices[depth];
    if (index >= node.childCount) return null;
    for (let i = 0; i < index; i++) pos += node.child(i).nodeSize;
    const child = node.child(index);
    if (depth === indices.length - 1) return pos;
    if (child.isLeaf) return pos;
    // Step inside the child: its content starts one token after its start.
    pos += 1;
    node = child;
  }
  return pos;
}
