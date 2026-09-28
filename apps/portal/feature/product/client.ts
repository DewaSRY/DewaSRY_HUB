import type { AxiosResponse } from "axios";
import { BaseClient } from "@/lib/api/base-client";
import type { ApiResponse } from "@/lib/api/envelope";
import type { Product } from "./type";

/**
 * Browser read of a public product, used by the client-side checkout to turn
 * a plan code into a `planId` (ADR-008 §4.2 rules). Server pages use
 * `server.ts` instead.
 */
class ProductClient extends BaseClient {
  listProducts(): Promise<AxiosResponse<ApiResponse<Product[]>>> {
    return this.get({ endpoint: "/public/products" });
  }

  getProduct({ productCode }: { productCode: string }): Promise<AxiosResponse<ApiResponse<Product>>> {
    return this.get({ endpoint: `/public/products/${encodeURIComponent(productCode)}` });
  }
}

export const productClient = new ProductClient();
