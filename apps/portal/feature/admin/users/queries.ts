import { queryOptions } from "@tanstack/react-query";
import type { PageParams } from "@/lib/api/envelope";
import { adminUserClient } from "./client";
import type { AdminUserListParams } from "./type";

// `["admin", "users"]` is also invalidated by the transaction sync (payment totals change).
export const adminUserKeys = {
  all: ["admin", "users"] as const,
  lists: () => [...adminUserKeys.all, "list"] as const,
  list: (params: AdminUserListParams) => [...adminUserKeys.lists(), params] as const,
  detail: (id: string) => [...adminUserKeys.all, "detail", id] as const,
  transactions: (id: string, params: PageParams) => [...adminUserKeys.detail(id), "transactions", params] as const,
};

export const adminUsersQuery = (params: AdminUserListParams) =>
  queryOptions({
    queryKey: adminUserKeys.list(params),
    queryFn: () => adminUserClient.list(params).then((response) => response.data),
  });

export const adminUserQuery = (id: string) =>
  queryOptions({
    queryKey: adminUserKeys.detail(id),
    queryFn: () => adminUserClient.getUser({ id }).then((response) => response.data.data),
  });

export const adminUserTransactionsQuery = (id: string, params: PageParams) =>
  queryOptions({
    queryKey: adminUserKeys.transactions(id, params),
    queryFn: () => adminUserClient.listTransactions({ id, ...params }).then((response) => response.data),
  });
