/** Pure helpers for `app/api/revalidate/route.ts` (unit-tested). */

const MAX_PATHS = 200;
const LOCALE_FREE_PATHS = new Set(["/sitemap.xml", "/robots.txt"]);

/** Constant-time comparison of the shared secret. An unset secret never matches. */
export function isValidSecret(given: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !given) return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export type ParsedBody = { ok: true; paths: string[] } | { ok: false; message: string };

export function parseRevalidateBody(body: unknown): ParsedBody {
  if (typeof body !== "object" || body === null || !Array.isArray((body as { paths?: unknown }).paths)) {
    return { ok: false, message: "Body must be { paths: string[] }." };
  }
  const paths = (body as { paths: unknown[] }).paths;
  if (paths.length === 0) return { ok: false, message: "At least one path is required." };
  if (paths.length > MAX_PATHS) return { ok: false, message: `At most ${MAX_PATHS} paths.` };
  const clean: string[] = [];
  for (const path of paths) {
    if (typeof path !== "string" || !path.startsWith("/") || path.length > 1024 || path.includes("..")) {
      return { ok: false, message: "Every path must be a site path starting with '/'." };
    }
    clean.push(path.length > 1 ? path.replace(/\/+$/, "") : path);
  }
  return { ok: true, paths: Array.from(new Set(clean)) };
}

/**
 * `/blog/x` → `/id/blog/x`, `/en/blog/x`; `/` → `/id`, `/en`;
 * `/sitemap.xml` stays as it is.
 */
export function expandRevalidatePaths(paths: string[], locales: readonly string[]): string[] {
  const result = new Set<string>();
  for (const path of paths) {
    if (LOCALE_FREE_PATHS.has(path)) {
      result.add(path);
      continue;
    }
    for (const locale of locales) result.add(path === "/" ? `/${locale}` : `/${locale}${path}`);
  }
  return Array.from(result);
}
