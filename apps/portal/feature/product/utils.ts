import type { BillingPeriod, Plan, Product } from "./type";

/** A free plan (price 0) is never bought (ADR-002 R4). */
export function isFreePlan(plan: Pick<Plan, "price">): boolean {
  return !plan.price || plan.price.amount <= 0;
}

export function isPurchasable(plan: Pick<Plan, "price" | "billingPeriod">): boolean {
  return !isFreePlan(plan) && plan.billingPeriod !== null;
}

/** Free first, then by price ascending. */
export function sortPlans<T extends Pick<Plan, "price">>(plans: T[]): T[] {
  return [...plans].sort((a, b) => (a.price?.amount ?? 0) - (b.price?.amount ?? 0));
}

export function findPlanByCode(products: Product[], planCode: string): { product: Product; plan: Plan } | null {
  for (const product of products) {
    const plan = product.plans.find((p) => p.code === planCode);
    if (plan) return { product, plan };
  }
  return null;
}

/** i18n key suffix for a billing period. */
export function periodKey(period: BillingPeriod | null): "monthly" | "yearly" | "free" {
  if (period === "MONTHLY") return "monthly";
  if (period === "YEARLY") return "yearly";
  return "free";
}

/** Human feature list from the plan's JSON `features` (keys are owned by the product). */
export function featureEntries(features: Record<string, unknown> | null | undefined): { key: string; value: unknown }[] {
  return Object.entries(features ?? {}).map(([key, value]) => ({ key, value }));
}

/** `removeAds` → `Remove ads`. */
export function humanizeFeatureKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/**
 * Checkout URL for a plan (ADR-008 §4.2): the stable plan `code`, plus the
 * product code so the page can read the plan with one
 * `GET /public/products/{productCode}` call.
 */
export function checkoutHref(planCode: string, productCode?: string): string {
  const base = `/checkout/${encodeURIComponent(planCode)}`;
  return productCode ? `${base}?product=${encodeURIComponent(productCode)}` : base;
}
