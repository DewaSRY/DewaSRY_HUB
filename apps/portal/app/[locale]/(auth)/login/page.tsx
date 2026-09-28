import type { Metadata } from "next";
import { Suspense } from "react";
import { isAppLocale, localeParams } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { LoginScreen } from "@/feature/auth";
import { buildPageMetadata } from "@/lib/seo/metadata";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "auth");
  return {
    ...buildPageMetadata({ locale, path: "/login", title: t("loginMetaTitle"), description: t("loginMetaDescription") }),
    // The only indexed page of the (auth) group.
    robots: { index: true, follow: true },
  };
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}
