import type { AxiosResponse } from "axios";
import { BaseClient } from "@/lib/api/base-client";
import type { ApiResponse } from "@/lib/api/envelope";
import type {
  AdminPlan,
  AdminProduct,
  IssuedCredential,
  PlanInput,
  PlanPatch,
  ProductCreateInput,
  ProductPatch,
  RedirectUri,
} from "./type";

/** Admin 6.7 — Products & plans (ADR-003 §10.7), plus SSO redirect URIs. */
class AdminProductClient extends BaseClient {
  list(): Promise<AxiosResponse<ApiResponse<AdminProduct[]>>> {
    return this.get({ endpoint: "/admin/products" });
  }

  getProduct({ id }: { id: string }): Promise<AxiosResponse<ApiResponse<AdminProduct>>> {
    return this.get({ endpoint: `/admin/products/${id}` });
  }

  /** Also issues the first client credential (`credential`, secret shown once). */
  create({ body }: { body: ProductCreateInput }): Promise<AxiosResponse<ApiResponse<AdminProduct>>> {
    return this.post({ endpoint: "/admin/products", body });
  }

  update({ id, body }: { id: string; body: ProductPatch }): Promise<AxiosResponse<ApiResponse<AdminProduct>>> {
    return this.patch({ endpoint: `/admin/products/${id}`, body });
  }

  createPlan({ productId, body }: { productId: string; body: PlanInput }): Promise<AxiosResponse<ApiResponse<AdminPlan>>> {
    return this.post({ endpoint: `/admin/products/${productId}/plans`, body });
  }

  updatePlan({ id, body }: { id: string; body: PlanPatch }): Promise<AxiosResponse<ApiResponse<AdminPlan>>> {
    return this.patch({ endpoint: `/admin/plans/${id}`, body });
  }

  createCredential({ productId }: { productId: string }): Promise<AxiosResponse<ApiResponse<IssuedCredential>>> {
    return this.post({ endpoint: `/admin/products/${productId}/credentials` });
  }

  revokeCredential({ productId, clientId }: { productId: string; clientId: string }): Promise<AxiosResponse<void>> {
    return this.delete({ endpoint: `/admin/products/${productId}/credentials/${encodeURIComponent(clientId)}` });
  }

  addRedirectUri({ productId, uri }: { productId: string; uri: string }): Promise<AxiosResponse<ApiResponse<RedirectUri>>> {
    return this.post({ endpoint: `/admin/products/${productId}/redirect-uris`, body: { uri } });
  }

  removeRedirectUri({ productId, id }: { productId: string; id: string }): Promise<AxiosResponse<void>> {
    return this.delete({ endpoint: `/admin/products/${productId}/redirect-uris/${id}` });
  }
}

export const adminProductClient = new AdminProductClient();
