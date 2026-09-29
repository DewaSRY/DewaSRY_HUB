import type { AxiosResponse } from "axios";
import { BaseClient } from "@/lib/api/base-client";
import type { ApiPage, ApiResponse } from "@/lib/api/envelope";
import type { AdminComment, AdminCommentListParams } from "./type";

/** Admin 6.8 — Comments (ADR-010, UC-26): list, hide, show. */
class AdminCommentClient extends BaseClient {
  list(params: AdminCommentListParams): Promise<AxiosResponse<ApiPage<AdminComment>>> {
    return this.get({
      endpoint: "/admin/comments",
      params: {
        articleId: params.articleId,
        status: params.status,
        page: params.page,
        limit: params.limit,
        sort: params.sort ?? "createdAt,desc",
      },
    });
  }

  hide({ id }: { id: string }): Promise<AxiosResponse<ApiResponse<AdminComment>>> {
    return this.post({ endpoint: `/admin/comments/${encodeURIComponent(id)}/hide` });
  }

  show({ id }: { id: string }): Promise<AxiosResponse<ApiResponse<AdminComment>>> {
    return this.post({ endpoint: `/admin/comments/${encodeURIComponent(id)}/show` });
  }
}

export const adminCommentClient = new AdminCommentClient();
