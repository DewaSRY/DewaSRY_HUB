"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Clock, Eye, Pencil } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineAlert } from "@/components/common/inline-alert";
import { PageContainer } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { AUTHOR_PERSON } from "@/lib/seo/json-ld";
import { cn } from "@/lib/utils";
import {
  ArticleBody,
  ResponsiveImage,
  TableOfContents,
  CONTENT_LOCALES,
  buildToc,
  countWords,
  docToPlainText,
  isContentLocale,
  languageName,
  readingMinutes,
  type ArticleBodyLabels,
  type ContentLocale,
} from "@/feature/content";
import { useAdminArticle } from "../hooks";
import type { AdminArticle } from "../type";
import { previewKey, type PreviewPayload } from "../utils";

/** Same reserved heights as the public `AdSlot` (components/ads is (site)-only, rule I6). */
const AD_HEIGHT = { "in-article": 280, sidebar: 600, "end-of-article": 280 } as const;

function AdPlaceholder({ slot, label }: { slot: string; label: string }) {
  const kind = slot.startsWith("in-article") ? "in-article" : (slot as keyof typeof AD_HEIGHT);
  return (
    <div
      aria-hidden
      data-ad-slot={slot}
      className={cn(
        "ad-slot not-prose my-8 flex items-center justify-center rounded-lg border border-dashed bg-muted/60 text-xs tracking-widest text-muted-foreground uppercase",
        kind === "sidebar" && "my-0 hidden lg:flex",
      )}
      style={{ minHeight: AD_HEIGHT[kind] ?? 280 }}
    >
      {label} · {slot}
    </div>
  );
}

/** The saved version in `locale`, or its first language when it has none. */
function fromArticle(article: AdminArticle, locale: ContentLocale | null): PreviewPayload | null {
  const chosen = (locale && article.translations[locale] ? locale : CONTENT_LOCALES.find((item) => article.translations[item])) ?? null;
  const translation = chosen ? article.translations[chosen] : undefined;
  if (!chosen || !translation) return null;
  return {
    locale: chosen,
    title: translation.title,
    excerpt: translation.excerpt ?? "",
    body: translation.body,
    images: article.images,
    coverImage: article.coverImage,
    category: article.category,
    tags: article.tags,
    at: Date.parse(article.updatedAt) || 0,
  };
}

/** The local preview payload, kept live across tabs through the `storage` event. */
function useLocalPreview(key: string): PreviewPayload | null {
  const raw = useSyncExternalStore(
    (onChange) => {
      const handler = (event: StorageEvent) => {
        if (event.key === key) onChange();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PreviewPayload;
    } catch {
      return null;
    }
  }, [raw]);
}

/**
 * `/admin/articles/[id]/preview` (ADR-009 §6 "Preview"): renders the current
 * editor content — the payload the editor tab writes to localStorage, or the
 * saved article when there is none or it is older — with the public
 * `ArticleBody` renderer in the public article layout. Ads are grey
 * placeholders in their real positions.
 */
export function ArticlePreviewScreen({ id, lang, uiLocale }: { id: string | null; lang: string | null; uiLocale: string }) {
  const { t } = useTranslation("admin");
  const { t: tContent } = useTranslation("content");
  const requested = lang && isContentLocale(lang) ? lang : null;
  const stored = useLocalPreview(previewKey(id));
  // The editor writes the language it is showing; use it only for that language.
  const local = stored && (!requested || stored.locale === requested) ? stored : null;
  const server = useAdminArticle(id);

  const serverPayload = server.data ? fromArticle(server.data, requested) : null;
  const payload = local && (!serverPayload || local.at >= serverPayload.at) ? local : serverPayload;
  const fromEditor = Boolean(payload && payload === local);

  const labels: ArticleBodyLabels = {
    copy: tContent("body.copy"),
    copied: tContent("body.copied"),
    codeLanguage: tContent("body.codeLanguage"),
    plainText: tContent("body.plainText"),
    loadEmbed: tContent("body.loadEmbed"),
    embedNotice: tContent("body.embedNotice"),
    opensInNewTab: tContent("body.opensInNewTab"),
    callout: {
      info: tContent("body.callout.info"),
      tip: tContent("body.callout.tip"),
      warning: tContent("body.callout.warning"),
      danger: tContent("body.callout.danger"),
    },
    headingAnchor: tContent("body.headingAnchor"),
    advertisement: tContent("body.advertisement"),
    taskDone: tContent("body.taskDone"),
    taskTodo: tContent("body.taskTodo"),
  };

  const toc = useMemo(() => buildToc(payload?.body), [payload?.body]);
  const minutes = useMemo(() => readingMinutes(countWords(docToPlainText(payload?.body))), [payload?.body]);

  if (!payload) {
    if (id && server.isPending) {
      return (
        <PageContainer>
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-[50vh] w-full" />
        </PageContainer>
      );
    }
    if (id && server.isError) {
      return (
        <PageContainer>
          <QueryErrorState error={server.error} onRetry={() => server.refetch()} retrying={server.isRefetching} />
        </PageContainer>
      );
    }
    return (
      <PageContainer>
        <InlineAlert variant="info" title={t("articles.previewScreen.emptyTitle")}>
          {t("articles.previewScreen.emptyDescription")}
        </InlineAlert>
      </PageContainer>
    );
  }

  return (
    <div className="flex-1">
      <div className="flex flex-wrap items-center gap-3 border-b bg-warning/10 px-4 py-2 text-sm lg:px-6">
        <Eye className="size-4 text-warning" aria-hidden />
        <span className="font-medium">{t("articles.previewScreen.banner")}</span>
        {payload.locale ? (
          <span className="rounded border px-1.5 font-mono text-xs uppercase" title={languageName(payload.locale, uiLocale)}>
            {payload.locale}
          </span>
        ) : null}
        <span className="text-muted-foreground">
          {fromEditor ? t("articles.previewScreen.fromEditor") : t("articles.previewScreen.fromServer")}
        </span>
        <Link href={`/admin/articles/${id ?? "new"}`} className={cn(buttonVariants({ variant: "outline", size: "xs" }), "ml-auto")}>
          <Pencil aria-hidden />
          {t("articles.previewScreen.backToEditor")}
        </Link>
      </div>

      <article lang={payload.locale} className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="mx-auto max-w-3xl space-y-5">
          {payload.category ? (
            <nav aria-label={tContent("article.breadcrumb")}>
              <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                <li>{tContent("blog.title")}</li>
                <ChevronRight className="size-3.5 opacity-60" aria-hidden />
                <li>{payload.category.name}</li>
              </ol>
            </nav>
          ) : null}
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {payload.title || t("articles.untitled")}
          </h1>
          {payload.excerpt ? <p className="text-lg leading-relaxed text-pretty text-muted-foreground">{payload.excerpt}</p> : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{AUTHOR_PERSON.name}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {tContent("article.readingTime", { count: minutes })}
            </span>
          </div>
        </header>

        {payload.coverImage ? (
          <figure className="mx-auto mt-8 max-w-5xl">
            <ResponsiveImage
              image={payload.coverImage}
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
                <TableOfContents items={toc} title={tContent("article.onThisPage")} variant="mobile" />
              </div>
            ) : null}
            <ArticleBody
              doc={payload.body}
              images={payload.images}
              labels={labels}
              renderAdSlot={(slot) => <AdPlaceholder slot={slot} label={labels.advertisement} />}
              onSkip={() => undefined}
            />
            <footer className="mt-12 space-y-6 border-t pt-8">
              {payload.tags.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">{tContent("article.tags")}</span>
                  <ul className="flex flex-wrap gap-2">
                    {payload.tags.map((tag) => (
                      <li key={tag.slug} className="inline-flex rounded-full border bg-card px-3 py-1 text-sm">
                        #{tag.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <AdPlaceholder slot="end-of-article" label={labels.advertisement} />
            </footer>
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-8">
              <TableOfContents items={toc} title={tContent("article.onThisPage")} variant="sidebar" />
              <AdPlaceholder slot="sidebar" label={labels.advertisement} />
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}
