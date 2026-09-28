import type { Metadata } from "next";
import { Suspense } from "react";
import { isAppLocale, localeParams } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { SsoAuthorizeScreen } from "@/feature/sso";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: PageProps<"/[locale]/sso/authorize">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "auth");
  return { title: t("sso.metaTitle") };
}

export default function SsoAuthorizePage() {
  return (
    <Suspense>
      <SsoAuthorizeScreen />
    </Suspense>
  );
}
