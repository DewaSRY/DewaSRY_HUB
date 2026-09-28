import type { Money } from "@/lib/api/envelope";

export type BillingPeriod = "MONTHLY" | "YEARLY";

/** Public plan (ADR-003 §5.2). `billingPeriod` is `null` for a free plan. */
export interface Plan {
  id: string;
  code: string;
  name: string;
  price: Money;
  billingPeriod: BillingPeriod | null;
  features: Record<string, unknown>;
}

/** Public product with its public, active plans. */
export interface Product {
  code: string;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  plans: Plan[];
}

export type ProductLookup = { kind: "found"; product: Product } | { kind: "not-found" };
