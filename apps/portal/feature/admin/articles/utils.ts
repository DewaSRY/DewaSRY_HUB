import {
  BODY_SCHEMA_VERSION,
  collectImageIds,
  type ArticleDoc,
  type BodyImageMap,
  type ImageAsset,
  type TaxonomyRef,
} from "@/feature/content";
import { toApiError } from "@/lib/api/error";
import { EMPTY_ARTICLE_FORM, type ArticleFormValues } from "./schema";
import type { AdminArticle, ArticleInput } from "./type";

/**
 * Crash recovery (ADR-009 §6): the editor keeps `{ body, title, savedVersion, at }`
 * in localStorage under `article-draft:<id>` and offers "Restore unsaved
 * changes" when that copy is newer than the server version.
 */
export interface LocalDraft {
  body: ArticleDoc;
  title: string;
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

/**
 * Offer to restore when the local copy has content and is newer than what
 * the server has: it was based on the same or a later version and written
 * after the server's last update.
 */
export function shouldOfferRestore(
  local: LocalDraft | null,
  server: { version: number; updatedAt: string; title: string; body: ArticleDoc } | null,
): boolean {
  if (!local) return false;
  if (!server) return true;
  if (JSON.stringify(local.body) === JSON.stringify(server.body) && local.title === server.title) return false;
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

export interface ChecklistInput {
  title: string;
  slug: string;
  excerpt: string;
  categoryId: string | null | undefined;
  coverImageId: string | null | undefined;
  metaDescription: string;
  body: ArticleDoc;
  images: BodyImageMap;
}

export interface ChecklistItem {
  key: "title" | "slug" | "excerpt" | "category" | "cover" | "metaDescription" | "imageAlt";
  ok: boolean;
  /** Required by the API (`422 ARTICLE_INCOMPLETE`); the others are warnings. */
  required: boolean;
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

/** Publish checklist (ADR-009 §6 "Publish"). */
export function publishChecklist(input: ChecklistInput): ChecklistItem[] {
  const missingAlt = imagesMissingAlt(input.body, input.images);
  return [
    { key: "title", ok: Boolean(input.title.trim()), required: true },
    { key: "slug", ok: Boolean(input.slug.trim()), required: true },
    { key: "excerpt", ok: Boolean(input.excerpt.trim()), required: true },
    { key: "category", ok: Boolean(input.categoryId), required: true },
    { key: "cover", ok: Boolean(input.coverImageId), required: false },
    { key: "metaDescription", ok: Boolean(input.metaDescription.trim()), required: false },
    { key: "imageAlt", ok: missingAlt === 0, required: false, count: missingAlt },
  ];
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

/** Local preview payload written when the admin clicks "Preview". */
export interface PreviewPayload {
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

/** Settings-sheet fields of the form (everything but the title). */
export const SETTINGS_FIELDS = ["slug", "excerpt", "coverImageId", "categoryId", "tagIds", "metaTitle", "metaDescription"] as const;

/** `AdminArticle` → form values (`null` → empty strings for text inputs). */
export function toFormValues(article: AdminArticle | null | undefined): ArticleFormValues {
  if (!article) return { ...EMPTY_ARTICLE_FORM, tagIds: [] };
  return {
    title: article.title ?? "",
    slug: article.slug ?? "",
    excerpt: article.excerpt ?? "",
    coverImageId: article.coverImageId ?? article.coverImage?.id ?? null,
    categoryId: article.categoryId ?? article.category?.id ?? null,
    tagIds: article.tagIds ?? article.tags.map((tag) => tag.id),
    metaTitle: article.metaTitle ?? "",
    metaDescription: article.metaDescription ?? "",
  };
}

/**
 * Form values + body → `ArticleInput` (ADR-003 §10.3). Empty text becomes
 * `null`; `version` is sent only for an update (optimistic lock).
 */
export function toArticleInput(values: ArticleFormValues, body: ArticleDoc, version?: number): ArticleInput {
  const text = (value: string) => value.trim() || null;
  return {
    title: values.title.trim(),
    slug: text(values.slug),
    excerpt: text(values.excerpt),
    body,
    bodySchemaVersion: BODY_SCHEMA_VERSION,
    coverImageId: values.coverImageId,
    categoryId: values.categoryId,
    tagIds: values.tagIds,
    metaTitle: text(values.metaTitle),
    metaDescription: text(values.metaDescription),
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

/** `400` items that point at the body (`body`, `body.content[12]…`). */
export function bodyFieldErrors(error: unknown): { path: string; message: string }[] {
  const apiError = toApiError(error);
  if (apiError?.status !== 400) return [];
  return apiError.fieldErrors
    .filter((item) => item.field === "body" || item.field.startsWith("body."))
    .map((item) => ({ path: item.field, message: item.message }));
}
