import { locales, type AppLocale } from "@/i18n/settings";

/**
 * Languages an article can be written in — the same list as the site
 * locales (`/id/…`, `/en/…`) and the API's `hub.content.locales`. The first
 * one is the API's fallback when a translation is missing.
 */
export const CONTENT_LOCALES: readonly AppLocale[] = locales;
export type ContentLocale = AppLocale;

export function isContentLocale(value: string): value is ContentLocale {
  return (CONTENT_LOCALES as readonly string[]).includes(value);
}

/** `id` → "Indonesian" / "Bahasa Indonesia", in the reader's UI language. */
export function languageName(code: string, displayLocale: string): string {
  try {
    const name = new Intl.DisplayNames([displayLocale], { type: "language" }).of(code);
    return name ? name.charAt(0).toLocaleUpperCase(displayLocale) + name.slice(1) : code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** Keeps `values` that are content locales, in `CONTENT_LOCALES` order. */
export function sortLocales(values: readonly string[]): ContentLocale[] {
  return CONTENT_LOCALES.filter((locale) => values.includes(locale));
}
