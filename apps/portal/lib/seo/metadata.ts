import type { Metadata } from "next";
import { locales, type AppLocale } from "@/i18n/settings";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
export const SITE_NAME = "Dewa Surya Hub";

/** `robots` for every page that must not be indexed (portal, admin, sso, checkout). */
export const NOINDEX: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

function normalizePath(path: string): string {
  if (!path || path === "/") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

/** Builds `alternates.languages` for a locale-agnostic path, e.g. "/blog". */
export function buildLanguageAlternates(path: string): Record<string, string> {
  const normalized = normalizePath(path);
  return {
    ...Object.fromEntries(locales.map((locale) => [locale, `${SITE_URL}/${locale}${normalized}`])),
    "x-default": `${SITE_URL}/${locales[0]}${normalized}`,
  };
}

export function canonicalFor(locale: AppLocale, path: string): string {
  return `${SITE_URL}/${locale}${normalizePath(path)}`;
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export interface OgImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export const DEFAULT_OG_IMAGE: OgImage = {
  url: "/icons/android-chrome-512x512.png",
  width: 512,
  height: 512,
  alt: SITE_NAME,
};

/** Standard metadata for a public `(site)` page: canonical, hreflang, OG, Twitter. */
export function buildPageMetadata(options: {
  locale: AppLocale;
  path: string;
  title: string;
  description: string;
  absoluteTitle?: boolean;
  image?: OgImage | null;
  type?: "website" | "article";
  publishedTime?: string | null;
  modifiedTime?: string | null;
  tags?: string[];
  section?: string;
  canonical?: string | null;
}): Metadata {
  const {
    locale,
    path,
    title,
    description,
    absoluteTitle,
    image,
    type = "website",
  } = options;
  const canonical = options.canonical || canonicalFor(locale, path);
  const og = image ?? DEFAULT_OG_IMAGE;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical, languages: buildLanguageAlternates(path) },
    openGraph: {
      title,
      description,
      type,
      url: canonical,
      siteName: SITE_NAME,
      locale: locale === "id" ? "id_ID" : "en_US",
      images: [og],
      ...(type === "article"
        ? {
            publishedTime: options.publishedTime ?? undefined,
            modifiedTime: options.modifiedTime ?? undefined,
            tags: options.tags,
            section: options.section,
          }
        : {}),
    },
    twitter: {
      card: og.width && og.width >= 800 ? "summary_large_image" : "summary",
      title,
      description,
      images: [og.url],
    },
  };
}
