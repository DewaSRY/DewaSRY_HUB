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
export default async function ArticlePreviewPage({ params }: PageProps<"/[locale]/admin/articles/[id]/preview">) {
  const id = decodeURIComponent((await params).id);
  return <ArticlePreviewScreen id={id === "new" ? null : id} />;
}
