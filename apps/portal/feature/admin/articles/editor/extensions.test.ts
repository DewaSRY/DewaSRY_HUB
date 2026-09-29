import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { MARK_SPECS, MARK_TYPES, NODE_SPECS, NODE_TYPES, validateDoc, type ArticleDoc } from "@/feature/content";
import { createArticleExtensions } from "./extensions";
import { positionForPath, sanitizeEditorDoc } from "./utils";

const schema = getSchema(createArticleExtensions());

/** A body that uses every node and mark of the allowlist (ADR-009 §8 kitchen sink). */
const KITCHEN_SINK = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2, textAlign: "center" }, content: [{ type: "text", text: "Why" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "a", marks: [{ type: "bold" }, { type: "italic" }, { type: "underline" }, { type: "strike" }] },
        { type: "text", text: "b", marks: [{ type: "code" }] },
        { type: "hardBreak" },
        { type: "text", text: "c", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
        { type: "text", text: "d", marks: [{ type: "textColor", attrs: { color: "blue" } }, { type: "highlight", attrs: { color: "yellow" } }] },
        { type: "text", text: "e", marks: [{ type: "subscript" }] },
        { type: "text", text: "f", marks: [{ type: "superscript" }] },
      ],
    },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] }] },
    { type: "orderedList", attrs: { start: 3 }, content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "y" }] }] }] },
    { type: "taskList", content: [{ type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "z" }] }] }] },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "q" }] }] },
    { type: "codeBlock", attrs: { language: "typescript" }, content: [{ type: "text", text: "const a = 1;" }] },
    { type: "horizontalRule" },
    { type: "callout", attrs: { tone: "warning" }, content: [{ type: "paragraph", content: [{ type: "text", text: "careful" }] }] },
    {
      type: "details",
      attrs: { open: true },
      content: [
        { type: "detailsSummary", content: [{ type: "text", text: "More" }] },
        { type: "detailsContent", content: [{ type: "paragraph", content: [{ type: "text", text: "hidden" }] }] },
      ],
    },
    { type: "image", attrs: { imageId: "5b2e0000-0000-4000-8000-000000000001", alt: "Diagram", caption: "Arch", width: "wide" } },
    { type: "embed", attrs: { provider: "youtube", id: "dQw4w9WgXcQ", caption: "Talk" } },
    { type: "bookmark", attrs: { url: "https://example.com", title: "Example", description: "An example", siteName: "Ex" } },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", attrs: { colspan: 1, rowspan: 1, colwidth: [120] }, content: [{ type: "paragraph", content: [{ type: "text", text: "H" }] }] },
            { type: "tableHeader", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [{ type: "paragraph", content: [{ type: "text", text: "I" }] }] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", attrs: { colspan: 2, rowspan: 1, colwidth: null }, content: [{ type: "paragraph", content: [{ type: "text", text: "merged" }] }] },
          ],
        },
      ],
    },
  ],
} as unknown as ArticleDoc;

describe("editor schema (ADR-009 §8)", () => {
  it("has exactly the allowlisted node types", () => {
    expect(Object.keys(schema.nodes).sort()).toEqual([...NODE_TYPES].sort());
  });

  it("has exactly the allowlisted mark types", () => {
    expect(Object.keys(schema.marks).sort()).toEqual([...MARK_TYPES].sort());
  });

  it("defines every allowlisted attribute on its node or mark", () => {
    for (const [name, spec] of Object.entries(NODE_SPECS)) {
      const attrs = Object.keys(schema.nodes[name].spec.attrs ?? {});
      for (const attr of Object.keys(spec.attrs)) expect(attrs, `${name}.${attr}`).toContain(attr);
    }
    for (const [name, spec] of Object.entries(MARK_SPECS)) {
      const attrs = Object.keys(schema.marks[name].spec.attrs ?? {});
      for (const attr of Object.keys(spec.attrs)) expect(attrs, `${name}.${attr}`).toContain(attr);
    }
  });

  it("round-trips the kitchen sink into a valid body", () => {
    const node = PMNode.fromJSON(schema, KITCHEN_SINK);
    node.check();
    const out = sanitizeEditorDoc(node.toJSON() as ArticleDoc);
    const result = validateDoc(out, { strictUnknownAttrs: true });
    expect(result.issues).toEqual([]);
    expect(out.content).toHaveLength(KITCHEN_SINK.content.length);
  });

  it("does not allow images, embeds, tables, or code inside table cells", () => {
    const cell = schema.nodes.tableCell;
    expect(cell.contentMatch.matchType(schema.nodes.paragraph)).toBeTruthy();
    expect(cell.contentMatch.matchType(schema.nodes.bulletList)).toBeTruthy();
    for (const name of ["image", "embed", "table", "codeBlock", "bookmark", "callout"]) {
      expect(cell.contentMatch.matchType(schema.nodes[name]), name).toBeFalsy();
    }
  });

  it("maps API error paths to block positions", () => {
    const node = PMNode.fromJSON(schema, KITCHEN_SINK);
    const pos = positionForPath(node, "body.content[2]");
    expect(pos).not.toBeNull();
    expect(node.nodeAt(pos!)?.type.name).toBe("bulletList");
    const nested = positionForPath(node, "body.content[2].content[0]");
    expect(node.nodeAt(nested!)?.type.name).toBe("listItem");
    expect(positionForPath(node, "body.content[99]")).toBeNull();
    expect(positionForPath(node, "body")).toBeNull();
    expect(positionForPath(node, "title")).toBeNull();
  });
});
