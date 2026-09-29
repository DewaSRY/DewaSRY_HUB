import "server-only";
import { cache } from "react";
import {
  publicFetch,
  unwrapData,
  unwrapPage,
  type PublicFetchOptions,
} from "@/lib/api/public-fetch";
import { emptyPage, normalizePageParams, type ApiPage, type ApiResponse } from "@/lib/api/envelope";
import type {
  ArticleDetail,
  ArticleListParams,
  ArticleLookup,
  ArticleSummary,
  SitemapData,
  Taxonomy,
} from "./type";

/**
 * Public content reads for ISR pages (ADR-008 §6.3, §7.1). Never re-exported
 * from the barrel (rule I5): pages import this file by path.
 *
 * `cache()` shares one result between `generateMetadata` and the page within
 * a request; the `fetch` Data Cache shares it across requests.
 */

const TAG = { articles: "public:articles", taxonomy: "public:taxonomy", sitemap: "public:sitemap" };

function slugFromMoved(location: string | null, body: unknown): string | null {
  const data = (body as ApiResponse<{ slug?: unknown }> | undefined)?.data;
  if (data && typeof data.slug === "string" && data.slug) return data.slug;
  if (!location) return null;
  const match = /\/public\/articles\/([^/?#]+)/.exec(location);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * `GET /public/articles/{slug}?locale=` → found, moved (renamed slug, 301),
 * or not-found. A missing translation falls back: check `article.locale`.
 */
export const getArticle = cache(async (slug: string, locale: string): Promise<ArticleLookup> => {
  const result = await publicFetch<ApiResponse<ArticleDetail>>(
    `/public/articles/${encodeURIComponent(slug)}`,
    { query: { locale }, tags: [TAG.articles, `public:article:${slug}`] },
  );
  if (result.kind === "not-found") return { kind: "not-found" };
  if (result.kind === "moved") {
    const next = slugFromMoved(result.location, result.body);
    return next && next !== slug ? { kind: "moved", slug: next } : { kind: "not-found" };
  }
  return { kind: "found", article: unwrapData(result.body) };
});

/** `GET /public/articles` — paged, newest first. */
export const listArticles = cache(
  async (params: ArticleListParams = {}): Promise<ApiPage<ArticleSummary>> => {
    const { page, limit } = normalizePageParams(params, { limit: 12 });
    const options: PublicFetchOptions = {
      query: { locale: params.locale, page, limit, category: params.category, tag: params.tag },
      tags: [TAG.articles],
    };
    const result = await publicFetch<unknown>("/public/articles", options);
    if (result.kind !== "ok") return emptyPage<ArticleSummary>(page, limit);
    return unwrapPage<ArticleSummary>(result.body);
  },
);

async function getTaxonomy(kind: "categories" | "tags", slug: string): Promise<Taxonomy | null> {
  const result = await publicFetch<ApiResponse<Taxonomy>>(
    `/public/${kind}/${encodeURIComponent(slug)}`,
    { tags: [TAG.taxonomy] },
  );
  if (result.kind !== "ok") return null;
  return unwrapData(result.body);
}

/** `GET /public/categories/{slug}` — `null` when unknown (→ `notFound()`). */
export const getCategory = cache((slug: string) => getTaxonomy("categories", slug));

/** `GET /public/tags/{slug}` — `null` when unknown (→ `notFound()`). */
export const getTag = cache((slug: string) => getTaxonomy("tags", slug));

async function listTaxonomy(kind: "categories" | "tags"): Promise<Taxonomy[]> {
  const result = await publicFetch<ApiResponse<Taxonomy[]>>(`/public/${kind}`, { tags: [TAG.taxonomy] });
  if (result.kind !== "ok") return [];
  return unwrapData(result.body) ?? [];
}

/** `GET /public/categories` — categories with at least one published article. */
export const listCategories = cache(() => listTaxonomy("categories"));

/** `GET /public/tags`. */
export const listTags = cache(() => listTaxonomy("tags"));

/** `GET /public/sitemap` — every URL the sitemap needs. */
export async function getSitemapData(): Promise<SitemapData> {
  const result = await publicFetch<ApiResponse<SitemapData>>("/public/sitemap", {
    tags: [TAG.sitemap],
    revalidate: 600,
  });
  if (result.kind !== "ok") return { articles: [], categories: [], tags: [] };
  const data = unwrapData(result.body);
  return {
    articles: data.articles ?? [],
    categories: data.categories ?? [],
    tags: data.tags ?? [],
  };
}
