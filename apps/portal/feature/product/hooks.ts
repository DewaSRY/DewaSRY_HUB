"use client";

import { useQuery } from "@tanstack/react-query";
import { productQuery, productsQuery } from "./queries";

export function useProducts(options: { enabled?: boolean } = {}) {
  return useQuery({ ...productsQuery(), enabled: options.enabled ?? true });
}

export function useProduct(productCode: string | null | undefined) {
  return useQuery({ ...productQuery(productCode ?? ""), enabled: Boolean(productCode) });
}
