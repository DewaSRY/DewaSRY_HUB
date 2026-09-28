import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight, ExternalLink, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { isAppLocale } from "@/i18n/settings";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AdSlot } from "@/components/ads/ad-slot";
import { PlanCard, isFreePlan, sortPlans } from "@/feature/product";
import { getProduct } from "@/feature/product/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { siteLabels } from "../../_lib/labels";

export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/products/[productCode]">): Promise<Metadata> {
  const { locale, productCode } = await params;
  if (!isAppLocale(locale)) return {};
  const result = await getProduct(productCode);
  if (result.kind === "not-found") notFound();
  const { product } = result;
  return buildPageMetadata({
    locale,
    path: `/products/${product.code}`,
    title: product.name,
    description: product.description ?? product.name,
  });
}

export default async function ProductPage({ params }: PageProps<"/[locale]/products/[productCode]">) {
  const { locale, productCode } = await params;
  if (!isAppLocale(locale)) notFound();
  const result = await getProduct(productCode);
  if (result.kind === "not-found") notFound();
  const { product } = result;
  const labels = await siteLabels(locale);
  const t = labels.tProduct;
  const plans = sortPlans(product.plans);
  const highlightedCode = plans.find((plan) => !isFreePlan(plan))?.code;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-14 px-4 py-14 sm:px-6">
      <header className="space-y-5">
        <nav aria-label={t("detail.breadcrumb")} className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/products" className="hover:text-foreground">
            {t("list.title")}
          </Link>
          <ChevronRight className="size-3.5 opacity-60" aria-hidden />
          <span className="text-foreground">{product.name}</span>
        </nav>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{product.name}</h1>
        {product.description ? <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{product.description}</p> : null}
        {product.websiteUrl ? (
          <a href={product.websiteUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>
            {t("card.learnMore")}
            <ExternalLink aria-hidden />
          </a>
        ) : null}
      </header>

      <section aria-labelledby="plans-heading" className="space-y-6">
        <div className="space-y-1">
          <h2 id="plans-heading" className="text-2xl font-semibold tracking-tight">
            {t("detail.plansTitle")}
          </h2>
          <p className="text-muted-foreground">{t("detail.plansDescription")}</p>
        </div>
        {plans.length ? (
          <div className="grid gap-6 pt-3 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} product={product} plan={plan} labels={labels.plan} highlighted={plan.code === highlightedCode} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{t("detail.noPlans")}</p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Wallet, key: "oneTime" },
          { icon: ShieldCheck, key: "secure" },
          { icon: Sparkles, key: "sso" },
        ].map(({ icon: Icon, key }) => (
          <div key={key} className="rounded-2xl border bg-card p-5">
            <Icon className="size-5 text-primary" aria-hidden />
            <h3 className="mt-3 font-semibold">{t(`detail.points.${key}.title`)}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(`detail.points.${key}.description`)}</p>
          </div>
        ))}
      </section>

      <AdSlot slot="list" label={labels.body.advertisement} />
    </div>
  );
}
