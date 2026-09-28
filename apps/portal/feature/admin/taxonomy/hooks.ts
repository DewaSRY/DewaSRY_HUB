"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pushToast } from "@/lib/toast/store";
import { adminTaxonomyClient } from "./client";
import { adminTaxonomyKeys, taxonomyListQuery } from "./queries";
import type { AdminTaxonomy, TaxonomyInput, TaxonomyKind } from "./type";

export function useTaxonomyList(kind: TaxonomyKind) {
  return useQuery(taxonomyListQuery(kind));
}

function warnIfPending(item: AdminTaxonomy) {
  if (item.revalidation?.status === "PENDING_RETRY") {
    pushToast({ variant: "error", title: { key: "admin:revalidationPending" } });
  }
}

export function useCreateTaxonomy(kind: TaxonomyKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TaxonomyInput) => adminTaxonomyClient.create({ kind, body }).then((response) => response.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminTaxonomyKeys.list(kind) }),
    meta: { successMessage: { key: "admin:taxonomy.toast.created" }, errorMessage: false },
  });
}

export function useUpdateTaxonomy(kind: TaxonomyKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<TaxonomyInput> }) =>
      adminTaxonomyClient.update({ kind, id, body }).then((response) => response.data.data),
    onSuccess: (item) => {
      warnIfPending(item);
      return queryClient.invalidateQueries({ queryKey: adminTaxonomyKeys.list(kind) });
    },
    meta: { successMessage: { key: "admin:taxonomy.toast.updated" }, errorMessage: false },
  });
}

export function useDeleteTaxonomy(kind: TaxonomyKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminTaxonomyClient.remove({ kind, id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminTaxonomyKeys.list(kind) }),
    meta: { successMessage: { key: "admin:taxonomy.toast.deleted" }, errorMessage: false },
  });
}
