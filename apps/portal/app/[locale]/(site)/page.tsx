import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, CloudOff } from "lucide-react";
import { isAppLocale } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/components/common/json-ld";
import { HeroSection } from "@/components/landing/hero-section";
import { SectionHeading } from "@/components/landing/section-heading";
import { SkillsGrid } from "@/components/landing/skills-section";
import { ArticleCard } from "@/feature/content";
import { ProductCard } from "@/feature/product";
import { listArticles } from "@/feature/content/server";
import { listProducts } from "@/feature/product/server";
import { readOrFallback } from "@/lib/api/public-fetch";
import { emptyPage } from "@/lib/api/envelope";
import { buildPageMetadata, canonicalFor } from "@/lib/seo/metadata";
import { websiteJsonLd } from "@/lib/seo/json-ld";
import { siteLabels } from "./_lib/labels";

// ISR: rendered on the first request per locale, never at build (the API may
// be down during `next build`); refreshed by POST /api/revalidate or hourly.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "site");
  return buildPageMetadata({
    locale,
    path: "/",
    title: t("home.metaTitle"),
    description: t("home.metaDescription"),
    absoluteTitle: true,
  });
}

function Unavailable({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
      <CloudOff className="size-5 shrink-0" aria-hidden />
      {message}
    </div>
  );
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  const { t } = await getTranslation(locale, "site");
  const labels = await siteLabels(locale);

  const [articles, products] = await Promise.all([
    readOrFallback(() => listArticles({ page: 1, limit: 4 }), emptyPage(1, 4)),
    readOrFallback(() => listProducts(), []),
  ]);
  const [featured, ...rest] = articles.data.data;

  const skills = (["frontend", "backend", "data", "cloud", "security", "craft"] as const).map((key) => ({
    title: t(`skills.${key}.title`),
    description: t(`skills.${key}.description`),
  }));

  return (
    <>
      <JsonLd data={websiteJsonLd(canonicalFor(locale, "/"))} />
      <HeroSection
        labels={{
          badge: t("home.hero.badge"),
          title: t("home.hero.title"),
          highlight: t("home.hero.highlight"),
          description: t("home.hero.description"),
          primaryCta: t("home.hero.primaryCta"),
          secondaryCta: t("home.hero.secondaryCta"),
          stackLabel: t("home.hero.stackLabel"),
        }}
      />

      <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow={t("home.latest.eyebrow")}
          title={t("home.latest.title")}
          description={t("home.latest.description")}
          action={
            <Link href="/blog" className={buttonVariants({ variant: "outline" })}>
              {t("home.latest.viewAll")}
              <ArrowRight aria-hidden />
            </Link>
          }
        />
        {articles.unavailable ? (
          <Unavailable message={t("home.latest.unavailable")} />
        ) : featured ? (
          <div className="grid gap-6">
            <ArticleCard article={featured} locale={locale} variant="featured" priority />
            {rest.length ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((article) => (
                  <ArticleCard key={article.id} article={article} locale={locale} />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <Unavailable message={t("home.latest.empty")} />
        )}
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-20 sm:px-6">
          <SectionHeading eyebrow={t("home.skills.eyebrow")} title={t("home.skills.title")} description={t("home.skills.description")} />
          <SkillsGrid items={skills} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-8 px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow={t("home.products.eyebrow")}
          title={t("home.products.title")}
          description={t("home.products.description")}
          action={
            <Link href="/products" className={buttonVariants({ variant: "outline" })}>
              {t("home.products.viewAll")}
              <ArrowRight aria-hidden />
            </Link>
          }
        />
        {products.unavailable ? (
          <Unavailable message={t("home.products.unavailable")} />
        ) : products.data.length ? (
          <div className="grid gap-6 md:grid-cols-2">
            {products.data.map((product) => (
              <ProductCard key={product.code} product={product} labels={labels.productCard} />
            ))}
          </div>
        ) : (
          <Unavailable message={t("home.products.empty")} />
        )}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-brand-surface px-6 py-14 text-brand-surface-foreground sm:px-12">
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative max-w-2xl space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">{t("home.cta.title")}</h2>
            <p className="text-brand-surface-foreground/80">{t("home.cta.description")}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/about" className={buttonVariants({ size: "lg", variant: "secondary" })}>
                {t("home.cta.about")}
              </Link>
              <Link
                href="/login"
                className={buttonVariants({ size: "lg", variant: "outline", className: "border-white/30 bg-transparent text-brand-surface-foreground hover:bg-white/10 hover:text-brand-surface-foreground" })}
              >
                {t("home.cta.signIn")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
