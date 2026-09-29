import { describe, expect, it } from "vitest";
import type { ArticleDoc, BodyImageMap } from "@/feature/content";
import { ApiError } from "@/lib/api/error";
import type { AdminArticle } from "./type";
import {
  bodyFieldErrors,
  canPublish,
  isSlugConflict,
  isVersionConflict,
  toArticleInput,
  toFormValues,
  draftKey,
  imagesMissingAlt,
  parseBodyPath,
  publishChecklist,
  readJson,
  seoPreview,
  shouldOfferRestore,
  writeJson,
  type LocalDraft,
} from "./utils";

const body = (text: string): ArticleDoc => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

describe("local draft", () => {
  const server = { version: 3, updatedAt: "2026-10-28T03:00:00Z", title: "T", body: body("server") };
  const local = (overrides: Partial<LocalDraft> = {}): LocalDraft => ({
    body: body("local"),
    title: "T",
    savedVersion: 3,
    at: Date.parse("2026-10-28T04:00:00Z"),
    ...overrides,
  });

  it("offers restore for a newer local copy of the same version", () => {
    expect(shouldOfferRestore(local(), server)).toBe(true);
  });
  it("does not offer restore for an older copy, an older version, or identical content", () => {
    expect(shouldOfferRestore(local({ at: Date.parse("2026-10-28T02:00:00Z") }), server)).toBe(false);
    expect(shouldOfferRestore(local({ savedVersion: 2 }), server)).toBe(false);
    expect(shouldOfferRestore(local({ body: body("server") }), server)).toBe(false);
    expect(shouldOfferRestore(null, server)).toBe(false);
  });
  it("offers restore for a new article", () => {
    expect(shouldOfferRestore(local({ savedVersion: null }), null)).toBe(true);
  });
  it("round-trips JSON in storage", () => {
    const map = new Map<string, string>();
    const store = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
    writeJson(draftKey("a1"), { x: 1 }, store);
    expect(readJson(draftKey("a1"), store)).toEqual({ x: 1 });
    expect(draftKey(null)).toBe("article-draft:new");
  });
});

describe("parseBodyPath", () => {
  it("parses API error paths", () => {
    expect(parseBodyPath("body")).toEqual([]);
    expect(parseBodyPath("body.content[12]")).toEqual([12]);
    expect(parseBodyPath("body.content[3].content[0]")).toEqual([3, 0]);
    expect(parseBodyPath("body.content[3].attrs.imageId")).toEqual([3]);
    expect(parseBodyPath("title")).toBeNull();
  });
});

describe("publish checklist", () => {
  const images: BodyImageMap = { a: { id: "a", alt: "", width: 1, height: 1, variants: [] } };
  const withImage: ArticleDoc = { type: "doc", content: [{ type: "image", attrs: { imageId: "a" } }] };

  it("requires title, slug, excerpt, category; warns for the rest", () => {
    const items = publishChecklist({ title: "T", slug: "t", excerpt: "", categoryId: null, coverImageId: null, metaDescription: "", body: withImage, images });
    expect(items.filter((i) => !i.ok).map((i) => i.key)).toEqual(["excerpt", "category", "cover", "metaDescription", "imageAlt"]);
    expect(canPublish(items)).toBe(false);
    const ok = publishChecklist({ title: "T", slug: "t", excerpt: "e", categoryId: "c", coverImageId: null, metaDescription: "", body: withImage, images });
    expect(canPublish(ok)).toBe(true);
  });
  it("counts images without alt text", () => {
    expect(imagesMissingAlt(withImage, images)).toBe(1);
    expect(imagesMissingAlt({ type: "doc", content: [{ type: "image", attrs: { imageId: "a", alt: "Override" } }] }, images)).toBe(0);
  });
});

describe("seoPreview", () => {
  it("falls back and flags long values", () => {
    const preview = seoPreview({ metaTitle: "", title: "x".repeat(61), metaDescription: "", excerpt: "short" });
    expect(preview.title.length).toBe(61);
    expect(preview.titleTooLong).toBe(true);
    expect(preview.description).toBe("short");
    expect(preview.descriptionTooLong).toBe(false);
  });
});

describe("form mapping", () => {
  it("maps an article to form values and back", () => {
    const article = {
      title: "T",
      slug: "t",
      excerpt: null,
      coverImage: null,
      coverImageId: "img",
      category: { id: "c", slug: "c", name: "C" },
      categoryId: "c",
      tags: [],
      tagIds: ["x"],
      metaTitle: null,
      metaDescription: "d",
    } as unknown as AdminArticle;
    const values = toFormValues(article);
    expect(values).toEqual({
      title: "T",
      slug: "t",
      excerpt: "",
      coverImageId: "img",
      categoryId: "c",
      tagIds: ["x"],
      metaTitle: "",
      metaDescription: "d",
    });
    const input = toArticleInput({ ...values, title: "  T  " }, body("b"), 4);
    expect(input).toMatchObject({ title: "T", slug: "t", excerpt: null, metaTitle: null, metaDescription: "d", version: 4, bodySchemaVersion: 1 });
    expect("version" in toArticleInput(values, body("b"))).toBe(false);
    expect(toFormValues(null).title).toBe("");
  });
});

describe("error classification", () => {
  const error = (status: number, message: string, fieldErrors: { field: string; message: string }[] = []) =>
    new ApiError({ status, message, fieldErrors });

  it("tells a slug conflict from a version conflict", () => {
    expect(isSlugConflict(error(409, "The slug is already used"))).toBe(true);
    expect(isVersionConflict(error(409, "The slug is already used"))).toBe(false);
    expect(isVersionConflict(error(409, "The article was changed by someone else; reload before saving"))).toBe(true);
    expect(isVersionConflict(error(400, "Bad"))).toBe(false);
  });

  it("picks body errors out of a 400", () => {
    const failed = error(400, "Validation failed", [
      { field: "title", message: "Too long" },
      { field: "body.content[3]", message: "unknown node" },
      { field: "body", message: "Image missing" },
    ]);
    expect(bodyFieldErrors(failed)).toEqual([
      { path: "body.content[3]", message: "unknown node" },
      { path: "body", message: "Image missing" },
    ]);
    expect(bodyFieldErrors(error(409, "x"))).toEqual([]);
  });
});
