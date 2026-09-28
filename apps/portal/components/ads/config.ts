/**
 * Ad configuration (ADR-001 §5.2 "Ads rules", ADR-009 §7.5). The network
 * itself is chosen in ADR-005; this reads an AdSense-style client id and
 * per-slot unit ids from public env vars. With no client id, slots render
 * nothing (or grey placeholders when `NEXT_PUBLIC_AD_PLACEHOLDERS=true`).
 */
export type AdSlotKind = "in-article" | "sidebar" | "end-of-article" | "list";

export const AD_CLIENT = process.env.NEXT_PUBLIC_AD_CLIENT?.trim() || "";
export const AD_PLACEHOLDERS = process.env.NEXT_PUBLIC_AD_PLACEHOLDERS === "true";

const UNIT_IDS: Record<AdSlotKind, string> = {
  "in-article": process.env.NEXT_PUBLIC_AD_SLOT_IN_ARTICLE?.trim() || "",
  sidebar: process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR?.trim() || "",
  "end-of-article": process.env.NEXT_PUBLIC_AD_SLOT_END_OF_ARTICLE?.trim() || "",
  list: process.env.NEXT_PUBLIC_AD_SLOT_LIST?.trim() || "",
};

/** Reserved height per slot kind, so a late or empty ad never shifts the page. */
export const AD_MIN_HEIGHT: Record<AdSlotKind, number> = {
  "in-article": 280,
  sidebar: 600,
  "end-of-article": 280,
  list: 250,
};

/** `in-article-2` → `in-article`. */
export function slotKind(slotId: string): AdSlotKind {
  if (slotId.startsWith("in-article")) return "in-article";
  if (slotId === "sidebar" || slotId === "end-of-article" || slotId === "list") return slotId;
  return "in-article";
}

export function adUnitId(slotId: string): string {
  return UNIT_IDS[slotKind(slotId)];
}

export function adsEnabled(): boolean {
  return Boolean(AD_CLIENT);
}
