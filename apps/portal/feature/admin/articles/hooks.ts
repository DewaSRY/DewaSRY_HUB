"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminArticlesClient } from "./client";
import { adminArticleKeys, articleQuery, articlesQuery } from "./queries";
import type { AdminArticle, ArticleInput, ArticleListParams } from "./type";

export function useAdminArticles(params: ArticleListParams) {
  return useQuery({ ...articlesQuery(params), placeholderData: keepPreviousData });
}

export function useAdminArticle(id: string | null | undefined) {
  return useQuery({ ...articleQuery(id ?? ""), enabled: Boolean(id) });
}

function useArticleCacheUpdate() {
  const queryClient = useQueryClient();
  return (article: AdminArticle) => {
    queryClient.setQueryData(adminArticleKeys.detail(article.id), article);
    void queryClient.invalidateQueries({ queryKey: [...adminArticleKeys.all, "list"] });
  };
}

export function useCreateArticle() {
  const update = useArticleCacheUpdate();
  return useMutation({
    mutationFn: (body: ArticleInput) => adminArticlesClient.create(body).then((response) => response.data.data),
    onSuccess: update,
    meta: { successMessage: { key: "admin:articles.toast.created" }, errorMessage: false },
  });
}

export function useSaveArticle() {
  const update = useArticleCacheUpdate();
  return useMutation({
    mutationFn: (input: { id: string; body: ArticleInput }) => adminArticlesClient.update(input).then((response) => response.data.data),
    onSuccess: update,
    // The editor shows its own save state, conflict dialog, and field errors.
    meta: { errorMessage: false },
  });
}

export function usePublishArticle() {
  const update = useArticleCacheUpdate();
  return useMutation({
    mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
      (publish ? adminArticlesClient.publish({ id }) : adminArticlesClient.unpublish({ id })).then((response) => response.data.data),
    onSuccess: update,
    meta: { errorMessage: false },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminArticlesClient.remove({ id }),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: adminArticleKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: [...adminArticleKeys.all, "list"] });
    },
    meta: { successMessage: { key: "admin:articles.toast.deleted" } },
  });
}

export function useLinkPreview() {
  return useMutation({
    mutationFn: (url: string) => adminArticlesClient.linkPreview({ url }).then((response) => response.data.data),
    meta: { errorMessage: false },
  });
}
