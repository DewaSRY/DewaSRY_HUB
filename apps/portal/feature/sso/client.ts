import type { AxiosResponse } from "axios";
import { BaseClient } from "@/lib/api/base-client";
import type { ApiResponse } from "@/lib/api/envelope";
import type { SsoCode, SsoCodeInput } from "./type";

class SsoClient extends BaseClient {
  /** `POST /sso/codes` — one-time authorization code for the product (ADR-001 §5.7). */
  createCode(body: SsoCodeInput): Promise<AxiosResponse<ApiResponse<SsoCode>>> {
    return this.post({ endpoint: "/sso/codes", body });
  }
}

export const ssoClient = new SsoClient();
