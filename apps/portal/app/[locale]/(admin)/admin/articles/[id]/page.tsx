import type { Metadata } from "next";
import { isAppLocale } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { ArticleEditorPage } from "@/feature/admin/articles";

// Client-rendered shell; the article is read in the browser (no server fetch, no token).
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/articles/[id]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "admin");
  return { title: t("articles.editor.metaTitle") };
}

export default async function EditArticlePage({ params }: PageProps<"/[locale]/admin/articles/[id]">) {
  const id = decodeURIComponent((await params).id);
  return <ArticleEditorPage key={id} id={id} />;
}
