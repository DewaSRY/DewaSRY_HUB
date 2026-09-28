import type { Subscription, Transaction, TransactionStatus } from "./type";

/** Poll `GET /me/transactions/{orderId}` every 3 s for up to 2 min (UC-08 step 7, ADR-003 §7.3). */
export const POLL_INTERVAL_MS = 3_000;
export const POLL_TIMEOUT_MS = 120_000;

export type PollDecision = "poll" | "timeout" | "done";

export function pollDecision(status: TransactionStatus | undefined, startedAt: number, now: number): PollDecision {
  if (status && status !== "PENDING") return "done";
  return now - startedAt >= POLL_TIMEOUT_MS ? "timeout" : "poll";
}

/** Refetch interval for TanStack Query, or `false` to stop. */
export function pollInterval(status: TransactionStatus | undefined, startedAt: number, now: number): number | false {
  return pollDecision(status, startedAt, now) === "poll" ? POLL_INTERVAL_MS : false;
}

export type StatusTone = "warning" | "success" | "destructive" | "secondary";

export function transactionTone(status: TransactionStatus): StatusTone {
  switch (status) {
    case "PAID":
      return "success";
    case "PENDING":
      return "warning";
    case "FAILED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function subscriptionTone(subscription: Pick<Subscription, "status" | "entitled">): StatusTone {
  if (subscription.status === "ACTIVE" && subscription.entitled) return "success";
  if (subscription.status === "CANCELLED") return "destructive";
  return "secondary";
}

/** The Snap token can still be used: PENDING and not expired. */
export function isSnapUsable(transaction: Pick<Transaction, "status" | "snap">, now = Date.now()): boolean {
  if (transaction.status !== "PENDING" || !transaction.snap) return false;
  const expires = Date.parse(transaction.snap.expiresAt);
  return Number.isNaN(expires) || expires > now;
}

export type SubscriptionAction =
  | { kind: "renew"; planCode: string; productCode: string }
  | { kind: "buy-again"; planCode: string; productCode: string }
  | { kind: "choose-plan"; productCode: string };

/**
 * Buttons on `/account/subscriptions` (UC-10, UC-12): ACTIVE → Renew,
 * EXPIRED / CANCELLED → Buy again. When the plan is no longer sold, the user
 * picks another active plan of the same product.
 */
export function subscriptionAction(subscription: Pick<Subscription, "status" | "plan" | "product">): SubscriptionAction {
  const productCode = subscription.product.code;
  if (!subscription.plan.active) return { kind: "choose-plan", productCode };
  return subscription.status === "ACTIVE"
    ? { kind: "renew", planCode: subscription.plan.code, productCode }
    : { kind: "buy-again", planCode: subscription.plan.code, productCode };
}

/** Days left until `endDate` (0 when past). */
export function daysLeft(endDate: string, now = Date.now()): number {
  const end = Date.parse(endDate);
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - now) / 86_400_000));
}

/** Product URL with `?entitlement=refresh`, so the product re-checks access (ADR-003 §8.5). */
export function entitlementRefreshUrl(websiteUrl: string | null | undefined): string | null {
  if (!websiteUrl) return null;
  try {
    const url = new URL(websiteUrl);
    url.searchParams.set("entitlement", "refresh");
    return url.toString();
  } catch {
    return null;
  }
}

/** `DSH-20261028-7F3K9Q` — the order id is also what users quote to support. */
export function isOrderId(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{3,63}$/i.test(value);
}
