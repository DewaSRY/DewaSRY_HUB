import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, defaultLocale, isAppLocale, type AppLocale } from "./i18n/settings";

/**
 * Locale redirect only (ADR-008 §7.2). There is no session cookie: portal and
 * admin pages are guarded in the browser by `<AuthGate>`, and the API checks
 * every request.
 */

function preferredLocale(request: NextRequest): AppLocale {
  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase().slice(0, 2);
    if (tag && isAppLocale(tag)) return tag;
  }
  return defaultLocale;
}

function hasLocale(pathname: string): boolean {
  return locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (hasLocale(pathname)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, Next internals, and files with an extension (sitemap.xml, ads.txt, …).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
