"use client";

import { useQuery } from "@tanstack/react-query";
import { productQuery, productsQuery } from "./queries";

export function useProducts() {
  return useQuery(productsQuery());
}

export function useProduct(productCode: string | null | undefined) {
  return useQuery({ ...productQuery(productCode ?? ""), enabled: Boolean(productCode) });
}
