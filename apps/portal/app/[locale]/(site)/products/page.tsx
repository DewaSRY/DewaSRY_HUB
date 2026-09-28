import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CloudOff, PackageOpen } from "lucide-react";
import { isAppLocale } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { SectionHeading } from "@/components/landing/section-heading";
import { AdSlot } from "@/components/ads/ad-slot";
import { ProductCard } from "@/feature/product";
import { listProducts } from "@/feature/product/server";
import { readOrFallback } from "@/lib/api/public-fetch";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteLabels } from "../_lib/labels";

export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/products">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "product");
  return buildPageMetadata({ locale, path: "/products", title: t("list.metaTitle"), description: t("list.metaDescription") });
}

export default async function ProductsPage({ params }: PageProps<"/[locale]/products">) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  const labels = await siteLabels(locale);
  const t = labels.tProduct;
  const products = await readOrFallback(() => listProducts(), []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-14 sm:px-6">
      <SectionHeading as="h1" eyebrow={t("list.eyebrow")} title={t("list.title")} description={t("list.description")} />
      {products.unavailable ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
          <CloudOff className="size-6" aria-hidden />
          {t("list.unavailable")}
        </div>
      ) : products.data.length ? (
        <div className="grid gap-6 md:grid-cols-2">
          {products.data.map((product) => (
            <ProductCard key={product.code} product={product} labels={labels.productCard} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
          <PackageOpen className="size-6 text-muted-foreground" aria-hidden />
          <p className="font-semibold">{t("list.empty")}</p>
        </div>
      )}
      <AdSlot slot="list" label={labels.body.advertisement} />
    </div>
  );
}
