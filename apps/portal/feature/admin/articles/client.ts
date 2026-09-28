import type { AxiosResponse } from "axios";
import { BaseClient } from "@/lib/api/base-client";
import type { ApiPage, ApiResponse } from "@/lib/api/envelope";
import type { AdminArticle, AdminArticleSummary, ArticleInput, ArticleListParams, LinkPreview } from "./type";

/** Admin 6.3 — Articles (ADR-003 §10.3) and the link-preview helper (ADR-009 §5.5). */
class AdminArticlesClient extends BaseClient {
  list(params: ArticleListParams): Promise<AxiosResponse<ApiPage<AdminArticleSummary>>> {
    return this.get({
      endpoint: "/admin/articles",
      params: {
        q: params.q,
        status: params.status,
        category: params.category,
        tag: params.tag,
        page: params.page,
        limit: params.limit,
        sort: params.sort ?? "updatedAt,desc",
      },
    });
  }

  create(body: ArticleInput): Promise<AxiosResponse<ApiResponse<AdminArticle>>> {
    return this.post({ endpoint: "/admin/articles", body });
  }

  getArticle({ id }: { id: string }): Promise<AxiosResponse<ApiResponse<AdminArticle>>> {
    return this.get({ endpoint: `/admin/articles/${id}` });
  }

  update({ id, body }: { id: string; body: ArticleInput }): Promise<AxiosResponse<ApiResponse<AdminArticle>>> {
    return this.put({ endpoint: `/admin/articles/${id}`, body });
  }

  remove({ id }: { id: string }): Promise<AxiosResponse<void>> {
    return this.delete({ endpoint: `/admin/articles/${id}` });
  }

  publish({ id }: { id: string }): Promise<AxiosResponse<ApiResponse<AdminArticle>>> {
    return this.post({ endpoint: `/admin/articles/${id}/publish` });
  }

  unpublish({ id }: { id: string }): Promise<AxiosResponse<ApiResponse<AdminArticle>>> {
    return this.post({ endpoint: `/admin/articles/${id}/unpublish` });
  }

  linkPreview({ url }: { url: string }): Promise<AxiosResponse<ApiResponse<LinkPreview>>> {
    return this.post({ endpoint: "/admin/link-preview", body: { url } });
  }
}

export const adminArticlesClient = new AdminArticlesClient();
