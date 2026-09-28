import { notFound } from "next/navigation";
import { isAppLocale } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { SiteNav } from "@/components/layout/site-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { AdScript } from "@/components/ads/ad-script";

/**
 * Public site: static / ISR, indexed, and the only place ads load
 * (ADR-008 §4.1, rules I6 and D5).
 */
export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  const { t } = await getTranslation(locale, "site");
  const { t: tCommon } = await getTranslation(locale, "common");

  return (
    <>
      <SiteNav />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter
        labels={{
          appName: tCommon("appName"),
          tagline: t("footer.tagline"),
          explore: t("footer.explore"),
          account: t("footer.account"),
          blog: t("nav.blog"),
          products: t("nav.products"),
          about: t("nav.about"),
          signIn: t("footer.signIn"),
          subscriptions: t("footer.subscriptions"),
          transactions: t("footer.transactions"),
          rights: t("footer.rights"),
        }}
      />
      <AdScript />
    </>
  );
}
