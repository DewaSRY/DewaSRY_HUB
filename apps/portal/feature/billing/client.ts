import type { AxiosResponse } from "axios";
import { BaseClient } from "@/lib/api/base-client";
import type { ApiPage, ApiResponse } from "@/lib/api/envelope";
import type { CheckoutInput, Subscription, Transaction, TransactionListParams } from "./type";

/** Group 3 — Billing (ADR-003 §7). */
class BillingClient extends BaseClient {
  /** `POST /checkout` with an `Idempotency-Key` (201 new / 200 reused). */
  checkout({ planId, idempotencyKey }: CheckoutInput): Promise<AxiosResponse<ApiResponse<Transaction>>> {
    return this.post({
      endpoint: "/checkout",
      body: { planId },
      config: { headers: { "Idempotency-Key": idempotencyKey } },
    });
  }

  listTransactions(params: TransactionListParams): Promise<AxiosResponse<ApiPage<Transaction>>> {
    return this.get({
      endpoint: "/me/transactions",
      params: { page: params.page, limit: params.limit, status: params.status, sort: params.sort ?? "createdAt,desc" },
    });
  }

  getTransaction({ orderId }: { orderId: string }): Promise<AxiosResponse<ApiResponse<Transaction>>> {
    return this.get({ endpoint: `/me/transactions/${encodeURIComponent(orderId)}` });
  }

  /** Not paged: one row per product, entitled first. */
  listSubscriptions(): Promise<AxiosResponse<ApiResponse<Subscription[]>>> {
    return this.get({ endpoint: "/me/subscriptions" });
  }
}

export const billingClient = new BillingClient();
