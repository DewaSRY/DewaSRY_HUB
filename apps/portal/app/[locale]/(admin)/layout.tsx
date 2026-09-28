import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAppLocale } from "@/i18n/settings";
import { getMessages } from "@/i18n/server";
import { AuthProvider } from "@/providers/auth-provider";
import { ExtraTranslations } from "@/providers/translations-provider";
import { AuthGate } from "@/feature/auth";
import { AdminShell, AdminShellSkeleton } from "@/components/layout/admin-shell";
import { NOINDEX } from "@/lib/seo/metadata";

/**
 * `(admin)`: `<AuthGate role="ADMIN">`, AdminShell, noindex, no ads
 * (ADR-008 §4.1). `feature/admin/**` is imported only below this folder
 * (rule I4), and the `admin` strings are only sent to these pages.
 */
export const metadata: Metadata = {
  robots: NOINDEX,
  title: { default: "Admin", template: "%s · Admin | Dewa Surya Hub" },
};

export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  const messages = await getMessages(locale, ["admin"]);

  return (
    <ExtraTranslations locale={locale} messages={messages}>
      <AuthProvider>
        <AuthGate role="ADMIN" fallback={<AdminShellSkeleton />}>
          <AdminShell>{children}</AdminShell>
        </AuthGate>
      </AuthProvider>
    </ExtraTranslations>
  );
}
