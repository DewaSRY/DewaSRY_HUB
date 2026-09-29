import type { Metadata } from "next";
import { isAppLocale } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { ArticlePreviewScreen } from "@/feature/admin/articles";

// Client-rendered shell; the article is read in the browser (no server fetch, no token).
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/articles/[id]/preview">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "admin");
  return { title: t("articles.previewScreen.metaTitle") };
}

/** `/admin/articles/[id]/preview` — `new` previews an article that has not been saved yet. */
/** `?lang=en` picks the language to preview (default: the first one the article has). */
export default async function ArticlePreviewPage({ params, searchParams }: PageProps<"/[locale]/admin/articles/[id]/preview">) {
  const { id: rawId, locale } = await params;
  const id = decodeURIComponent(rawId);
  const lang = (await searchParams).lang;
  return <ArticlePreviewScreen id={id === "new" ? null : id} lang={typeof lang === "string" ? lang : null} uiLocale={locale} />;
}
