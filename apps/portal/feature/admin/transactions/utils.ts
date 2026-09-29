import { DEFAULT_TIME_ZONE } from "@/lib/datetime";
import type { TransactionStatus } from "@/feature/billing";

/** `YYYY-MM-DD` that is a real calendar day. */
export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Offset of `timeZone` from UTC at `instant`, in ms (`+7h` for Asia/Jakarta). */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Midnight of `isoDate` in `timeZone`, as a UTC ISO instant. */
export function zonedDayStart(isoDate: string, timeZone = DEFAULT_TIME_ZONE, addDays = 0): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d + addDays);
  // Two passes so a DST change on that day still lands on local midnight.
  let instant = utcMidnight - zoneOffsetMs(utcMidnight, timeZone);
  instant = utcMidnight - zoneOffsetMs(instant, timeZone);
  return new Date(instant).toISOString();
}

/**
 * The API reads a plain `YYYY-MM-DD` as a UTC day. The admin picks days in
 * the display zone (WIB), so we send instants: `from` = start of that day,
 * `to` = start of the day after (the API's `to` is exclusive).
 */
export function dateRangeToInstants(
  from: string | null | undefined,
  to: string | null | undefined,
  timeZone = DEFAULT_TIME_ZONE,
): { from?: string; to?: string } {
  return {
    from: isIsoDate(from) ? zonedDayStart(from, timeZone) : undefined,
    to: isIsoDate(to) ? zonedDayStart(to, timeZone, 1) : undefined,
  };
}

/** `true` when both days are set and `from` is after `to`. */
export function isInvertedRange(from: string | null | undefined, to: string | null | undefined): boolean {
  return isIsoDate(from) && isIsoDate(to) && from > to;
}

/** Adds or removes `status` from the selected set, keeping the canonical order. */
export function toggleStatus(
  selected: readonly TransactionStatus[],
  status: TransactionStatus,
  order: readonly TransactionStatus[],
): TransactionStatus[] {
  const next = new Set(selected);
  if (next.has(status)) next.delete(status);
  else next.add(status);
  return order.filter((item) => next.has(item));
}

export const ADMIN_TRANSACTION_SORTS = ["createdAt,desc", "createdAt,asc", "amount,desc", "amount,asc"] as const;
export type AdminTransactionSort = (typeof ADMIN_TRANSACTION_SORTS)[number];

/** i18n key suffix for a sort option: `createdAt,desc` → `createdAtDesc`. */
export function sortKey(sort: AdminTransactionSort): string {
  const [field, direction] = sort.split(",");
  return `${field}${direction === "asc" ? "Asc" : "Desc"}`;
}

/** How many filters (besides paging and sort) are active — for the "Reset" button. */
export function activeFilterCount(filters: {
  q?: string | null;
  userId?: string | null;
  product?: string | null;
  status?: readonly string[] | null;
  from?: string | null;
  to?: string | null;
  needsReview?: boolean | null;
}): number {
  return [
    filters.q,
    filters.userId,
    filters.product,
    filters.status?.length ? "status" : null,
    filters.from,
    filters.to,
    filters.needsReview ? "review" : null,
  ].filter(Boolean).length;
}
