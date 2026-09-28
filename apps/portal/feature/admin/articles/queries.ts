import { queryOptions } from "@tanstack/react-query";
import { adminArticlesClient } from "./client";
import type { ArticleListParams } from "./type";

export const adminArticleKeys = {
  all: ["admin", "articles"] as const,
  list: (params: ArticleListParams) => [...adminArticleKeys.all, "list", params] as const,
  detail: (id: string) => [...adminArticleKeys.all, "detail", id] as const,
};

export const articlesQuery = (params: ArticleListParams) =>
  queryOptions({
    queryKey: adminArticleKeys.list(params),
    queryFn: () => adminArticlesClient.list(params).then((response) => response.data),
  });

export const articleQuery = (id: string) =>
  queryOptions({
    queryKey: adminArticleKeys.detail(id),
    queryFn: () => adminArticlesClient.getArticle({ id }).then((response) => response.data.data),
    // The editor owns the draft; never refetch it behind the admin's back.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
