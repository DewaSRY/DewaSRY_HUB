import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BLOCK_TYPES,
  MARK_TYPES,
  NODE_TYPES,
  collectImageIds,
  isAllowedHref,
  normalizeDoc,
  validateDoc,
} from "./allowlist";
import type { ArticleDoc } from "./types";

const CONTRACTS = path.resolve(__dirname, "../../../../../contracts/article");
const read = (file: string) => JSON.parse(readFileSync(path.join(CONTRACTS, file), "utf8"));

const kitchenSink = read("kitchen-sink.v1.json") as ArticleDoc;
const manifest = read("invalid/index.json") as {
  fixtures: { file: string; expectedPath: string; reason: string }[];
};

function collectTypes(doc: unknown) {
  const nodes = new Set<string>();
  const marks = new Set<string>();
  const attrs = new Set<string>();
  const walk = (node: unknown) => {
    if (typeof node !== "object" || node === null) return;
    const n = node as { type: string; attrs?: object; marks?: { type: string; attrs?: object }[]; content?: unknown[] };
    nodes.add(n.type);
    for (const key of Object.keys(n.attrs ?? {})) attrs.add(`${n.type}.${key}`);
    for (const mark of n.marks ?? []) {
      marks.add(mark.type);
      for (const key of Object.keys(mark.attrs ?? {})) attrs.add(`${mark.type}.${key}`);
    }
    n.content?.forEach(walk);
  };
  walk(doc);
  return { nodes, marks, attrs };
}

describe("article allowlist", () => {
  it("accepts the kitchen-sink fixture in strict mode", () => {
    const result = validateDoc(kitchenSink, { strictUnknownAttrs: true });
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("the kitchen sink uses every node, mark, and attribute on the allowlist", () => {
    const { nodes, marks, attrs } = collectTypes(kitchenSink);
    expect([...nodes].sort()).toEqual([...NODE_TYPES].sort());
    expect([...marks].sort()).toEqual([...MARK_TYPES].sort());
    for (const expected of [
      "paragraph.textAlign",
      "heading.level",
      "heading.textAlign",
      "orderedList.start",
      "taskItem.checked",
      "codeBlock.language",
      "callout.tone",
      "details.open",
      "image.imageId",
      "image.alt",
      "image.caption",
      "image.width",
      "embed.provider",
      "embed.id",
      "embed.caption",
      "bookmark.url",
      "bookmark.title",
      "bookmark.description",
      "bookmark.siteName",
      "tableCell.colspan",
      "tableCell.rowspan",
      "tableCell.colwidth",
      "tableHeader.colspan",
      "link.href",
      "textColor.color",
      "highlight.color",
    ]) {
      expect(attrs.has(expected), expected).toBe(true);
    }
  });

  it("has a fixture for every invalid case listed in the manifest", () => {
    const files = readdirSync(path.join(CONTRACTS, "invalid")).filter((f) => f !== "index.json");
    expect(files.sort()).toEqual(manifest.fixtures.map((f) => f.file).sort());
  });

  it.each(manifest.fixtures)("rejects $file at $expectedPath", ({ file, expectedPath }) => {
    const result = validateDoc(read(`invalid/${file}`));
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toContain(expectedPath);
  });

  it("normalizes unknown attributes the way the API stores them", () => {
    const input = read("normalize/unknown-attributes.input.json") as ArticleDoc;
    const expected = read("normalize/unknown-attributes.expected.json");
    expect(normalizeDoc(input)).toEqual(expected);
    expect(validateDoc(normalizeDoc(input), { strictUnknownAttrs: true }).ok).toBe(true);
  });

  it("rejects a body over 512 KB", () => {
    const big: ArticleDoc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(530 * 1024) }] }],
    };
    expect(validateDoc(big).issues[0]).toMatchObject({ path: "body" });
  });

  it("collects image ids in document order", () => {
    expect(collectImageIds(kitchenSink)).toEqual([
      "5b2e0c1a-8d3f-4a6b-9c7e-1f2a3b4c5d6e",
      "6c3f1d2b-9e4a-4b7c-8d8f-2a3b4c5d6e7f",
      "7d4a2e3c-0f5b-4c8d-9e9a-3b4c5d6e7f80",
    ]);
  });

  it("only allows safe link targets", () => {
    for (const ok of ["https://a.b", "http://a.b", "mailto:x@y.z", "/blog", "#top"]) {
      expect(isAllowedHref(ok), ok).toBe(true);
    }
    for (const bad of ["javascript:alert(1)", " javascript:alert(1)", "JaVaScRiPt:x", "data:text/html,x", "//evil.com", "/\\evil.com", "vbscript:x", "", "ftp://x"]) {
      expect(isAllowedHref(bad), bad).toBe(false);
    }
  });

  it("keeps block types in sync with node types", () => {
    for (const type of BLOCK_TYPES) expect(NODE_TYPES).toContain(type);
  });
});
