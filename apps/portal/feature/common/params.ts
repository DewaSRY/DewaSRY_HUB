import type { SearchParamsRecord } from "./type";

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Positive integer from a search param, else `defaultValue`. */
export function parseIntParam(value: string | string[] | undefined, defaultValue: number): number {
  const raw = firstParam(value);
  if (raw === undefined || raw === "") return defaultValue;
  if (!/^\d+$/.test(raw.trim())) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}

export function parseStringParam(value: string | string[] | undefined): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? value.join(",") : value;
}

export function parseArrayParam(value: string | string[] | undefined, defaultValue: string[] = []): string[] {
  if (value === undefined) return defaultValue;
  if (Array.isArray(value)) return value.filter(Boolean);
  return value.split(",").filter(Boolean);
}

/** `?page=n` for public lists (1-based, ADR-003 §3.4). */
export function parsePageParam(searchParams: SearchParamsRecord | undefined): number {
  return parseIntParam(searchParams?.page, 1);
}
