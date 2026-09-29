"use client";

import { useTranslation } from "react-i18next";
import { Copy, FilePlus2, Languages, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CONTENT_LOCALES, languageName, type ContentLocale } from "@/feature/content";

/**
 * One tab per content language. A written language shows a dot (amber when
 * it has unsaved changes or errors); a missing one shows a plus.
 */
export function LanguageTabs({
  active,
  written,
  attention,
  onSelect,
  uiLocale,
}: {
  active: ContentLocale;
  written: readonly ContentLocale[];
  /** Languages with unsaved changes or validation errors. */
  attention: readonly ContentLocale[];
  onSelect: (locale: ContentLocale) => void;
  uiLocale: string;
}) {
  const { t } = useTranslation("admin");
  return (
    <div role="tablist" aria-label={t("articles.languages.label")} className="flex items-center gap-1 overflow-x-auto border-b">
      <Languages className="mr-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
      {CONTENT_LOCALES.map((locale) => {
        const isWritten = written.includes(locale);
        const selected = locale === active;
        return (
          <button
            key={locale}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(locale)}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors",
              selected ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="font-mono text-[11px] uppercase opacity-70">{locale}</span>
            {languageName(locale, uiLocale)}
            {isWritten ? (
              <span
                aria-label={attention.includes(locale) ? t("articles.languages.needsAttention") : t("articles.languages.written")}
                className={cn("size-1.5 rounded-full", attention.includes(locale) ? "bg-warning" : "bg-success")}
              />
            ) : (
              <Plus className="size-3.5 opacity-60" aria-label={t("articles.languages.missing")} />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Shown instead of the editor for a language the article is not written in yet. */
export function StartTranslationPanel({
  locale,
  sources,
  onStart,
  uiLocale,
}: {
  locale: ContentLocale;
  /** Written languages that can be copied as a starting point. */
  sources: readonly ContentLocale[];
  onStart: (copyFrom: ContentLocale | null) => void;
  uiLocale: string;
}) {
  const { t } = useTranslation("admin");
  const language = languageName(locale, uiLocale);
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Languages className="size-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="font-semibold">{t("articles.languages.startTitle", { language })}</p>
        <p className="max-w-md text-sm text-muted-foreground">{t("articles.languages.startDescription", { language })}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {sources.map((source) => (
          <Button key={source} variant="outline" onClick={() => onStart(source)}>
            <Copy aria-hidden />
            {t("articles.languages.copyFrom", { language: languageName(source, uiLocale) })}
          </Button>
        ))}
        <Button variant={sources.length ? "ghost" : "default"} onClick={() => onStart(null)}>
          <FilePlus2 aria-hidden />
          {t("articles.languages.startBlank")}
        </Button>
      </div>
    </div>
  );
}
