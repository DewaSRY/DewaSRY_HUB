import { queryOptions } from "@tanstack/react-query";
import { billingClient } from "./client";
import type { TransactionListParams } from "./type";

export const billingKeys = {
  all: ["billing"] as const,
  transactions: (params: TransactionListParams) => [...billingKeys.all, "transactions", params] as const,
  transaction: (orderId: string) => [...billingKeys.all, "transaction", orderId] as const,
  subscriptions: () => [...billingKeys.all, "subscriptions"] as const,
};

export const transactionsQuery = (params: TransactionListParams) =>
  queryOptions({
    queryKey: billingKeys.transactions(params),
    queryFn: () => billingClient.listTransactions(params).then((response) => response.data),
  });

export const transactionQuery = (orderId: string) =>
  queryOptions({
    queryKey: billingKeys.transaction(orderId),
    queryFn: () => billingClient.getTransaction({ orderId }).then((response) => response.data.data),
  });

export const subscriptionsQuery = () =>
  queryOptions({
    queryKey: billingKeys.subscriptions(),
    queryFn: () => billingClient.listSubscriptions().then((response) => response.data.data),
  });
