import type { Money, PageParams } from "@/lib/api/envelope";
import type { Subscription, Transaction, TransactionStatus } from "@/feature/billing";

/** Who changed the status: the checkout call, a Midtrans webhook, or an admin sync (ADR-003 §10.2). */
export type StatusSource = "CHECKOUT" | "WEBHOOK" | "SYNC";

export interface TransactionUserRef {
  id: string;
  email: string;
  name: string | null;
}

/** `AdminTransaction` = `Transaction` (without `snap`) + user, Midtrans reference, review flag. */
export interface AdminTransaction extends Omit<Transaction, "snap"> {
  user: TransactionUserRef;
  /** Midtrans `transaction_id`, once Midtrans has seen the order. */
  gatewayTransactionId: string | null;
  /** Flagged by UC-09 (e.g. amount mismatch). */
  needsReview: boolean;
}

export interface StatusHistoryEntry {
  status: TransactionStatus;
  /** Sent by the API in addition to ADR-003 (`null` for the first entry). */
  fromStatus?: TransactionStatus | null;
  source: StatusSource;
  at: string;
  note: string | null;
}

/** `AdminTransactionDetail`: status history and the linked subscription (or `null`). */
export interface AdminTransactionDetail extends AdminTransaction {
  statusHistory: StatusHistoryEntry[];
  subscription: Subscription | null;
  /** Only on `POST /admin/transactions/{orderId}/sync`: whether the status changed. */
  changed?: boolean | null;
}

/** `meta.summary` of `GET /admin/transactions`, for the whole filtered set. */
export interface TransactionSummary {
  count: number;
  paidCount: number;
  paidAmount: Money;
}

export type TransactionListMeta = { summary?: TransactionSummary };

export const ADMIN_TRANSACTION_SORT_FIELDS = ["createdAt", "amount"] as const;
export type AdminTransactionSortField = (typeof ADMIN_TRANSACTION_SORT_FIELDS)[number];

export interface AdminTransactionListParams extends PageParams {
  userId?: string;
  productCode?: string;
  status?: TransactionStatus[];
  /** `YYYY-MM-DD`, inclusive, on `createdAt`. */
  from?: string;
  to?: string;
  /** `orderId` or email. */
  q?: string;
  needsReview?: boolean;
}

export const ADMIN_TRANSACTION_PAGE_SIZES = [20, 50, 100];
