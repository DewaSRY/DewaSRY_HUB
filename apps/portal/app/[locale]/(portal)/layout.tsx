import type { Metadata } from "next";
import { AuthProvider } from "@/providers/auth-provider";
import { AuthGate } from "@/feature/auth";
import { PortalShellSkeleton } from "@/components/layout/portal-shell";
import { NOINDEX } from "@/lib/seo/metadata";

/**
 * `(portal)`: signed-in user pages. Client-guarded static shells — no server
 * prefetch (the server has no Firebase token), `noindex`, no ads (ADR-008 S5).
 */
export const metadata: Metadata = { robots: NOINDEX };

export default function PortalLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <AuthProvider>
      <AuthGate fallback={<PortalShellSkeleton />}>{children}</AuthGate>
    </AuthProvider>
  );
}
