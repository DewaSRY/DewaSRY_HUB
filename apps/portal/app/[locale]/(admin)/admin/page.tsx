import type { Metadata } from "next";
import { isAppLocale, localeParams } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { AdminDashboard } from "./dashboard";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "admin");
  return { title: t("dashboard.title") };
}

export default function AdminPage() {
  return <AdminDashboard />;
}
