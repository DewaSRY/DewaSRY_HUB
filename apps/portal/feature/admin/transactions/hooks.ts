"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminTransactionClient } from "./client";
import { adminTransactionKeys, adminTransactionQuery, adminTransactionsQuery } from "./queries";
import type { AdminTransactionDetail, AdminTransactionListParams } from "./type";

export function useAdminTransactions(params: AdminTransactionListParams) {
  return useQuery({ ...adminTransactionsQuery(params), placeholderData: keepPreviousData });
}

export function useAdminTransaction(orderId: string) {
  return useQuery({ ...adminTransactionQuery(orderId), enabled: Boolean(orderId) });
}

/** "Sync with Midtrans": toast "Status updated" or "No change"; errors (502) are shown by the screen. */
export function useSyncTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => adminTransactionClient.sync({ orderId }).then((response) => response.data.data),
    onSuccess: (detail) => {
      queryClient.setQueryData(adminTransactionKeys.detail(detail.orderId), detail);
      if (detail.changed) {
        void queryClient.invalidateQueries({ queryKey: adminTransactionKeys.lists() });
        // The user screens show payment totals too.
        void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      }
    },
    meta: {
      successMessage: (detail: AdminTransactionDetail) => ({
        key: detail.changed ? "admin:transactions.sync.updated" : "admin:transactions.sync.noChange",
      }),
      errorMessage: false,
    },
  });
}
