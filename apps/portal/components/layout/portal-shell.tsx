"use client";

import type { ReactNode } from "react";
import { CreditCard, Receipt, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/common/locale-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMenu } from "@/feature/auth";
import { cn } from "@/lib/utils";
import { BrandWordmark } from "./brand-logo";

const TABS = [
  { href: "/account", key: "portal.profile", icon: UserRound, exact: true },
  { href: "/account/subscriptions", key: "portal.subscriptions", icon: CreditCard },
  { href: "/account/transactions", key: "portal.transactions", icon: Receipt },
] as const;

function PortalHeader({ showTabs = true }: { showTabs?: boolean }) {
  const { t } = useTranslation("site");
  const { t: tCommon } = useTranslation("common");
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="rounded-md" aria-label={tCommon("appName")}>
          <BrandWordmark name={tCommon("appName")} />
        </Link>
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <UserMenu />
        </div>
      </div>
      {showTabs ? (
        <nav aria-label={t("portal.navLabel")} className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map((tab) => {
            const active = "exact" in tab && tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon className="size-4" aria-hidden />
                {t(tab.key)}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}

/** Signed-in user portal shell: header, tabs, and a centered content column. */
export function PortalShell({ children, showTabs = true }: { children: ReactNode; showTabs?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PortalHeader showTabs={showTabs} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

/** What `<AuthGate>` shows while the session loads: the shell with skeletons. */
export function PortalShellSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PortalHeader showTabs />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-8 sm:px-6" aria-busy>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="mt-6 h-48 w-full rounded-xl" />
      </main>
    </div>
  );
}
