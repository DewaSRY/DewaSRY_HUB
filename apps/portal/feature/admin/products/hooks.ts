"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminProductClient } from "./client";
import { adminProductKeys, adminProductQuery, adminProductsQuery } from "./queries";
import type { PlanInput, PlanPatch, ProductCreateInput, ProductPatch } from "./type";

export function useAdminProducts() {
  return useQuery(adminProductsQuery());
}

export function useAdminProduct(id: string) {
  return useQuery({ ...adminProductQuery(id), enabled: Boolean(id) });
}

/**
 * Every product write refreshes the list and the detail. Plans, credentials,
 * and redirect URIs are nested in `AdminProduct`, so they refetch the detail.
 */
function useInvalidateProduct() {
  const queryClient = useQueryClient();
  return (productId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminProductKeys.list() }),
      queryClient.invalidateQueries({ queryKey: adminProductKeys.detail(productId) }),
    ]);
}

/** The result carries `credential` (secret shown once); the screen shows it before navigating. */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductCreateInput) => adminProductClient.create({ body }).then((response) => response.data.data),
    onSuccess: (product) => {
      queryClient.setQueryData(adminProductKeys.detail(product.id), { ...product, credential: undefined });
      return queryClient.invalidateQueries({ queryKey: adminProductKeys.list() });
    },
    meta: { successMessage: { key: "admin:products.toast.created" }, errorMessage: false },
  });
}

export function useUpdateProduct(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductPatch) => adminProductClient.update({ id: productId, body }).then((response) => response.data.data),
    onSuccess: (product) => {
      queryClient.setQueryData(adminProductKeys.detail(product.id), product);
      return queryClient.invalidateQueries({ queryKey: adminProductKeys.list() });
    },
    meta: { successMessage: { key: "admin:products.toast.updated" }, errorMessage: false },
  });
}

export function useCreatePlan(productId: string) {
  const invalidate = useInvalidateProduct();
  return useMutation({
    mutationFn: (body: PlanInput) => adminProductClient.createPlan({ productId, body }).then((response) => response.data.data),
    onSuccess: () => invalidate(productId),
    meta: { successMessage: { key: "admin:products.toast.planCreated" }, errorMessage: false },
  });
}

export function useUpdatePlan(productId: string) {
  const invalidate = useInvalidateProduct();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PlanPatch }) =>
      adminProductClient.updatePlan({ id, body }).then((response) => response.data.data),
    onSuccess: () => invalidate(productId),
    meta: { successMessage: { key: "admin:products.toast.planUpdated" }, errorMessage: false },
  });
}

/** The secret is in the result only; it is never cached. */
export function useCreateCredential(productId: string) {
  const invalidate = useInvalidateProduct();
  return useMutation({
    mutationFn: () => adminProductClient.createCredential({ productId }).then((response) => response.data.data),
    onSuccess: () => invalidate(productId),
    meta: { successMessage: false, errorMessage: false },
  });
}

export function useRevokeCredential(productId: string) {
  const invalidate = useInvalidateProduct();
  return useMutation({
    mutationFn: (clientId: string) => adminProductClient.revokeCredential({ productId, clientId }),
    onSuccess: () => invalidate(productId),
    meta: { successMessage: { key: "admin:products.toast.credentialRevoked" }, errorMessage: false },
  });
}

export function useAddRedirectUri(productId: string) {
  const invalidate = useInvalidateProduct();
  return useMutation({
    mutationFn: (uri: string) => adminProductClient.addRedirectUri({ productId, uri }).then((response) => response.data.data),
    onSuccess: () => invalidate(productId),
    meta: { successMessage: { key: "admin:products.toast.redirectAdded" }, errorMessage: false },
  });
}

export function useRemoveRedirectUri(productId: string) {
  const invalidate = useInvalidateProduct();
  return useMutation({
    mutationFn: (id: string) => adminProductClient.removeRedirectUri({ productId, id }),
    onSuccess: () => invalidate(productId),
    meta: { successMessage: { key: "admin:products.toast.redirectRemoved" }, errorMessage: false },
  });
}
