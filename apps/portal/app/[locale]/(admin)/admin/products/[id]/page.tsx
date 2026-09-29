import type { Metadata } from "next";
import { isAppLocale } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { ProductDetailScreen } from "@/feature/admin/products";

// Client-rendered shell; the product is read in the browser (no server fetch, no token).
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/products/[id]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "admin");
  return { title: t("products.detail.title") };
}

export default async function ProductPage({ params }: PageProps<"/[locale]/admin/products/[id]">) {
  const { id } = await params;
  return <ProductDetailScreen id={decodeURIComponent(id)} />;
}
