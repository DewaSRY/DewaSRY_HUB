import type { Metadata } from "next";
import { isAppLocale, localeParams } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { ArticleEditorPage } from "@/feature/admin/articles";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/articles/new">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "admin");
  return { title: t("articles.new") };
}

/** Editor in create mode: the first Save creates the draft and moves to `/[id]`. */
export default function NewArticlePage() {
  return <ArticleEditorPage id={null} />;
}
