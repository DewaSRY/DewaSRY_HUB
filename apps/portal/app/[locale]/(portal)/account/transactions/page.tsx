import type { Metadata } from "next";
import { Suspense } from "react";
import { isAppLocale, localeParams } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { PageHeader } from "@/components/common/page-header";
import { TransactionsList } from "@/feature/billing";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/account/transactions">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "billing");
  return { title: t("transactions.title") };
}

export default async function TransactionsPage({ params }: PageProps<"/[locale]/account/transactions">) {
  const { locale } = await params;
  const { t } = await getTranslation(isAppLocale(locale) ? locale : "id", "billing");
  return (
    <div className="space-y-6">
      <PageHeader title={t("transactions.title")} description={t("transactions.description")} />
      <Suspense>
        <TransactionsList />
      </Suspense>
    </div>
  );
}
