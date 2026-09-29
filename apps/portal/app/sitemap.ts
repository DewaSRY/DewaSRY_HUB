import type { MetadataRoute } from "next";
import { locales } from "@/i18n/settings";
import { getSitemapData } from "@/feature/content/server";
import { listProducts } from "@/feature/product/server";
import { readOrFallback } from "@/lib/api/public-fetch";
import { buildLanguageAlternates, canonicalFor } from "@/lib/seo/metadata";

/**
 * `sitemap.xml` from `GET /public/sitemap` (FR-C5). Rendered on request (not
 * at build, when the API may be down); the API reads are cached and
 * `POST /api/revalidate` with `/sitemap.xml` refreshes them.
 */
export const dynamic = "force-dynamic";

const STATIC_PATHS = ["/", "/about", "/blog", "/products", "/login"];

/** One URL per locale; `only` limits it to the languages the page exists in (articles). */
function entries(path: string, lastModified?: string | null, priority?: number, only?: readonly string[]): MetadataRoute.Sitemap {
  const available = only?.length ? locales.filter((locale) => only.includes(locale)) : locales;
  return available.map((locale) => ({
    url: canonicalFor(locale, path),
    lastModified: lastModified ?? undefined,
    priority,
    alternates: { languages: buildLanguageAlternates(path, only) },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [data, products] = await Promise.all([
    readOrFallback(() => getSitemapData(), { articles: [], categories: [], tags: [] }),
    readOrFallback(() => listProducts(), []),
  ]);
  return [
    ...STATIC_PATHS.flatMap((path) => entries(path, undefined, path === "/" ? 1 : 0.7)),
    ...products.data.flatMap((product) => entries(`/products/${product.code}`, undefined, 0.6)),
    ...data.data.articles.flatMap((article) => entries(`/blog/${article.slug}`, article.updatedAt, 0.8, article.locales)),
    ...data.data.categories.flatMap((category) => entries(`/blog/category/${category.slug}`, category.updatedAt, 0.5)),
    ...data.data.tags.flatMap((tag) => entries(`/blog/tag/${tag.slug}`, tag.updatedAt, 0.4)),
  ];
}
