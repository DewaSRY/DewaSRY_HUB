import "server-only";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next/initReactI18next";
import {
  CLIENT_NAMESPACES,
  getI18nOptions,
  namespaces,
  type AppLocale,
  type AppNamespace,
} from "./settings";

/**
 * A namespace can be split over several files (`admin.json`,
 * `admin-commerce.json`, …) so each admin sub-feature owns its strings. The
 * files are merged by top-level key into one namespace.
 */
const NAMESPACE_FILES: Partial<Record<AppNamespace, string[]>> = {
  admin: ["admin", "admin-commerce", "admin-editor"],
};

async function loadNamespace(locale: AppLocale, ns: AppNamespace) {
  const files = NAMESPACE_FILES[ns] ?? [ns];
  const parts = await Promise.all(
    files.map(async (file) => (await import(`../messages/${locale}/${file}.json`)).default as Record<string, unknown>),
  );
  return Object.assign({}, ...parts) as Record<string, unknown>;
}

async function loadMessages(
  locale: AppLocale,
  only: readonly AppNamespace[] = namespaces,
) {
  const entries = await Promise.all(only.map(async (ns) => [ns, await loadNamespace(locale, ns)] as const));
  return Object.fromEntries(entries);
}

/**
 * Messages sent to the browser. The root layout sends every namespace except
 * `admin`; the `(admin)` layout adds `admin` so visitors never download it.
 */
export async function getMessages(
  locale: AppLocale,
  only: readonly AppNamespace[] = CLIENT_NAMESPACES,
) {
  return loadMessages(locale, only);
}

export async function getTranslation(
  locale: AppLocale,
  ns: AppNamespace = "common",
) {
  const instance = createInstance();
  const resources = await loadMessages(locale);

  await instance.use(initReactI18next).init({
    ...getI18nOptions(locale, namespaces),
    resources: { [locale]: resources },
  });

  return {
    t: instance.getFixedT(locale, ns),
    i18n: instance,
  };
}
