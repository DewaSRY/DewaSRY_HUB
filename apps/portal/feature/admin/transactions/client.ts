import type { AxiosResponse } from "axios";
import { BaseClient } from "@/lib/api/base-client";
import type { ApiPage, ApiResponse } from "@/lib/api/envelope";
import type { AdminTransaction, AdminTransactionDetail, AdminTransactionListParams, TransactionListMeta } from "./type";

/** Admin 6.2 — Transactions (ADR-003 §10.2). Read-only, plus the Midtrans sync. */
class AdminTransactionClient extends BaseClient {
  list(params: AdminTransactionListParams): Promise<AxiosResponse<ApiPage<AdminTransaction, TransactionListMeta>>> {
    return this.get({
      endpoint: "/admin/transactions",
      params: {
        userId: params.userId,
        productCode: params.productCode,
        status: params.status,
        from: params.from,
        to: params.to,
        q: params.q,
        needsReview: params.needsReview || undefined,
        page: params.page,
        limit: params.limit,
        sort: params.sort ?? "createdAt,desc",
      },
    });
  }

  getTransaction({ orderId }: { orderId: string }): Promise<AxiosResponse<ApiResponse<AdminTransactionDetail>>> {
    return this.get({ endpoint: `/admin/transactions/${encodeURIComponent(orderId)}` });
  }

  /** Asks the Midtrans Status API and applies UC-09 steps 3–8. `changed` tells whether anything moved. */
  sync({ orderId }: { orderId: string }): Promise<AxiosResponse<ApiResponse<AdminTransactionDetail>>> {
    return this.post({ endpoint: `/admin/transactions/${encodeURIComponent(orderId)}/sync` });
  }
}

export const adminTransactionClient = new AdminTransactionClient();
