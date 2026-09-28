import type { Metadata } from "next";
import { Suspense } from "react";
import { isAppLocale, localeParams } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { MediaLibraryScreen } from "@/feature/admin/media";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/media">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "admin");
  return { title: t("media.title") };
}

export default function MediaPage() {
  return (
    <Suspense>
      <MediaLibraryScreen />
    </Suspense>
  );
}
