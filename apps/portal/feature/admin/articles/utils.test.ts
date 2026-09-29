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
  splitTranslationField,
  isSettingsField,
  writeJson,
  type LocalDraft,
} from "./utils";

const body = (text: string): ArticleDoc => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const serverTranslation = (text: string) => ({
  locale: "id" as const,
  title: "T",
  excerpt: null,
  body: body(text),
  bodySchemaVersion: 1,
  metaTitle: null,
  metaDescription: null,
  wordCount: 1,
  readingMinutes: 1,
  updatedAt: "2026-10-28T03:00:00Z",
});

describe("local draft", () => {
  const server = { version: 3, updatedAt: "2026-10-28T03:00:00Z", translations: { id: serverTranslation("server") } };
  const local = (overrides: Partial<LocalDraft> = {}): LocalDraft => ({
    translations: { id: { title: "T", body: body("local") } },
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
    expect(shouldOfferRestore(local({ translations: { id: { title: "T", body: body("server") } } }), server)).toBe(false);
    expect(shouldOfferRestore(null, server)).toBe(false);
  });
  it("offers restore when only another language changed", () => {
    expect(shouldOfferRestore(local({ translations: { id: { title: "T", body: body("server") }, en: { title: "E", body: body("x") } } }), server)).toBe(true);
  });
  it("ignores a copy in the old one-language shape", () => {
    const legacy = { body: body("local"), title: "T", savedVersion: 3, at: Date.parse("2026-10-28T04:00:00Z") } as unknown as LocalDraft;
    expect(shouldOfferRestore(legacy, server)).toBe(false);
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

  const indonesian = (excerpt: string) => ({ locale: "id" as const, title: "T", excerpt, metaDescription: "", body: withImage });

  it("requires slug, category, and a title and excerpt per language; warns for the rest", () => {
    const items = publishChecklist({ slug: "t", categoryId: null, coverImageId: null, images, translations: [indonesian("")] });
    expect(items.filter((i) => !i.ok).map((i) => `${i.key}:${i.locale ?? ""}`)).toEqual([
      "category:",
      "excerpt:id",
      "cover:",
      "metaDescription:id",
      "imageAlt:id",
      "language:en",
    ]);
    expect(canPublish(items)).toBe(false);
    const ok = publishChecklist({ slug: "t", categoryId: "c", coverImageId: null, images, translations: [indonesian("e")] });
    expect(canPublish(ok)).toBe(true);
  });
  it("requires the excerpt of every written language", () => {
    const english = { ...indonesian(""), locale: "en" as const };
    const items = publishChecklist({ slug: "t", categoryId: "c", coverImageId: null, images, translations: [indonesian("e"), english] });
    expect(canPublish(items)).toBe(false);
    expect(items.some((i) => i.key === "language")).toBe(false);
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
      coverImage: null,
      coverImageId: "img",
      category: { id: "c", slug: "c", name: "C" },
      categoryId: "c",
      tags: [],
      tagIds: ["x"],
      translations: { id: { ...serverTranslation("b"), metaDescription: "d" } },
    } as unknown as AdminArticle;
    const values = toFormValues(article);
    expect(values).toEqual({
      slug: "t",
      coverImageId: "img",
      categoryId: "c",
      tagIds: ["x"],
      translations: { id: { title: "T", excerpt: "", metaTitle: "", metaDescription: "d" } },
    });
    const withEnglish = {
      ...values,
      translations: { ...values.translations, en: { title: "  E  ", excerpt: "", metaTitle: "", metaDescription: "" } },
    };
    const input = toArticleInput(withEnglish, { id: body("b") }, 4);
    expect(input).toMatchObject({ slug: "t", version: 4, tagIds: ["x"] });
    expect(input.translations.id).toMatchObject({ title: "T", excerpt: null, metaTitle: null, metaDescription: "d", bodySchemaVersion: 1 });
    expect(input.translations.en).toMatchObject({ title: "E", body: { type: "doc", content: [] } });
    expect("version" in toArticleInput(values, {})).toBe(false);
    expect(toFormValues(null).translations).toEqual({});
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

  it("picks body errors out of a 400, per language", () => {
    const failed = error(400, "Validation failed", [
      { field: "translations.id.title", message: "Too long" },
      { field: "translations.en.body.content[3]", message: "unknown node" },
      { field: "translations.id.body", message: "Image missing" },
    ]);
    expect(bodyFieldErrors(failed)).toEqual([
      { locale: "en", path: "body.content[3]", message: "unknown node" },
      { locale: "id", path: "body", message: "Image missing" },
    ]);
    expect(bodyFieldErrors(error(409, "x"))).toEqual([]);
  });

  it("splits per-language field names and knows the settings fields", () => {
    expect(splitTranslationField("translations.en.excerpt")).toEqual({ locale: "en", field: "excerpt" });
    expect(splitTranslationField("translations.fr.title")).toBeNull();
    expect(splitTranslationField("slug")).toBeNull();
    expect(isSettingsField("categoryId")).toBe(true);
    expect(isSettingsField("translations.id.metaDescription")).toBe(true);
    expect(isSettingsField("translations.id.title")).toBe(false);
  });
});
