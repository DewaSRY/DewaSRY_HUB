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

async function loadMessages(
  locale: AppLocale,
  only: readonly AppNamespace[] = namespaces,
) {
  const entries = await Promise.all(
    only.map(async (ns) => {
      const mod = await import(`../messages/${locale}/${ns}.json`);
      return [ns, mod.default] as const;
    }),
  );

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
