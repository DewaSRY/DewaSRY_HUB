"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PageParams } from "@/lib/api/envelope";
import { adminUserQuery, adminUsersQuery, adminUserTransactionsQuery } from "./queries";
import type { AdminUserListParams } from "./type";

export function useAdminUsers(params: AdminUserListParams, options: { enabled?: boolean } = {}) {
  return useQuery({ ...adminUsersQuery(params), placeholderData: keepPreviousData, enabled: options.enabled ?? true });
}

export function useAdminUser(id: string | null | undefined) {
  return useQuery({ ...adminUserQuery(id ?? ""), enabled: Boolean(id) });
}

export function useAdminUserTransactions(id: string, params: PageParams) {
  return useQuery({ ...adminUserTransactionsQuery(id, params), placeholderData: keepPreviousData, enabled: Boolean(id) });
}
