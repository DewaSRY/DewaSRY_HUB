import type { Metadata } from "next";
import { isAppLocale, localeParams } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { PageHeader } from "@/components/common/page-header";
import { SubscriptionsList } from "@/feature/billing";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/account/subscriptions">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "billing");
  return { title: t("subscriptions.title") };
}

export default async function SubscriptionsPage({ params }: PageProps<"/[locale]/account/subscriptions">) {
  const { locale } = await params;
  const { t } = await getTranslation(isAppLocale(locale) ? locale : "id", "billing");
  return (
    <div className="space-y-6">
      <PageHeader title={t("subscriptions.title")} description={t("subscriptions.description")} />
      <SubscriptionsList />
    </div>
  );
}
