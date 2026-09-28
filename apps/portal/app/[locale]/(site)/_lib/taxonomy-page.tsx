import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FolderTree, Hash } from "lucide-react";
import type { AppLocale } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { Link } from "@/i18n/navigation";
import { getCategory, getTag, listArticles, listCategories } from "@/feature/content/server";
import type { Taxonomy } from "@/feature/content";
import { readOrFallback } from "@/lib/api/public-fetch";
import { emptyPage } from "@/lib/api/envelope";
import { buildPageMetadata, canonicalFor } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { JsonLd } from "@/components/common/json-ld";
import { siteLabels } from "./labels";
import { ArticleList } from "./article-list";
import { TaxonomyNav } from "./taxonomy-nav";

export type TaxonomyKind = "category" | "tag";
const PAGE_SIZE = 12;

async function loadTaxonomy(kind: TaxonomyKind, slug: string): Promise<Taxonomy> {
  const taxonomy = kind === "category" ? await getCategory(slug) : await getTag(slug);
  if (!taxonomy) notFound();
  return taxonomy;
}

/** Async `generateMetadata` from the category / tag name (UC-03 step 3, PRD §4.3). */
export async function taxonomyMetadata(kind: TaxonomyKind, locale: AppLocale, slug: string, page: number): Promise<Metadata> {
  const taxonomy = await loadTaxonomy(kind, slug);
  const { t } = await getTranslation(locale, "content");
  const base = `/blog/${kind}/${taxonomy.slug}`;
  const title = t(`${kind}.metaTitle`, { name: taxonomy.name }) + (page > 1 ? ` — ${t("blog.pageSuffix", { page })}` : "");
  return buildPageMetadata({
    locale,
    path: page > 1 ? `${base}?page=${page}` : base,
    title,
    description: t(`${kind}.metaDescription`, { name: taxonomy.name, count: taxonomy.articleCount }),
  });
}

export async function TaxonomyPage({ kind, locale, slug, page }: { kind: TaxonomyKind; locale: AppLocale; slug: string; page: number }) {
  const taxonomy = await loadTaxonomy(kind, slug);
  const labels = await siteLabels(locale);
  const t = labels.tContent;
  const basePath = `/blog/${kind}/${taxonomy.slug}`;

  const [articles, categories] = await Promise.all([
    readOrFallback(
      () => listArticles(kind === "category" ? { category: taxonomy.slug, page, limit: PAGE_SIZE } : { tag: taxonomy.slug, page, limit: PAGE_SIZE }),
      emptyPage(page, PAGE_SIZE),
    ),
    kind === "category" ? readOrFallback(() => listCategories(), []) : Promise.resolve({ data: [] as Taxonomy[], unavailable: false }),
  ]);
  if (!articles.unavailable && page > 1 && page > articles.data.meta.total_page) notFound();
  const Icon = kind === "category" ? FolderTree : Hash;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-14 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("blog.title"), url: canonicalFor(locale, "/blog") },
          { name: taxonomy.name, url: canonicalFor(locale, basePath) },
        ])}
      />
      <header className="space-y-4">
        <nav aria-label={t("article.breadcrumb")} className="text-sm text-muted-foreground">
          <Link href="/blog" className="hover:text-foreground">
            {t("blog.title")}
          </Link>
          <span aria-hidden> / </span>
          <span>{t(`${kind}.label`)}</span>
        </nav>
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-6" aria-hidden />
          </span>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{kind === "tag" ? `#${taxonomy.name}` : taxonomy.name}</h1>
            <p className="text-muted-foreground">{t(`${kind}.count`, { count: taxonomy.articleCount })}</p>
          </div>
        </div>
      </header>
      {kind === "category" ? (
        <TaxonomyNav categories={categories.data} active={taxonomy.slug} allLabel={t("blog.all")} label={t("blog.categories")} />
      ) : null}
      <ArticleList
        articles={articles.data.data}
        locale={locale}
        page={page}
        totalPages={articles.data.meta.total_page}
        basePath={basePath}
        unavailable={articles.unavailable}
        labels={{
          empty: t(`${kind}.empty`),
          emptyDescription: t(`${kind}.emptyDescription`),
          unavailable: t("blog.unavailable"),
          backToBlog: t("blog.backToBlog"),
          advertisement: labels.body.advertisement,
          pagination: labels.pagination,
        }}
      />
    </div>
  );
}
