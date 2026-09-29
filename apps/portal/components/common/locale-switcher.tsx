"use client";

import { Check, Languages } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { locales, type AppLocale } from "@/i18n/settings";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useNavigationGuardStore } from "@/components/common/navigation-guard/store";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  id: "Bahasa Indonesia",
};

export function LocaleSwitcher() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ locale?: string }>();
  const current = params?.locale;
  const requestNavigation = useNavigationGuardStore((s) => s.requestNavigation);

  function handleLocaleChange(nextLocale: AppLocale) {
    if (nextLocale === current) return;
    // Switching language reloads the page content, so it respects the unsaved-changes guard.
    requestNavigation(() => router.replace(pathname, { locale: nextLocale }));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" aria-label={t("language")} />
        }
      >
        <Languages aria-hidden />
        <span className="font-semibold uppercase">{current}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {locales.map((loc) => (
          <DropdownMenuItem key={loc} onClick={() => handleLocaleChange(loc)}>
            <span className="w-6 text-xs font-semibold text-muted-foreground uppercase">
              {loc}
            </span>
            {LOCALE_LABELS[loc]}
            {loc === current && <Check className="ml-auto" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
