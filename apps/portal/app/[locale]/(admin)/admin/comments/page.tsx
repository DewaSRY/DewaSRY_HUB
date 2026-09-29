import type { Metadata } from "next";
import { Suspense } from "react";
import { isAppLocale, localeParams } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { CommentsScreen } from "@/feature/admin/comments";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/comments">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "admin");
  return { title: t("comments.title") };
}

export default function CommentsPage() {
  return (
    <Suspense>
      <CommentsScreen />
    </Suspense>
  );
}
