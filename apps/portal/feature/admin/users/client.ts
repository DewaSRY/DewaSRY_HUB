import type { AxiosResponse } from "axios";
import { BaseClient } from "@/lib/api/base-client";
import type { ApiPage, ApiResponse, PageParams } from "@/lib/api/envelope";
import type { AdminTransaction, TransactionListMeta } from "@/feature/admin/transactions";
import type { AdminUser, AdminUserListParams, AdminUserSummary } from "./type";

/** Admin 6.1 — Users (ADR-003 §10.1). Read-only. */
class AdminUserClient extends BaseClient {
  list(params: AdminUserListParams): Promise<AxiosResponse<ApiPage<AdminUserSummary>>> {
    return this.get({
      endpoint: "/admin/users",
      params: {
        q: params.q,
        productCode: params.productCode,
        page: params.page,
        limit: params.limit,
        sort: params.sort ?? "createdAt,desc",
      },
    });
  }

  getUser({ id }: { id: string }): Promise<AxiosResponse<ApiResponse<AdminUser>>> {
    return this.get({ endpoint: `/admin/users/${encodeURIComponent(id)}` });
  }

  /** Same as `GET /admin/transactions?userId={id}`, plus a `404` when the user is gone. */
  listTransactions({
    id,
    ...params
  }: PageParams & { id: string }): Promise<AxiosResponse<ApiPage<AdminTransaction, TransactionListMeta>>> {
    return this.get({
      endpoint: `/admin/users/${encodeURIComponent(id)}/transactions`,
      params: { page: params.page, limit: params.limit, sort: params.sort ?? "createdAt,desc" },
    });
  }
}

export const adminUserClient = new AdminUserClient();
