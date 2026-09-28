import type { Metadata } from "next";
import { isAppLocale, localeParams } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { ProfileScreen } from "./profile-screen";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/account">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "auth");
  return { title: t("account.metaTitle") };
}

export default function AccountPage() {
  return <ProfileScreen />;
}
