import { describe, expect, it } from "vitest";
import type { ArticleDoc } from "@/feature/content";
import { docStats, filterCommands, htmlHasImages, sanitizeEditorDoc, singleUrl, toCodeLanguage, withProtocol } from "./utils";
import { formatShortcut } from "./menus/toolbar-button";

describe("toCodeLanguage", () => {
  it("keeps allowlisted languages and maps common aliases", () => {
    expect(toCodeLanguage("typescript")).toBe("typescript");
    expect(toCodeLanguage("TS")).toBe("typescript");
    expect(toCodeLanguage("sh")).toBe("bash");
    expect(toCodeLanguage("tf")).toBe("hcl");
    expect(toCodeLanguage("xml")).toBe("html");
  });

  it("drops unknown languages", () => {
    expect(toCodeLanguage("cobol")).toBeNull();
    expect(toCodeLanguage("")).toBeNull();
    expect(toCodeLanguage(null)).toBeNull();
  });
});

describe("sanitizeEditorDoc", () => {
  it("drops Tiptap-only attributes and fixes code languages", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "orderedList", attrs: { start: 1, type: null }, content: [{ type: "listItem", content: [{ type: "paragraph" }] }] },
        { type: "codeBlock", attrs: { language: "js" }, content: [{ type: "text", text: "x" }] },
        { type: "codeBlock", attrs: { language: "cobol" }, content: [{ type: "text", text: "y" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "l", marks: [{ type: "link", attrs: { href: "https://a.b", target: "_blank", rel: "x", class: null } }] }],
        },
      ],
    } as unknown as ArticleDoc;
    expect(sanitizeEditorDoc(doc)).toEqual({
      type: "doc",
      content: [
        { type: "orderedList", attrs: { start: 1 }, content: [{ type: "listItem", content: [{ type: "paragraph" }] }] },
        { type: "codeBlock", attrs: { language: "javascript" }, content: [{ type: "text", text: "x" }] },
        { type: "codeBlock", content: [{ type: "text", text: "y" }] },
        { type: "paragraph", content: [{ type: "text", text: "l", marks: [{ type: "link", attrs: { href: "https://a.b" } }] }] },
      ],
    });
  });
});

describe("docStats", () => {
  it("counts words like the API", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Two words" }] },
        { type: "paragraph", content: [{ type: "text", text: "and three more" }] },
      ],
    } as ArticleDoc;
    expect(docStats(doc).words).toBe(5);
    expect(docStats({ type: "doc", content: [] }).words).toBe(0);
  });
});

describe("paste helpers", () => {
  it("detects images in pasted HTML", () => {
    expect(htmlHasImages('<p>x</p><img src="https://evil/x.png">')).toBe(true);
    expect(htmlHasImages("<PICTURE><source></PICTURE>")).toBe(true);
    expect(htmlHasImages("<p>plain</p>")).toBe(false);
    expect(htmlHasImages("")).toBe(false);
  });

  it("recognises a single pasted URL", () => {
    expect(singleUrl(" https://youtu.be/dQw4w9WgXcQ ")).toBe("https://youtu.be/dQw4w9WgXcQ");
    expect(singleUrl("see https://a.b")).toBeNull();
    expect(singleUrl("javascript:alert(1)")).toBeNull();
    expect(singleUrl("")).toBeNull();
  });

  it("adds https to bare domains only", () => {
    expect(withProtocol("example.com/x")).toBe("https://example.com/x");
    expect(withProtocol("/blog/post")).toBe("/blog/post");
    expect(withProtocol("#setup")).toBe("#setup");
    expect(withProtocol("mailto:a@b.c")).toBe("mailto:a@b.c");
    expect(withProtocol("not a url")).toBe("not a url");
  });
});

describe("filterCommands", () => {
  const items = [
    { id: "heading2", label: "Heading 2", keywords: ["h2", "title"] },
    { id: "table", label: "Table", keywords: ["grid"] },
    { id: "bulletList", label: "Bullet list", keywords: ["ul", "list"] },
  ];

  it("returns everything for an empty query", () => {
    expect(filterCommands(items, "")).toHaveLength(3);
  });

  it("matches label and keyword prefixes, labels first", () => {
    expect(filterCommands(items, "tab").map((item) => item.id)).toEqual(["table"]);
    expect(filterCommands(items, "h2").map((item) => item.id)).toEqual(["heading2"]);
    expect(filterCommands(items, "list").map((item) => item.id)).toEqual(["bulletList"]);
    expect(filterCommands(items, "title").map((item) => item.id)).toEqual(["heading2"]);
    expect(filterCommands(items, "zzz")).toEqual([]);
  });
});

describe("formatShortcut", () => {
  it("formats for macOS and others", () => {
    expect(formatShortcut("Mod-Shift-s", true)).toBe("⌘⇧S");
    expect(formatShortcut("Mod-k", false)).toBe("Ctrl+K");
  });
});
