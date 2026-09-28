import { queryOptions } from "@tanstack/react-query";
import { adminTransactionClient } from "./client";
import type { AdminTransactionListParams } from "./type";

export const adminTransactionKeys = {
  all: ["admin", "transactions"] as const,
  lists: () => [...adminTransactionKeys.all, "list"] as const,
  list: (params: AdminTransactionListParams) => [...adminTransactionKeys.lists(), params] as const,
  detail: (orderId: string) => [...adminTransactionKeys.all, "detail", orderId] as const,
};

export const adminTransactionsQuery = (params: AdminTransactionListParams) =>
  queryOptions({
    queryKey: adminTransactionKeys.list(params),
    queryFn: () => adminTransactionClient.list(params).then((response) => response.data),
  });

export const adminTransactionQuery = (orderId: string) =>
  queryOptions({
    queryKey: adminTransactionKeys.detail(orderId),
    queryFn: () => adminTransactionClient.getTransaction({ orderId }).then((response) => response.data.data),
  });
