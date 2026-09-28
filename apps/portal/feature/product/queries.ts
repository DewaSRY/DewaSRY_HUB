import { queryOptions } from "@tanstack/react-query";
import { productClient } from "./client";

export const productKeys = {
  all: ["product"] as const,
  list: () => [...productKeys.all, "list"] as const,
  detail: (productCode: string) => [...productKeys.all, "detail", productCode] as const,
};

export const productsQuery = () =>
  queryOptions({
    queryKey: productKeys.list(),
    queryFn: () => productClient.listProducts().then((response) => response.data.data),
    staleTime: 5 * 60_000,
  });

export const productQuery = (productCode: string) =>
  queryOptions({
    queryKey: productKeys.detail(productCode),
    queryFn: () => productClient.getProduct({ productCode }).then((response) => response.data.data),
    staleTime: 5 * 60_000,
  });
