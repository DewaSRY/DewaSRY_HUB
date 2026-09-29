import type { Metadata } from "next";
import { isAppLocale } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { UserDetailScreen } from "@/feature/admin/users";

// Client-rendered shell; the user is read in the browser (no server fetch, no token).
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/users/[id]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "admin");
  return { title: t("users.detail.title") };
}

export default async function UserPage({ params }: PageProps<"/[locale]/admin/users/[id]">) {
  const { id } = await params;
  return <UserDetailScreen id={decodeURIComponent(id)} />;
}
