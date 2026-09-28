import type { Metadata } from "next";
import { AuthProvider } from "@/providers/auth-provider";
import { AuthBackdrop } from "@/feature/auth";
import { NOINDEX } from "@/lib/seo/metadata";
import { AuthTopBar } from "./auth-top-bar";

// `(auth)` pages are static shells with client sign-in; noindex except /login (ADR-008 §8).
export const metadata: Metadata = { robots: NOINDEX };

export default function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <AuthProvider>
      <AuthBackdrop>
        <div className="flex min-h-screen flex-col">
          <AuthTopBar />
          <div className="flex flex-1 items-center justify-center">{children}</div>
        </div>
      </AuthBackdrop>
    </AuthProvider>
  );
}
