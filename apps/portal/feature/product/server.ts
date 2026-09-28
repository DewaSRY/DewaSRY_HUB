import "server-only";
import { cache } from "react";
import { publicFetch, unwrapData } from "@/lib/api/public-fetch";
import type { ApiResponse } from "@/lib/api/envelope";
import type { Product, ProductLookup } from "./type";

/** Public product reads for ISR pages (ADR-008 §6.3). Imported by path (rule I5). */

/** `GET /public/products` — active products with their public, active plans. */
export const listProducts = cache(async (): Promise<Product[]> => {
  const result = await publicFetch<ApiResponse<Product[]>>("/public/products", { tags: ["public:products"] });
  if (result.kind !== "ok") return [];
  return unwrapData(result.body) ?? [];
});

/** `GET /public/products/{productCode}` — `not-found` for unknown or inactive products. */
export const getProduct = cache(async (productCode: string): Promise<ProductLookup> => {
  const result = await publicFetch<ApiResponse<Product>>(`/public/products/${encodeURIComponent(productCode)}`, {
    tags: ["public:products"],
  });
  if (result.kind !== "ok") return { kind: "not-found" };
  return { kind: "found", product: unwrapData(result.body) };
});
