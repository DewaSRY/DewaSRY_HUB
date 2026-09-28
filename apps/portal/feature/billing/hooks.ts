"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingClient } from "./client";
import { billingKeys, subscriptionsQuery, transactionQuery, transactionsQuery } from "./queries";
import type { CheckoutInput, TransactionListParams } from "./type";
import { pollInterval } from "./utils";

export function useTransactions(params: TransactionListParams) {
  return useQuery({ ...transactionsQuery(params), placeholderData: keepPreviousData });
}

/** One transaction; with `pollSince` it polls every 3 s while PENDING, for up to 2 min. */
export function useTransaction(orderId: string | null | undefined, options: { pollSince?: number | null } = {}) {
  return useQuery({
    ...transactionQuery(orderId ?? ""),
    enabled: Boolean(orderId),
    refetchInterval: (query) =>
      options.pollSince ? pollInterval(query.state.data?.status, options.pollSince, Date.now()) : false,
    refetchIntervalInBackground: true,
  });
}

export function useSubscriptions() {
  return useQuery(subscriptionsQuery());
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) => billingClient.checkout(input).then((response) => response.data.data),
    onSuccess: (transaction) => {
      queryClient.setQueryData(billingKeys.transaction(transaction.orderId), transaction);
      void queryClient.invalidateQueries({ queryKey: [...billingKeys.all, "transactions"] });
    },
    // The checkout screen shows its own error state (it branches on the HTTP code).
    meta: { errorMessage: false },
  });
}
