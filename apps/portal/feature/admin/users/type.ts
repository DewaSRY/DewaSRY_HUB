import type { Money, PageParams } from "@/lib/api/envelope";
import type { Role } from "@/feature/auth";
import type { ProductRef, Subscription } from "@/feature/billing";

/** Paid transactions of one user (status `PAID` only). */
export interface UserPaymentSummary {
  paidCount: number;
  paidAmount: Money;
  lastPaidAt: string | null;
}

/** `AdminUserSummary` (ADR-003 §10.1). */
export interface AdminUserSummary {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  products: ProductRef[];
  paymentSummary: UserPaymentSummary;
  createdAt: string;
  lastSignInAt: string | null;
}

export interface JoinedProduct extends ProductRef {
  joinedAt: string;
}

/** `AdminUser` = summary + `firebaseUid`, `avatarUrl`, `products[].joinedAt`, subscriptions. */
export interface AdminUser extends Omit<AdminUserSummary, "products"> {
  firebaseUid: string;
  avatarUrl: string | null;
  products: JoinedProduct[];
  subscriptions: Subscription[];
}

export const ADMIN_USER_SORTS = [
  "createdAt,desc",
  "createdAt,asc",
  "lastSignInAt,desc",
  "paidAmount,desc",
  "name,asc",
  "email,asc",
] as const;
export type AdminUserSort = (typeof ADMIN_USER_SORTS)[number];

export interface AdminUserListParams extends PageParams {
  /** Name or email, contains, case-insensitive. */
  q?: string;
  productCode?: string;
}

export const ADMIN_USER_PAGE_SIZES = [20, 50, 100];
