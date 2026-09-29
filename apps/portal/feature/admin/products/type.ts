import type { Money } from "@/lib/api/envelope";
import type { BillingPeriod } from "@/feature/product";

/** `AdminPlan` = `PlanInput` + `{ id, sold, activeSubscriptions, createdAt }` (ADR-003 §10.7). */
export interface AdminPlan {
  id: string;
  code: string;
  name: string;
  price: Money;
  /** `null` for a free plan. */
  billingPeriod: BillingPeriod | null;
  features: Record<string, unknown>;
  public: boolean;
  active: boolean;
  /** Has a PAID or REFUNDED transaction: price and billing period are locked. */
  sold: boolean;
  activeSubscriptions: number;
  createdAt: string;
}

/** An active client credential, without its secret. */
export interface CredentialSummary {
  clientId: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/** Returned once, on product create and on `POST …/credentials`. The secret is never shown again. */
export interface IssuedCredential {
  clientId: string;
  clientSecret: string;
  createdAt: string;
}

/** SSO redirect URI allow-list entry (ADR-001 §5.7). */
export interface RedirectUri {
  id: string;
  uri: string;
  createdAt: string;
}

export interface AdminProduct {
  id: string;
  /** Immutable: products use it in URLs. */
  code: string;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  active: boolean;
  planCount: number;
  plans: AdminPlan[];
  credentials: CredentialSummary[];
  redirectUris: RedirectUri[];
  memberCount: number;
  createdAt: string;
  /** Only on `POST /admin/products`: the first credential. */
  credential?: IssuedCredential;
}

export interface ProductCreateInput {
  code: string;
  name: string;
  description?: string | null;
  websiteUrl?: string | null;
  active?: boolean;
}

export type ProductPatch = Partial<Omit<ProductCreateInput, "code">>;

export interface PlanInput {
  code: string;
  name: string;
  price: Money;
  billingPeriod: BillingPeriod | null;
  features: Record<string, unknown>;
  public: boolean;
  active: boolean;
}

/** `price` and `billingPeriod` only while the plan was never sold (`409 PLAN_SOLD`). */
export type PlanPatch = Partial<Omit<PlanInput, "code">>;

/** At most two active credentials per product, so a secret can be rotated. */
export const MAX_ACTIVE_CREDENTIALS = 2;
/** `features` JSON limit on the API. */
export const MAX_FEATURES_BYTES = 8 * 1024;
export const BILLING_PERIODS: BillingPeriod[] = ["MONTHLY", "YEARLY"];
