"use client";

import { useTranslation } from "react-i18next";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/common/locale-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { BrandWordmark } from "@/components/layout/brand-logo";

export function AuthTopBar() {
  const { t } = useTranslation("common");
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
      <Link href="/" aria-label={t("backToHome")} className="rounded-md">
        <BrandWordmark name={t("appName")} />
      </Link>
      <div className="flex items-center gap-1">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
