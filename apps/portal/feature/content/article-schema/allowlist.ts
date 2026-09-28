import { isCodeLanguage } from "./languages";
import { isEmbedProvider, isValidEmbedId } from "./embed-providers";
import { isPaletteKey } from "./palette";
import type { ArticleDoc, MarkType, NodeType } from "./types";

/**
 * The single source of truth for the body format (ADR-009 §4.2). The editor
 * extension list, the API validator, and the public renderer must all match
 * it; `contracts/article/*.json` tests all three.
 *
 * - `validateDoc()` mirrors the API: unknown nodes/marks, bad attribute
 *   values, and limit breaches are errors (`400 VALIDATION_FAILED`,
 *   `field: "body"` or `body.content[12]`).
 * - `normalizeDoc()` drops attributes that are not on the allowlist (Tiptap
 *   adds some of its own, e.g. `link.target`), which the API would drop too.
 */

export const LIMITS = {
  maxJsonBytes: 512 * 1024,
  maxDepth: 20,
  maxImages: 100,
  maxTableColumns: 20,
  maxTableRows: 200,
  maxSpan: 20,
  maxImageAlt: 250,
  maxImageCaption: 300,
  maxEmbedCaption: 300,
  maxBookmarkText: 500,
} as const;

type ContentKind = "block" | "inline" | "cell-block" | "none" | "text-only" | NodeType[];

type AttrCheck = (value: unknown) => boolean;

interface NodeSpec {
  /** Allowed attributes and their value check. Absent/`null` is always allowed unless `required`. */
  attrs: Record<string, AttrCheck>;
  required?: string[];
  content: ContentKind;
  /** Whether the node must have at least one child. */
  nonEmpty?: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const oneOf =
  (...values: unknown[]): AttrCheck =>
  (value) =>
    values.includes(value);
const isBool: AttrCheck = (value) => typeof value === "boolean";
const maxText =
  (max: number): AttrCheck =>
  (value) =>
    typeof value === "string" && value.length <= max;
const isSpan: AttrCheck = (value) =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= LIMITS.maxSpan;
const isColwidth: AttrCheck = (value) =>
  Array.isArray(value) &&
  value.length <= LIMITS.maxSpan &&
  value.every((width) => Number.isInteger(width) && width > 0 && width <= 4000);

export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Link `href`: `https:`, `http:`, `mailto:`, or a site path starting with `/`
 * or `#` (ADR-009 §4.2). Protocol-relative `//host` is rejected.
 */
export function isAllowedHref(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > 2048) return false;
  // eslint-disable-next-line no-control-regex -- rejecting control characters is the point.
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;
  if (value.startsWith("#")) return true;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

const textAlign = oneOf("left", "center", "right");

export const NODE_SPECS: Record<NodeType, NodeSpec> = {
  doc: { attrs: {}, content: "block" },
  text: { attrs: {}, content: "none" },
  hardBreak: { attrs: {}, content: "none" },
  paragraph: { attrs: { textAlign }, content: "inline" },
  heading: {
    attrs: { level: oneOf(2, 3, 4), textAlign },
    required: ["level"],
    content: "inline",
  },
  bulletList: { attrs: {}, content: ["listItem"], nonEmpty: true },
  orderedList: {
    attrs: { start: (value) => Number.isInteger(value) && (value as number) >= 1 },
    content: ["listItem"],
    nonEmpty: true,
  },
  listItem: { attrs: {}, content: "block", nonEmpty: true },
  taskList: { attrs: {}, content: ["taskItem"], nonEmpty: true },
  taskItem: { attrs: { checked: isBool }, content: "block", nonEmpty: true },
  blockquote: { attrs: {}, content: "block", nonEmpty: true },
  codeBlock: {
    attrs: { language: (value) => isCodeLanguage(value) },
    content: "text-only",
  },
  horizontalRule: { attrs: {}, content: "none" },
  callout: {
    attrs: { tone: oneOf("info", "tip", "warning", "danger") },
    required: ["tone"],
    content: "block",
    nonEmpty: true,
  },
  details: {
    attrs: { open: isBool },
    content: ["detailsSummary", "detailsContent"],
    nonEmpty: true,
  },
  detailsSummary: { attrs: {}, content: "inline" },
  detailsContent: { attrs: {}, content: "block", nonEmpty: true },
  image: {
    attrs: {
      imageId: (value) => typeof value === "string" && UUID.test(value),
      alt: maxText(LIMITS.maxImageAlt),
      caption: maxText(LIMITS.maxImageCaption),
      width: oneOf("content", "wide", "full"),
    },
    required: ["imageId"],
    content: "none",
  },
  embed: {
    // `id` is checked against the provider's pattern in `checkNode`.
    attrs: {
      provider: (value) => isEmbedProvider(value),
      id: (value) => typeof value === "string" && value.length <= 64,
      caption: maxText(LIMITS.maxEmbedCaption),
    },
    required: ["provider", "id"],
    content: "none",
  },
  bookmark: {
    attrs: {
      url: isHttpsUrl,
      title: maxText(LIMITS.maxBookmarkText),
      description: maxText(LIMITS.maxBookmarkText),
      siteName: maxText(200),
    },
    required: ["url"],
    content: "none",
  },
  table: { attrs: {}, content: ["tableRow"], nonEmpty: true },
  tableRow: { attrs: {}, content: ["tableCell", "tableHeader"], nonEmpty: true },
  tableCell: {
    attrs: { colspan: isSpan, rowspan: isSpan, colwidth: isColwidth },
    content: "cell-block",
    nonEmpty: true,
  },
  tableHeader: {
    attrs: { colspan: isSpan, rowspan: isSpan, colwidth: isColwidth },
    content: "cell-block",
    nonEmpty: true,
  },
};

export const BLOCK_TYPES = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "callout",
  "details",
  "image",
  "embed",
  "bookmark",
  "table",
] as const satisfies readonly NodeType[];

export const INLINE_TYPES = ["text", "hardBreak"] as const satisfies readonly NodeType[];

/** Blocks allowed inside table cells: text and lists only (ADR-009 §5.6). */
export const CELL_BLOCK_TYPES = [
  "paragraph",
  "bulletList",
  "orderedList",
  "taskList",
] as const satisfies readonly NodeType[];

export const NODE_TYPES = Object.keys(NODE_SPECS) as NodeType[];

interface MarkSpec {
  attrs: Record<string, AttrCheck>;
  required?: string[];
}

export const MARK_SPECS: Record<MarkType, MarkSpec> = {
  bold: { attrs: {} },
  italic: { attrs: {} },
  underline: { attrs: {} },
  strike: { attrs: {} },
  code: { attrs: {} },
  subscript: { attrs: {} },
  superscript: { attrs: {} },
  link: { attrs: { href: isAllowedHref }, required: ["href"] },
  textColor: { attrs: { color: isPaletteKey }, required: ["color"] },
  highlight: { attrs: { color: isPaletteKey }, required: ["color"] },
};

export const MARK_TYPES = Object.keys(MARK_SPECS) as MarkType[];

export function isNodeType(value: unknown): value is NodeType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(NODE_SPECS, value);
}

export function isMarkType(value: unknown): value is MarkType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(MARK_SPECS, value);
}

export interface DocIssue {
  /** API-style path: `body`, `body.content[3]`, `body.content[3].marks[0]`. */
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: DocIssue[];
  stats: { images: number; depth: number; bytes: number; blocks: number };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function childKindAllows(kind: ContentKind, childType: NodeType): boolean {
  if (kind === "none") return false;
  if (kind === "block") return (BLOCK_TYPES as readonly string[]).includes(childType);
  if (kind === "inline") return (INLINE_TYPES as readonly string[]).includes(childType);
  if (kind === "cell-block") return (CELL_BLOCK_TYPES as readonly string[]).includes(childType);
  if (kind === "text-only") return childType === "text";
  return kind.includes(childType);
}

function checkAttrs(
  attrs: unknown,
  spec: { attrs: Record<string, AttrCheck>; required?: string[] },
  path: string,
  issues: DocIssue[],
  strictUnknown: boolean,
) {
  if (attrs !== undefined && attrs !== null && !isRecord(attrs)) {
    issues.push({ path: `${path}.attrs`, message: "attrs must be an object" });
    return;
  }
  const record = (attrs ?? {}) as Record<string, unknown>;
  for (const name of spec.required ?? []) {
    if (record[name] === undefined || record[name] === null) {
      issues.push({ path: `${path}.attrs.${name}`, message: `${name} is required` });
    }
  }
  for (const [name, value] of Object.entries(record)) {
    const check = spec.attrs[name];
    if (!check) {
      if (strictUnknown) issues.push({ path: `${path}.attrs.${name}`, message: `unknown attribute ${name}` });
      continue;
    }
    if (value === null || value === undefined) continue;
    if (!check(value)) issues.push({ path: `${path}.attrs.${name}`, message: `invalid value for ${name}` });
  }
}

function tableColumns(row: Record<string, unknown>): number {
  const cells = Array.isArray(row.content) ? row.content : [];
  return cells.reduce<number>((sum, cell) => {
    const span = isRecord(cell) && isRecord(cell.attrs) ? cell.attrs.colspan : 1;
    return sum + (Number.isInteger(span) ? (span as number) : 1);
  }, 0);
}

/**
 * Validates a body against the allowlist and limits. `strictUnknownAttrs`
 * treats attributes that are not on the allowlist as errors (the contract
 * fixtures use it); by default they are ignored, as the API drops them.
 */
export function validateDoc(
  doc: unknown,
  options: { strictUnknownAttrs?: boolean } = {},
): ValidationResult {
  const issues: DocIssue[] = [];
  const stats = { images: 0, depth: 0, bytes: 0, blocks: 0 };
  const strict = options.strictUnknownAttrs ?? false;

  try {
    stats.bytes = new TextEncoder().encode(JSON.stringify(doc) ?? "").length;
  } catch {
    issues.push({ path: "body", message: "body is not serialisable" });
    return { ok: false, issues, stats };
  }
  if (stats.bytes > LIMITS.maxJsonBytes) {
    issues.push({ path: "body", message: `body is larger than ${LIMITS.maxJsonBytes} bytes` });
  }
  if (!isRecord(doc) || doc.type !== "doc") {
    issues.push({ path: "body", message: "body must be a doc node" });
    return { ok: false, issues, stats };
  }
  stats.blocks = Array.isArray(doc.content) ? doc.content.length : 0;

  const visit = (node: unknown, path: string, depth: number, parentKind: ContentKind | null) => {
    stats.depth = Math.max(stats.depth, depth);
    if (depth > LIMITS.maxDepth) {
      issues.push({ path, message: `nesting deeper than ${LIMITS.maxDepth}` });
      return;
    }
    if (!isRecord(node)) {
      issues.push({ path, message: "node must be an object" });
      return;
    }
    const type = node.type;
    if (!isNodeType(type)) {
      issues.push({ path, message: `unknown node type ${String(type)}` });
      return;
    }
    if (parentKind && !childKindAllows(parentKind, type)) {
      issues.push({ path, message: `${type} is not allowed here` });
      return;
    }
    const spec = NODE_SPECS[type];
    checkAttrs(node.attrs, spec, path, issues, strict);

    if (type === "text") {
      if (typeof node.text !== "string" || node.text.length === 0) {
        issues.push({ path, message: "text must be a non-empty string" });
      }
      if (node.marks !== undefined) {
        if (!Array.isArray(node.marks)) {
          issues.push({ path: `${path}.marks`, message: "marks must be an array" });
        } else {
          if (parentKind === "text-only" && node.marks.length > 0) {
            issues.push({ path: `${path}.marks`, message: "code blocks cannot contain marks" });
          }
          node.marks.forEach((mark, index) => {
            const markPath = `${path}.marks[${index}]`;
            if (!isRecord(mark) || !isMarkType(mark.type)) {
              issues.push({
                path: markPath,
                message: `unknown mark type ${String(isRecord(mark) ? mark.type : mark)}`,
              });
              return;
            }
            checkAttrs(mark.attrs, MARK_SPECS[mark.type], markPath, issues, strict);
          });
        }
      }
      return;
    }

    if (type === "image") stats.images += 1;
    if (type === "embed" && isRecord(node.attrs) && isEmbedProvider(node.attrs.provider)) {
      if (!isValidEmbedId(node.attrs.provider, node.attrs.id)) {
        issues.push({ path: `${path}.attrs.id`, message: `invalid ${node.attrs.provider} id` });
      }
    }
    if (type === "table" && Array.isArray(node.content)) {
      if (node.content.length > LIMITS.maxTableRows) {
        issues.push({ path, message: `table has more than ${LIMITS.maxTableRows} rows` });
      }
      const widest = node.content.reduce<number>(
        (max, row) => (isRecord(row) ? Math.max(max, tableColumns(row)) : max),
        0,
      );
      if (widest > LIMITS.maxTableColumns) {
        issues.push({ path, message: `table has more than ${LIMITS.maxTableColumns} columns` });
      }
    }

    const content = node.content;
    if (content === undefined || content === null) {
      if (spec.nonEmpty) issues.push({ path: `${path}.content`, message: `${type} needs content` });
      return;
    }
    if (!Array.isArray(content)) {
      issues.push({ path: `${path}.content`, message: "content must be an array" });
      return;
    }
    if (spec.content === "none" && content.length > 0) {
      issues.push({ path: `${path}.content`, message: `${type} cannot have content` });
      return;
    }
    if (spec.nonEmpty && content.length === 0) {
      issues.push({ path: `${path}.content`, message: `${type} needs content` });
    }
    content.forEach((child, index) =>
      visit(child, `${path}.content[${index}]`, depth + 1, spec.content),
    );
  };

  const docContent = doc.content;
  if (docContent !== undefined && !Array.isArray(docContent)) {
    issues.push({ path: "body.content", message: "content must be an array" });
  } else {
    stats.depth = 1;
    (docContent ?? []).forEach((child, index) =>
      visit(child, `body.content[${index}]`, 2, "block"),
    );
  }

  if (stats.images > LIMITS.maxImages) {
    issues.push({ path: "body", message: `more than ${LIMITS.maxImages} images` });
  }
  return { ok: issues.length === 0, issues, stats };
}

function normalizeAttrs(
  attrs: unknown,
  allowed: Record<string, AttrCheck>,
): Record<string, unknown> | undefined {
  if (!isRecord(attrs)) return undefined;
  const result: Record<string, unknown> = {};
  for (const name of Object.keys(allowed)) {
    const value = attrs[name];
    if (value !== undefined && value !== null) result[name] = value;
  }
  return Object.keys(result).length ? result : undefined;
}

/**
 * Returns a copy of the body with only allowlisted attributes, no `null`
 * attributes, and no empty `marks`/`attrs` — the shape the API stores.
 * Unknown nodes and marks are kept so `validateDoc()` can report them.
 */
export function normalizeDoc(doc: ArticleDoc): ArticleDoc {
  const walk = (node: unknown): unknown => {
    if (!isRecord(node)) return node;
    const type = node.type;
    if (!isNodeType(type)) return node;
    const spec = NODE_SPECS[type];
    const out: Record<string, unknown> = { type };
    const attrs = normalizeAttrs(node.attrs, spec.attrs);
    if (attrs) out.attrs = attrs;
    if (type === "text") {
      out.text = node.text;
      if (Array.isArray(node.marks) && node.marks.length) {
        out.marks = node.marks.map((mark) => {
          if (!isRecord(mark) || !isMarkType(mark.type)) return mark;
          const markAttrs = normalizeAttrs(mark.attrs, MARK_SPECS[mark.type].attrs);
          return markAttrs ? { type: mark.type, attrs: markAttrs } : { type: mark.type };
        });
      }
      return out;
    }
    if (Array.isArray(node.content) && spec.content !== "none") {
      out.content = node.content.map(walk);
    }
    return out;
  };
  return walk(doc) as ArticleDoc;
}

/** All `image.imageId` values in document order (rebuilds `article_body_images`). */
export function collectImageIds(doc: ArticleDoc | null | undefined): string[] {
  const ids: string[] = [];
  const walk = (node: unknown) => {
    if (!isRecord(node)) return;
    if (node.type === "image" && isRecord(node.attrs) && typeof node.attrs.imageId === "string") {
      ids.push(node.attrs.imageId);
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(doc);
  return ids;
}
