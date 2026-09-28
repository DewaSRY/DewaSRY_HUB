import type { ArticleDetail, ArticleSummary, ImageAsset } from "../type";
import { excerptFromDoc } from "./text";
import { readingMinutes } from "./reading-time";

/** The OG / JSON-LD image: the 1600 px variant when present (ADR-009 §7.6). */
export function largestVariant(image: ImageAsset | null | undefined) {
  if (!image?.variants?.length) return null;
  const sorted = [...image.variants].sort((a, b) => b.width - a.width);
  const best = sorted.find((variant) => variant.width <= 1600) ?? sorted[0];
  const height = image.width ? Math.round((image.height / image.width) * best.width) : image.height;
  return { url: best.url, width: best.width, height, alt: image.alt };
}

/** `metaTitle` → `title`. */
export function articleMetaTitle(article: Pick<ArticleDetail, "metaTitle" | "title">): string {
  return article.metaTitle?.trim() || article.title;
}

/** `metaDescription` → `excerpt` → first 160 chars of the body text. */
export function articleMetaDescription(
  article: Pick<ArticleDetail, "metaDescription" | "excerpt" | "body">,
): string {
  return (
    article.metaDescription?.trim() ||
    article.excerpt?.trim() ||
    excerptFromDoc(article.body, 160)
  );
}

export function articleReadingMinutes(article: Pick<ArticleDetail, "readingMinutes" | "wordCount">): number {
  if (article.readingMinutes && article.readingMinutes > 0) return article.readingMinutes;
  return readingMinutes(article.wordCount ?? 0);
}

/** True when the article was edited meaningfully after publishing (> 1 day). */
export function wasUpdated(article: Pick<ArticleSummary, "publishedAt" | "updatedAt">): boolean {
  if (!article.publishedAt || !article.updatedAt) return false;
  return new Date(article.updatedAt).getTime() - new Date(article.publishedAt).getTime() > 86_400_000;
}

/** Related articles: same category, current one removed, at most `max`. */
export function pickRelated(list: ArticleSummary[], currentSlug: string, max = 3): ArticleSummary[] {
  return list.filter((article) => article.slug !== currentSlug).slice(0, max);
}
