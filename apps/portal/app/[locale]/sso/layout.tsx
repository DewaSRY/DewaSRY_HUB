import type { Metadata } from "next";
import { AuthProvider } from "@/providers/auth-provider";
import { AuthBackdrop } from "@/feature/auth";
import { NOINDEX } from "@/lib/seo/metadata";

export const metadata: Metadata = { robots: NOINDEX };

export default function SsoLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <AuthProvider>
      <AuthBackdrop>
        <div className="flex min-h-screen items-center justify-center">{children}</div>
      </AuthBackdrop>
    </AuthProvider>
  );
}
