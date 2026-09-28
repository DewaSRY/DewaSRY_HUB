import type { Money, PageParams } from "@/lib/api/envelope";
import type { BillingPeriod } from "@/feature/product";

export type TransactionStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";
export type PaymentMethod = "QRIS" | "BANK_TRANSFER" | "GOPAY" | "SHOPEEPAY" | "CREDIT_CARD" | "OTHER";

export const TRANSACTION_STATUSES: TransactionStatus[] = ["PENDING", "PAID", "FAILED", "REFUNDED"];

export interface ProductRef {
  code: string;
  name: string;
}

export interface TransactionPlan {
  id: string;
  code: string;
  name: string;
  billingPeriod: BillingPeriod | null;
}

export interface SnapInfo {
  token: string;
  redirectUrl: string;
  expiresAt: string;
}

/** `Transaction` (ADR-003 §7.1). `snap` is present only while PENDING and unexpired. */
export interface Transaction {
  orderId: string;
  status: TransactionStatus;
  product: ProductRef;
  plan: TransactionPlan;
  price: Money;
  paymentMethod: PaymentMethod | null;
  snap: SnapInfo | null;
  failureReason: string | null;
  subscriptionId: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface SubscriptionPlan extends TransactionPlan {
  price: Money;
  /** `false` = no longer sold; "Renew" must ask for another plan (UC-12). */
  active: boolean;
}

/** `Subscription` (ADR-003 §7.1). `entitled` is computed by the server. */
export interface Subscription {
  id: string;
  product: ProductRef;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  entitled: boolean;
}

export interface CheckoutInput {
  planId: string;
  /** One UUID per "Buy" click (ADR-003 §3.8). */
  idempotencyKey: string;
}

export interface TransactionListParams extends PageParams {
  status?: TransactionStatus;
}
