import type { Metadata } from "next";
import { Suspense } from "react";
import { isAppLocale } from "@/i18n/settings";
import { getTranslation } from "@/i18n/server";
import { CheckoutScreen } from "@/feature/billing";

// Static shell per plan code, rendered on first request; the plan and the
// payment run in the browser. No ads, noindex (from the (portal) layout).
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout/[planCode]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};
  const { t } = await getTranslation(locale, "billing");
  return { title: t("checkout.title") };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout/[planCode]">) {
  const { planCode } = await params;
  return (
    <Suspense>
      <CheckoutScreen planCode={decodeURIComponent(planCode)} />
    </Suspense>
  );
}
