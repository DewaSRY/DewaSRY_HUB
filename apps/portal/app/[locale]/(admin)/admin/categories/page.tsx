import type { Metadata } from "next";
import { isAppLocale, localeParams } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { TaxonomyScreen } from "@/feature/admin/taxonomy";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/categories">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "admin");
  return { title: t("taxonomy.categories.title") };
}

export default function Page() {
  return <TaxonomyScreen kind="categories" />;
}
