import type { AxiosResponse } from "axios";
import { BaseClient } from "@/lib/api/base-client";
import type { ApiResponse } from "@/lib/api/envelope";
import type { Me } from "./type";

/** Group 2 — Account (ADR-003 §6). */
class AuthClient extends BaseClient {
  /** `POST /me/session` — find or create the user from the token (200 / 201). */
  createSession(): Promise<AxiosResponse<ApiResponse<Me>>> {
    return this.post({ endpoint: "/me/session", config: { skipUnauthorizedHandler: true } });
  }

  /** `GET /me` — the signed-in user's profile. */
  getMe(): Promise<AxiosResponse<ApiResponse<Me>>> {
    return this.get({ endpoint: "/me" });
  }
}

export const authClient = new AuthClient();
