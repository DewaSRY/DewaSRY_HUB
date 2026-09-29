import type { Metadata } from "next";
import { isAppLocale } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { TransactionDetailScreen } from "@/feature/admin/transactions";

// Client-rendered shell; the order id is read in the browser (no server fetch, no token).
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/transactions/[orderId]">): Promise<Metadata> {
  const { locale, orderId } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "admin");
  return { title: t("transactions.detail.metaTitle", { orderId: decodeURIComponent(orderId) }) };
}

export default async function AdminTransactionPage({ params }: PageProps<"/[locale]/admin/transactions/[orderId]">) {
  const { orderId } = await params;
  return <TransactionDetailScreen orderId={decodeURIComponent(orderId)} />;
}
