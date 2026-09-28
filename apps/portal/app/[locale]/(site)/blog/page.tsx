import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAppLocale } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { parsePageParam } from "@/feature/common";
import { listArticles, listCategories } from "@/feature/content/server";
import { readOrFallback } from "@/lib/api/public-fetch";
import { emptyPage } from "@/lib/api/envelope";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SectionHeading } from "@/components/landing/section-heading";
import { siteLabels } from "../_lib/labels";
import { ArticleList } from "../_lib/article-list";
import { TaxonomyNav } from "../_lib/taxonomy-nav";

const PAGE_SIZE = 12;

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const page = parsePageParam(await searchParams);
  const { t } = await getTranslation(locale, "content");
  const title = page > 1 ? t("blog.metaTitlePage", { page }) : t("blog.metaTitle");
  return buildPageMetadata({ locale, path: page > 1 ? `/blog?page=${page}` : "/blog", title, description: t("blog.metaDescription") });
}

export default async function BlogPage({ params, searchParams }: PageProps<"/[locale]/blog">) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  const page = parsePageParam(await searchParams);
  const labels = await siteLabels(locale);
  const t = labels.tContent;

  const [articles, categories] = await Promise.all([
    readOrFallback(() => listArticles({ page, limit: PAGE_SIZE }), emptyPage(page, PAGE_SIZE)),
    readOrFallback(() => listCategories(), []),
  ]);
  if (!articles.unavailable && page > 1 && page > articles.data.meta.total_page) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-14 sm:px-6">
      <SectionHeading as="h1" eyebrow={t("blog.eyebrow")} title={t("blog.title")} description={t("blog.description")} />
      <TaxonomyNav categories={categories.data} allLabel={t("blog.all")} label={t("blog.categories")} />
      <ArticleList
        articles={articles.data.data}
        locale={locale}
        page={page}
        totalPages={articles.data.meta.total_page}
        basePath="/blog"
        unavailable={articles.unavailable}
        labels={{
          empty: t("blog.empty"),
          emptyDescription: t("blog.emptyDescription"),
          unavailable: t("blog.unavailable"),
          advertisement: labels.body.advertisement,
          pagination: labels.pagination,
        }}
      />
    </div>
  );
}
