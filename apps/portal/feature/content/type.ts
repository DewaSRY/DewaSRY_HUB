import type { ArticleDoc, BodyImageMap } from "./article-schema/types";

/** `Image` (ADR-003 §5.1): CloudFront WebP variants at 480 / 960 / 1600 px. */
export interface ImageVariant {
  width: number;
  url: string;
}

export interface ImageAsset {
  id: string;
  alt: string;
  width: number;
  height: number;
  variants: ImageVariant[];
}

export interface TaxonomyRef {
  slug: string;
  name: string;
}

/** `GET /public/categories/{slug}`, `GET /public/tags/{slug}`. */
export interface Taxonomy extends TaxonomyRef {
  articleCount: number;
}

/** `ArticleSummary` (ADR-003 §5.1). */
export interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: ImageAsset | null;
  category: TaxonomyRef | null;
  tags: TaxonomyRef[];
  publishedAt: string | null;
  updatedAt: string | null;
}

/**
 * `GET /public/articles/{slug}` — `ArticleSummary` + the body JSON and the
 * images it uses (ADR-009 §9, replaces `bodyHtml`).
 */
export interface ArticleDetail extends ArticleSummary {
  body: ArticleDoc;
  bodySchemaVersion: number;
  images: BodyImageMap;
  readingMinutes: number | null;
  wordCount?: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
}

export interface ArticleListParams {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
}

/** `GET /public/sitemap`. */
export interface SitemapData {
  articles: { slug: string; updatedAt: string | null }[];
  categories: { slug: string; updatedAt: string | null }[];
  tags: { slug: string; updatedAt: string | null }[];
}

export type ArticleLookup =
  | { kind: "found"; article: ArticleDetail }
  | { kind: "moved"; slug: string }
  | { kind: "not-found" };
