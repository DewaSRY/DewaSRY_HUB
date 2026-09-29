import type { ArticleDoc, BodyImageMap, ContentLocale, ImageAsset, TaxonomyRef } from "@/feature/content";
import type { PageParams } from "@/lib/api/envelope";

export type ArticleStatus = "DRAFT" | "PUBLISHED";

export interface TaxonomyWithId extends TaxonomyRef {
  id: string;
}

/** One language of an article in `ArticleInput`. */
export interface TranslationInput {
  title: string;
  excerpt?: string | null;
  body: ArticleDoc;
  bodySchemaVersion: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

/**
 * `ArticleInput` (ADR-003 §10.3 as changed by ADR-009 §9). Slug, cover,
 * category and tags are shared; the text is per language in `translations`,
 * which replaces the stored set (a language left out is removed).
 */
export interface ArticleInput {
  slug?: string | null;
  coverImageId?: string | null;
  categoryId?: string | null;
  tagIds: string[];
  translations: Partial<Record<ContentLocale, TranslationInput>>;
  /** Optimistic lock; not sent on create. */
  version?: number;
}

export interface Revalidation {
  status: "OK" | "PENDING_RETRY";
  paths: string[];
}

interface AdminArticleBase {
  id: string;
  /** Display title: the fallback language first, else the first one written. */
  title: string;
  slug: string;
  status: ArticleStatus;
  /** Languages the article has, in `CONTENT_LOCALES` order. */
  locales: ContentLocale[];
  coverImage: ImageAsset | null;
  category: TaxonomyWithId | null;
  tags: TaxonomyWithId[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Row of `GET /admin/articles`; `excerpt` and `wordCount` are the display language's. */
export interface AdminArticleSummary extends AdminArticleBase {
  excerpt: string | null;
  wordCount: number;
}

export interface AdminTranslation {
  locale: ContentLocale;
  title: string;
  excerpt: string | null;
  body: ArticleDoc;
  bodySchemaVersion: number;
  metaTitle: string | null;
  metaDescription: string | null;
  wordCount: number;
  readingMinutes: number;
  updatedAt: string;
}

/** `AdminArticle` = shared fields + one `AdminTranslation` per language (ADR-003 §10.3, ADR-009 §9). */
export interface AdminArticle extends AdminArticleBase {
  translations: Partial<Record<ContentLocale, AdminTranslation>>;
  /** Images used by any translation's body. */
  images: BodyImageMap;
  coverImageId: string | null;
  categoryId: string | null;
  tagIds: string[];
  version: number;
  previousSlugs: string[];
  revalidation?: Revalidation | null;
}

export interface ArticleListParams extends PageParams {
  q?: string;
  status?: ArticleStatus;
  category?: string;
  tag?: string;
  /** Only articles with no translation in this language. */
  missingLocale?: ContentLocale;
}

/** `POST /admin/link-preview` (ADR-009 §5.5, phase 2). */
export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
}
