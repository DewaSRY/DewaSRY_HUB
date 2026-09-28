import { describe, expect, it } from "vitest";
import type { ArticleDoc } from "../article-schema/types";
import { planInArticleSlots, inArticleSlotId } from "./ad-slots";
import { HeadingIdAllocator, slugifyHeading } from "./heading-id";
import { readingMinutes } from "./reading-time";
import { countWords, docToPlainText, excerptFromDoc } from "./text";
import { buildToc, headingIds } from "./toc";

const p = (text: string) => ({ type: "paragraph" as const, content: [{ type: "text" as const, text }] });
const h = (level: 2 | 3 | 4, text: string) => ({
  type: "heading" as const,
  attrs: { level },
  content: [{ type: "text" as const, text }],
});

describe("heading ids", () => {
  it("slugifies text", () => {
    expect(slugifyHeading("Why Graviton?")).toBe("why-graviton");
    expect(slugifyHeading("  Árvore — é  ótima! ")).toBe("arvore-e-otima");
    expect(slugifyHeading("!!!")).toBe("section");
  });

  it("adds -2, -3 for duplicates and never collides", () => {
    const ids = new HeadingIdAllocator();
    expect(ids.next("Setup")).toBe("setup");
    expect(ids.next("Setup")).toBe("setup-2");
    expect(ids.next("Setup 2")).toBe("setup-2-2");
    expect(ids.next("Setup")).toBe("setup-3");
  });
});

describe("table of contents", () => {
  const doc: ArticleDoc = {
    type: "doc",
    content: [h(2, "Intro"), p("a"), h(3, "Details"), h(4, "Deep"), h(2, "Intro"), p("b")],
  };

  it("uses H2 and H3 only, with the same ids as the renderer", () => {
    expect(buildToc(doc)).toEqual([
      { id: "intro", text: "Intro", level: 2 },
      { id: "details", text: "Details", level: 3 },
      { id: "intro-2", text: "Intro", level: 2 },
    ]);
    expect([...headingIds(doc).values()]).toEqual(["intro", "details", "deep", "intro-2"]);
  });

  it("is empty with fewer than 3 headings", () => {
    expect(buildToc({ type: "doc", content: [h(2, "A"), h(3, "B"), p("c")] })).toEqual([]);
  });
});

describe("ad slot placement", () => {
  const blocks = (types: string[]) => types.map((type) => ({ type })) as { type: never }[];

  it("needs at least 8 top-level blocks", () => {
    expect(planInArticleSlots(blocks(Array(7).fill("paragraph")))).toEqual([]);
    expect(planInArticleSlots(blocks(Array(8).fill("paragraph")))).toEqual([2]);
  });

  it("adds one slot every 10 more blocks, at most 3 in total", () => {
    expect(planInArticleSlots(blocks(Array(40).fill("paragraph")))).toEqual([2, 12, 22]);
    expect(planInArticleSlots(blocks(Array(14).fill("paragraph")))).toEqual([2, 12]);
  });

  it("never splits a heading from the block after it", () => {
    const types = ["paragraph", "paragraph", "heading", "paragraph", "paragraph", "paragraph", "paragraph", "paragraph"];
    expect(planInArticleSlots(blocks(types))).toEqual([3]);
  });

  it("moves down past consecutive headings and never goes last", () => {
    const types = ["paragraph", "paragraph", "heading", "heading", "paragraph", "paragraph", "paragraph", "heading"];
    expect(planInArticleSlots(blocks(types))).toEqual([4]);
    const tail = ["p", "p", "heading", "heading", "heading", "heading", "heading", "p"].map((t) => (t === "p" ? "paragraph" : t));
    expect(planInArticleSlots(blocks(tail))).toEqual([]);
  });

  it("names slots in-article-1, in-article-2, …", () => {
    expect([0, 1, 2].map(inArticleSlotId)).toEqual(["in-article-1", "in-article-2", "in-article-3"]);
  });
});

describe("text helpers", () => {
  const doc: ArticleDoc = { type: "doc", content: [h(2, "Title"), p("One two three."), { type: "image", attrs: { imageId: "x" } }] };

  it("joins blocks with newlines and ignores images", () => {
    expect(docToPlainText(doc)).toBe("Title\nOne two three.");
    expect(countWords(docToPlainText(doc))).toBe(4);
  });

  it("cuts excerpts on a word boundary", () => {
    const long: ArticleDoc = { type: "doc", content: [p("word ".repeat(100))] };
    const excerpt = excerptFromDoc(long, 50);
    expect(excerpt.length).toBeLessThanOrEqual(50);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("computes reading time", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(200)).toBe(1);
    expect(readingMinutes(201)).toBe(2);
  });
});
