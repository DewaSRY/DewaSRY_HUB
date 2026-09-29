import {
  BODY_SCHEMA_VERSION,
  CONTENT_LOCALES,
  collectImageIds,
  isContentLocale,
  type ArticleDoc,
  type BodyImageMap,
  type ContentLocale,
  type ImageAsset,
  type TaxonomyRef,
} from "@/feature/content";
import { toApiError } from "@/lib/api/error";
import {
  EMPTY_ARTICLE_FORM,
  SHARED_FORM_FIELDS,
  TRANSLATION_FORM_FIELDS,
  type ArticleFormValues,
  type TranslationFormValues,
} from "./schema";
import type { AdminArticle, ArticleInput, TranslationInput } from "./type";

/** Body per language, as the editor page keeps it. */
export type LocaleBodies = Partial<Record<ContentLocale, ArticleDoc>>;

/** The languages the form has, in `CONTENT_LOCALES` order. */
export function formLocales(translations: ArticleFormValues["translations"] | undefined): ContentLocale[] {
  return CONTENT_LOCALES.filter((locale) => Boolean(translations?.[locale]));
}

/**
 * Crash recovery (ADR-009 §6): the editor keeps the title and body of every
 * language plus `{ savedVersion, at }` in localStorage under
 * `article-draft:<id>` and offers "Restore unsaved changes" when that copy is
 * newer than the server version.
 */
export interface LocalDraft {
  translations: Partial<Record<ContentLocale, { title: string; body: ArticleDoc }>>;
  /** The server `version` the local edits started from (`null` for a new article). */
  savedVersion: number | null;
  /** When the copy was written (ms). */
  at: number;
  images?: BodyImageMap;
}

export const draftKey = (id: string | null | undefined) => `article-draft:${id ?? "new"}`;
export const previewKey = (id: string | null | undefined) => `article-preview:${id ?? "new"}`;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, store: StorageLike | null = storage()): T | null {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown, store: StorageLike | null = storage()): void {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or disabled: recovery is best effort.
  }
}

export function removeKey(key: string, store: StorageLike | null = storage()): void {
  try {
    store?.removeItem(key);
  } catch {
    // ignore
  }
}

/** Title + body of each language, for comparing a local copy with the server. */
function comparable(translations: Partial<Record<ContentLocale, { title: string; body: ArticleDoc }>>): string {
  return JSON.stringify(CONTENT_LOCALES.map((locale) => {
    const t = translations[locale];
    return t ? [locale, t.title, t.body] : null;
  }));
}

/**
 * Offer to restore when the local copy has content and is newer than what
 * the server has: it was based on the same or a later version and written
 * after the server's last update. Copies in the old one-language shape are
 * ignored.
 */
export function shouldOfferRestore(
  local: LocalDraft | null,
  server: Pick<AdminArticle, "version" | "updatedAt" | "translations"> | null,
): boolean {
  if (!local || typeof local.translations !== "object" || local.translations === null) return false;
  if (!Object.keys(local.translations).length) return false;
  if (!server) return true;
  if (comparable(local.translations) === comparable(server.translations)) return false;
  const serverTime = Date.parse(server.updatedAt);
  if (!Number.isNaN(serverTime) && local.at <= serverTime) return false;
  return local.savedVersion === null || local.savedVersion >= server.version;
}

/** `body.content[12].content[0]` → `[12, 0]`; `body` → `[]`; anything else → `null`. */
export function parseBodyPath(path: string): number[] | null {
  if (path === "body") return [];
  if (!path.startsWith("body.content[")) return null;
  const indices: number[] = [];
  const pattern = /\.content\[(\d+)\]/g;
  let consumed = "body";
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(path))) {
    indices.push(Number(match[1]));
    consumed += match[0];
  }
  return indices.length && path.startsWith(consumed) ? indices : null;
}

/**
 * `translations.en.body.content[3]` → `{ locale: "en", field: "body.content[3]" }`;
 * `null` for a field that is not per language.
 */
export function splitTranslationField(field: string): { locale: ContentLocale; field: string } | null {
  const match = /^translations\.([a-z0-9-]+)(?:\.(.+))?$/.exec(field);
  if (!match || !isContentLocale(match[1])) return null;
  return { locale: match[1], field: match[2] ?? "" };
}

export interface ChecklistInput {
  slug: string;
  categoryId: string | null | undefined;
  coverImageId: string | null | undefined;
  images: BodyImageMap;
  /** Every language the article has. */
  translations: { locale: ContentLocale; title: string; excerpt: string; metaDescription: string; body: ArticleDoc }[];
}

export interface ChecklistItem {
  key: "title" | "slug" | "excerpt" | "category" | "cover" | "metaDescription" | "imageAlt" | "language";
  ok: boolean;
  /** Required by the API (`422 ARTICLE_INCOMPLETE`); the others are warnings. */
  required: boolean;
  /** Set for a per-language item. */
  locale?: ContentLocale;
  count?: number;
}

type LooseNode = { type?: string; attrs?: Record<string, unknown>; content?: LooseNode[] };

/** Body images with neither an alt override nor a library alt. */
export function imagesMissingAlt(body: ArticleDoc, images: BodyImageMap): number {
  let missing = 0;
  const walk = (node: LooseNode) => {
    if (node.type === "image") {
      const id = node.attrs?.imageId as string | undefined;
      const override = (node.attrs?.alt as string | undefined)?.trim();
      const library = id ? images[id]?.alt?.trim() : "";
      if (!override && !library) missing += 1;
    }
    node.content?.forEach(walk);
  };
  walk(body as LooseNode);
  return missing;
}

/**
 * Publish checklist (ADR-009 §6 "Publish"). Every language the article has
 * goes live, so each needs a title and an excerpt; a language it does not
 * have yet is a warning (readers of it get a fallback).
 */
export function publishChecklist(input: ChecklistInput): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { key: "slug", ok: Boolean(input.slug.trim()), required: true },
    { key: "category", ok: Boolean(input.categoryId), required: true },
  ];
  for (const t of input.translations) {
    items.push({ key: "title", locale: t.locale, ok: Boolean(t.title.trim()), required: true });
    items.push({ key: "excerpt", locale: t.locale, ok: Boolean(t.excerpt.trim()), required: true });
  }
  items.push({ key: "cover", ok: Boolean(input.coverImageId), required: false });
  for (const t of input.translations) {
    items.push({ key: "metaDescription", locale: t.locale, ok: Boolean(t.metaDescription.trim()), required: false });
    const missingAlt = imagesMissingAlt(t.body, input.images);
    items.push({ key: "imageAlt", locale: t.locale, ok: missingAlt === 0, required: false, count: missingAlt });
  }
  const written = new Set(input.translations.map((t) => t.locale));
  for (const locale of CONTENT_LOCALES) {
    if (!written.has(locale)) items.push({ key: "language", locale, ok: false, required: false });
  }
  return items;
}

export function canPublish(items: ChecklistItem[]): boolean {
  return items.every((item) => item.ok || !item.required);
}

/** Google result preview lengths (ADR-009 §5.1). */
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

export function seoPreview(input: { metaTitle: string; title: string; metaDescription: string; excerpt: string }) {
  const title = input.metaTitle.trim() || input.title.trim();
  const description = input.metaDescription.trim() || input.excerpt.trim();
  return {
    title,
    description,
    titleTooLong: title.length > SEO_TITLE_MAX,
    descriptionTooLong: description.length > SEO_DESCRIPTION_MAX,
  };
}

/** Local preview payload written when the admin clicks "Preview" (the language being edited). */
export interface PreviewPayload {
  locale: ContentLocale;
  title: string;
  excerpt: string;
  body: ArticleDoc;
  images: BodyImageMap;
  coverImage: ImageAsset | null;
  category: TaxonomyRef | null;
  tags: TaxonomyRef[];
  at: number;
}

/** Image ids used by the body that the images map does not know yet. */
export function unknownImageIds(body: ArticleDoc, images: BodyImageMap): string[] {
  return collectImageIds(body).filter((id) => !images[id]);
}

/** True when an API / form field is edited in the settings sheet (everything but the titles). */
export function isSettingsField(field: string): boolean {
  if ((SHARED_FORM_FIELDS as readonly string[]).includes(field)) return true;
  const split = splitTranslationField(field);
  return Boolean(split && split.field !== "title" && (TRANSLATION_FORM_FIELDS as readonly string[]).includes(split.field));
}

/** `AdminArticle` → form values (`null` → empty strings for text inputs). */
export function toFormValues(article: AdminArticle | null | undefined): ArticleFormValues {
  if (!article) return { ...EMPTY_ARTICLE_FORM, tagIds: [], translations: {} };
  const translations: ArticleFormValues["translations"] = {};
  for (const locale of CONTENT_LOCALES) {
    const t = article.translations?.[locale];
    if (!t) continue;
    translations[locale] = {
      title: t.title ?? "",
      excerpt: t.excerpt ?? "",
      metaTitle: t.metaTitle ?? "",
      metaDescription: t.metaDescription ?? "",
    } satisfies TranslationFormValues;
  }
  return {
    slug: article.slug ?? "",
    coverImageId: article.coverImageId ?? article.coverImage?.id ?? null,
    categoryId: article.categoryId ?? article.category?.id ?? null,
    tagIds: article.tagIds ?? article.tags.map((tag) => tag.id),
    translations,
  };
}

/** The bodies of a saved article, by language. */
export function toBodies(article: AdminArticle | null | undefined): LocaleBodies {
  const bodies: LocaleBodies = {};
  for (const locale of CONTENT_LOCALES) {
    const t = article?.translations?.[locale];
    if (t) bodies[locale] = t.body;
  }
  return bodies;
}

/**
 * Form values + bodies → `ArticleInput` (ADR-003 §10.3). Empty text becomes
 * `null`; `version` is sent only for an update (optimistic lock). A language
 * with no body yet gets an empty document.
 */
export function toArticleInput(values: ArticleFormValues, bodies: LocaleBodies, version?: number): ArticleInput {
  const text = (value: string) => value.trim() || null;
  const translations: ArticleInput["translations"] = {};
  for (const locale of formLocales(values.translations)) {
    const t = values.translations[locale]!;
    translations[locale] = {
      title: t.title.trim(),
      excerpt: text(t.excerpt),
      body: bodies[locale] ?? { type: "doc", content: [] },
      bodySchemaVersion: BODY_SCHEMA_VERSION,
      metaTitle: text(t.metaTitle),
      metaDescription: text(t.metaDescription),
    } satisfies TranslationInput;
  }
  return {
    slug: text(values.slug),
    coverImageId: values.coverImageId,
    categoryId: values.categoryId,
    tagIds: values.tagIds,
    translations,
    ...(version === undefined ? {} : { version }),
  };
}

/**
 * `PUT /admin/articles/{id}` answers `409` for both `SLUG_TAKEN` and
 * `VERSION_CONFLICT`. A slug problem names the `slug` field (or says so);
 * anything else is treated as a version conflict.
 */
export function isSlugConflict(error: unknown): boolean {
  const apiError = toApiError(error);
  if (apiError?.status !== 409) return false;
  return apiError.fieldErrors.some((item) => item.field === "slug") || /slug/i.test(apiError.message);
}

export function isVersionConflict(error: unknown): boolean {
  return toApiError(error)?.status === 409 && !isSlugConflict(error);
}

/**
 * `400` items that point at a body (`translations.en.body`,
 * `translations.en.body.content[12]…`), with `path` relative to that body
 * (`body`, `body.content[12]`) as `parseBodyPath` expects.
 */
export function bodyFieldErrors(error: unknown): { locale: ContentLocale; path: string; message: string }[] {
  const apiError = toApiError(error);
  if (apiError?.status !== 400) return [];
  return apiError.fieldErrors.flatMap((item) => {
    const split = splitTranslationField(item.field);
    if (!split || !(split.field === "body" || split.field.startsWith("body."))) return [];
    return [{ locale: split.locale, path: split.field, message: item.message }];
  });
}
