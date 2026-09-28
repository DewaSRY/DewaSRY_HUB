import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ChevronRight, Clock } from "lucide-react";
import { isAppLocale } from "@/i18n/settings";
import { Link } from "@/i18n/navigation";
import { AdSlot } from "@/components/ads/ad-slot";
import { JsonLd } from "@/components/common/json-ld";
import {
  ArticleBody,
  ArticleCard,
  ResponsiveImage,
  TableOfContents,
  articleMetaDescription,
  articleMetaTitle,
  articleReadingMinutes,
  buildToc,
  largestVariant,
  pickRelated,
  wasUpdated,
  type ArticleSummary,
} from "@/feature/content";
import { getArticle, listArticles } from "@/feature/content/server";
import { readOrFallback } from "@/lib/api/public-fetch";
import { emptyPage } from "@/lib/api/envelope";
import { formatDate } from "@/lib/datetime";
import { buildPageMetadata, canonicalFor } from "@/lib/seo/metadata";
import { articleJsonLd, breadcrumbJsonLd, AUTHOR_PERSON } from "@/lib/seo/json-ld";
import { siteLabels } from "../../_lib/labels";

// ISR (ADR-008 §7.1): nothing is rendered at build; each article renders on
// its first request, is cached, and is refreshed by POST /api/revalidate.
export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

async function load(locale: string, slug: string) {
  const result = await getArticle(slug);
  if (result.kind === "moved") permanentRedirect(`/${locale}/blog/${encodeURIComponent(result.slug)}`);
  if (result.kind === "not-found") notFound();
  return result.article;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return {};
  const article = await load(locale, slug);
  const cover = largestVariant(article.coverImage);
  return buildPageMetadata({
    locale,
    path: `/blog/${article.slug}`,
    title: articleMetaTitle(article),
    description: articleMetaDescription(article),
    image: cover,
    type: "article",
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
    tags: article.tags.map((tag) => tag.name),
    section: article.category?.name,
    canonical: article.canonicalUrl,
  });
}

export default async function ArticlePage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) notFound();
  const article = await load(locale, slug);
  const labels = await siteLabels(locale);
  const t = labels.tContent;

  const related = article.category
    ? await readOrFallback(() => listArticles({ category: article.category!.slug, limit: 4 }), emptyPage<ArticleSummary>(1, 4))
    : { data: emptyPage<ArticleSummary>(1, 4), unavailable: false };
  const relatedArticles = pickRelated(related.data.data, article.slug, 3);

  const toc = buildToc(article.body);
  const minutes = articleReadingMinutes(article);
  const url = canonicalFor(locale, `/blog/${article.slug}`);
  const cover = largestVariant(article.coverImage);

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <JsonLd
        data={[
          articleJsonLd({
            url,
            headline: article.title,
            description: articleMetaDescription(article),
            image: cover,
            datePublished: article.publishedAt,
            dateModified: article.updatedAt,
            section: article.category?.name,
            keywords: article.tags.map((tag) => tag.name),
            wordCount: article.wordCount ?? null,
          }),
          breadcrumbJsonLd([
            { name: t("blog.title"), url: canonicalFor(locale, "/blog") },
            ...(article.category
              ? [{ name: article.category.name, url: canonicalFor(locale, `/blog/category/${article.category.slug}`) }]
              : []),
            { name: article.title, url },
          ]),
        ]}
      />

      <header className="mx-auto max-w-3xl space-y-5">
        <nav aria-label={t("article.breadcrumb")}>
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link href="/blog" className="hover:text-foreground">
                {t("blog.title")}
              </Link>
            </li>
            {article.category ? (
              <>
                <ChevronRight className="size-3.5 opacity-60" aria-hidden />
                <li>
                  <Link href={`/blog/category/${article.category.slug}`} className="hover:text-foreground">
                    {article.category.name}
                  </Link>
                </li>
              </>
            ) : null}
          </ol>
        </nav>
        <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">{article.title}</h1>
        {article.excerpt ? <p className="text-lg leading-relaxed text-muted-foreground text-pretty">{article.excerpt}</p> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{AUTHOR_PERSON.name}</span>
          {article.publishedAt ? (
            <>
              <span aria-hidden>·</span>
              <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, { locale })}</time>
            </>
          ) : null}
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {t("article.readingTime", { count: minutes })}
          </span>
          {wasUpdated(article) && article.updatedAt ? (
            <>
              <span aria-hidden>·</span>
              <span>
                {t("article.updated")} <time dateTime={article.updatedAt}>{formatDate(article.updatedAt, { locale })}</time>
              </span>
            </>
          ) : null}
        </div>
      </header>

      {article.coverImage ? (
        <figure className="mx-auto mt-8 max-w-5xl">
          <ResponsiveImage
            image={article.coverImage}
            priority
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="aspect-[16/9] rounded-2xl object-cover shadow-sm"
          />
        </figure>
      ) : null}

      <div className="article-layout mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14">
        <div className="mx-auto w-full max-w-[70ch] min-w-0 lg:mx-0 lg:ml-auto">
          {toc.length ? (
            <div className="mb-8">
              <TableOfContents items={toc} title={t("article.onThisPage")} variant="mobile" />
            </div>
          ) : null}
          <ArticleBody
            doc={article.body}
            images={article.images}
            labels={labels.body}
            renderAdSlot={(slot) => <AdSlot slot={slot} label={labels.body.advertisement} />}
          />

          <footer className="mt-12 space-y-6 border-t pt-8">
            {article.tags.length ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">{t("article.tags")}</span>
                <ul className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <li key={tag.slug}>
                      <Link
                        href={`/blog/tag/${tag.slug}`}
                        className="inline-flex rounded-full border bg-card px-3 py-1 text-sm transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        #{tag.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <AdSlot slot="end-of-article" label={labels.body.advertisement} />
          </footer>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-8">
            <TableOfContents items={toc} title={t("article.onThisPage")} variant="sidebar" />
            <AdSlot slot="sidebar" label={labels.body.advertisement} />
          </div>
        </aside>
      </div>

      {relatedArticles.length ? (
        <section aria-labelledby="related-heading" className="mt-20 space-y-6 border-t pt-12">
          <h2 id="related-heading" className="text-2xl font-semibold tracking-tight">
            {t("article.related")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedArticles.map((item) => (
              <ArticleCard key={item.id} article={item} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
