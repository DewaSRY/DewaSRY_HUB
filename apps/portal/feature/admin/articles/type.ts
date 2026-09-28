import type { ArticleDoc, BodyImageMap, ImageAsset, TaxonomyRef } from "@/feature/content";
import type { PageParams } from "@/lib/api/envelope";

export type ArticleStatus = "DRAFT" | "PUBLISHED";

export interface TaxonomyWithId extends TaxonomyRef {
  id: string;
}

/**
 * `ArticleInput` (ADR-003 §10.3 as changed by ADR-009 §9): `body` is the
 * article JSON plus `bodySchemaVersion`.
 */
export interface ArticleInput {
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  body: ArticleDoc;
  bodySchemaVersion: number;
  coverImageId?: string | null;
  categoryId?: string | null;
  tagIds: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  /** Optimistic lock; not sent on create. */
  version?: number;
}

export interface Revalidation {
  status: "OK" | "PENDING_RETRY";
  paths: string[];
}

/** Row of `GET /admin/articles`. */
export interface AdminArticleSummary {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  excerpt: string | null;
  coverImage: ImageAsset | null;
  category: TaxonomyWithId | null;
  tags: TaxonomyWithId[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `AdminArticle` = `ArticleInput` fields + server fields (ADR-003 §10.3, ADR-009 §9). */
export interface AdminArticle extends AdminArticleSummary {
  body: ArticleDoc;
  bodySchemaVersion: number;
  images: BodyImageMap;
  wordCount: number;
  coverImageId: string | null;
  categoryId: string | null;
  tagIds: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  version: number;
  previousSlugs: string[];
  revalidation?: Revalidation | null;
}

export interface ArticleListParams extends PageParams {
  q?: string;
  status?: ArticleStatus;
  category?: string;
  tag?: string;
}

/** `POST /admin/link-preview` (ADR-009 §5.5, phase 2). */
export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
}
