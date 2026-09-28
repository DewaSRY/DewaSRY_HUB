"use client";

import { useState } from "react";
import { Menu, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, usePathname } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/components/common/locale-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { cn } from "@/lib/utils";
import { BrandWordmark } from "./brand-logo";

const LINKS = [
  { href: "/", key: "nav.home", exact: true },
  { href: "/blog", key: "nav.blog" },
  { href: "/products", key: "nav.products" },
  { href: "/about", key: "nav.about" },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Public navigation. It does not load Firebase (the account link goes to
 * `/account`, whose guard sends visitors to sign in), so public pages stay light.
 */
export function SiteNav() {
  const { t } = useTranslation("site");
  const { t: tCommon } = useTranslation("common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/65">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={tCommon("appName")}>
          <BrandWordmark name={tCommon("appName")} />
        </Link>

        <nav aria-label={t("nav.label")} className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href, "exact" in link ? link.exact : false);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-foreground",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t(link.key)}
                {active ? <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-primary" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link href="/account" className={buttonVariants({ size: "sm", className: "ml-1" })}>
            <UserRound aria-hidden />
            {t("nav.account")}
          </Link>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t("nav.menu")}
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" aria-hidden />
          </Button>
          <SheetContent side="right" className="w-full sm:max-w-xs">
            <SheetHeader>
              <SheetTitle>
                <BrandWordmark name={tCommon("appName")} />
              </SheetTitle>
            </SheetHeader>
            <nav aria-label={t("nav.label")} className="flex flex-col gap-1 px-4">
              {LINKS.map((link) => (
                <SheetClose
                  key={link.href}
                  nativeButton={false}
                  render={<Link href={link.href} />}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-base font-medium transition-colors hover:bg-muted",
                    isActive(pathname, link.href, "exact" in link ? link.exact : false) ? "bg-muted text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t(link.key)}
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3 border-t p-4">
              <div className="flex items-center justify-between rounded-md border bg-muted/30 p-1.5">
                <LocaleSwitcher />
                <ThemeToggle />
              </div>
              <SheetClose nativeButton={false} render={<Link href="/account" />} className={buttonVariants({ className: "w-full" })}>
                <UserRound aria-hidden />
                {t("nav.account")}
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
