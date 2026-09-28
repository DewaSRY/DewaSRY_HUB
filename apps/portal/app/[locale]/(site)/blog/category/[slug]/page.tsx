import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAppLocale } from "@/i18n/settings";
import { parsePageParam } from "@/feature/common";
import { TaxonomyPage, taxonomyMetadata } from "../../../_lib/taxonomy-page";

// `?page=n` makes this page dynamic; the API reads are still cached by the
// fetch Data Cache and refreshed by POST /api/revalidate (UC-03, UC-20).
export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/blog/category/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) return {};
  return taxonomyMetadata("category", locale, slug, parsePageParam(await searchParams));
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[locale]/blog/category/[slug]">) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale)) notFound();
  return <TaxonomyPage kind="category" locale={locale} slug={slug} page={parsePageParam(await searchParams)} />;
}
