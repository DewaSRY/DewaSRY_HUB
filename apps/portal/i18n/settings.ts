export const locales = ["id", "en"] as const;
export const defaultLocale: AppLocale = "id";

export type AppLocale = (typeof locales)[number];

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}

/**
 * One namespace per feature (ADR-008 §6.1), plus `common` (shared UI) and
 * `site` (public nav, footer, home/about copy). Add a namespace here and a
 * JSON file in both `messages/id` and `messages/en`.
 */
export const namespaces = [
  "common",
  "site",
  "content",
  "product",
  "auth",
  "billing",
  "admin",
] as const;

/** Namespaces the root layout ships to the browser (`admin` is added by the admin layout). */
export const CLIENT_NAMESPACES = namespaces.filter((ns) => ns !== "admin");

/** `generateStaticParams` result for pages that only depend on the locale. */
export function localeParams(): { locale: AppLocale }[] {
  return locales.map((locale) => ({ locale }));
}

export type AppNamespace = (typeof namespaces)[number];
export const defaultNamespace: AppNamespace = "common";

export function getI18nOptions(
  locale: AppLocale = defaultLocale,
  ns: AppNamespace | readonly AppNamespace[] = defaultNamespace,
) {
  return {
    supportedLngs: locales,
    fallbackLng: defaultLocale,
    lng: locale,
    fallbackNS: defaultNamespace,
    defaultNS: defaultNamespace,
    ns,
    interpolation: {
      escapeValue: false,
    },
  };
}
