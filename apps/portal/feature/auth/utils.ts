/**
 * `?next=` after sign-in (UC-04 step 7): only a same-site path is accepted,
 * otherwise the user goes to `/account`. The value is a locale-free path
 * (e.g. `/checkout/dd-pro-monthly`); a leading locale is stripped.
 */
export const DEFAULT_AFTER_SIGN_IN = "/account";

const LOCALE_PREFIX = /^\/(id|en)(?=\/|$)/;

export function safeNextPath(next: string | null | undefined, fallback = DEFAULT_AFTER_SIGN_IN): string {
  if (!next || typeof next !== "string") return fallback;
  let value = next.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  let url: URL;
  try {
    url = new URL(value, "https://same-site.invalid");
  } catch {
    return fallback;
  }
  if (url.origin !== "https://same-site.invalid") return fallback;
  const path = url.pathname.replace(LOCALE_PREFIX, "") || "/";
  if (path === "/login" || path === "/logout") return fallback;
  return `${path}${url.search}${url.hash}`;
}

/** `/login?next=<path>` for the current locale-free path. */
export function loginHref(currentPath: string, search = ""): string {
  const next = safeNextPath(`${currentPath}${search}`, "");
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}

export function initials(name: string | null | undefined, email?: string | null): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Google account settings, where the profile is edited (UC-05 step 3). */
export const GOOGLE_ACCOUNT_URL = "https://myaccount.google.com/personal-info";
